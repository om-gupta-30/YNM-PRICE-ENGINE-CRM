import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load environment variables
const envPath = '.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
    process.env[key] = value;
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function removeDuplicatesAndFix() {
  console.log('\n🔧 Removing duplicate accounts and fixing data...\n');
  console.log('='.repeat(60));

  // Get all accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, account_name')
    .eq('is_active', true)
    .order('id', { ascending: true });

  if (!accounts) {
    console.error('❌ Failed to fetch accounts');
    return;
  }

  // Find duplicates
  const nameMap = new Map<string, number>();
  const duplicates: Array<{ id: number; name: string; keepId: number }> = [];

  for (const account of accounts) {
    const name = account.account_name.toLowerCase().trim();
    if (nameMap.has(name)) {
      // This is a duplicate - keep the first one (lower ID)
      duplicates.push({
        id: account.id,
        name: account.account_name,
        keepId: nameMap.get(name)!,
      });
    } else {
      nameMap.set(name, account.id);
    }
  }

  console.log(`Found ${duplicates.length} duplicate accounts to remove\n`);

  // For each duplicate, move sub-accounts and contacts to the kept account, then delete
  for (const dup of duplicates) {
    console.log(`Processing duplicate: ${dup.name} (ID: ${dup.id}, keeping ID: ${dup.keepId})`);

    // Move sub-accounts
    const { data: subAccounts } = await supabase
      .from('sub_accounts')
      .select('id')
      .eq('account_id', dup.id);

    if (subAccounts && subAccounts.length > 0) {
      // Check if sub-account with same name already exists for kept account
      for (const subAcc of subAccounts) {
        const { data: subAccData } = await supabase
          .from('sub_accounts')
          .select('sub_account_name')
          .eq('id', subAcc.id)
          .single();

        if (subAccData) {
          // Check if kept account already has this sub-account
          const { data: existingSubAcc } = await supabase
            .from('sub_accounts')
            .select('id')
            .eq('account_id', dup.keepId)
            .eq('sub_account_name', subAccData.sub_account_name)
            .maybeSingle();

          if (existingSubAcc) {
            // Move contacts from duplicate sub-account to existing one
            await supabase
              .from('contacts')
              .update({ account_id: dup.keepId, sub_account_id: existingSubAcc.id })
              .eq('sub_account_id', subAcc.id);

            // Delete duplicate sub-account
            await supabase.from('sub_accounts').delete().eq('id', subAcc.id);
          } else {
            // Move sub-account to kept account
            await supabase
              .from('sub_accounts')
              .update({ account_id: dup.keepId })
              .eq('id', subAcc.id);
          }
        }
      }
    }

    // Move any remaining contacts
    await supabase
      .from('contacts')
      .update({ account_id: dup.keepId })
      .eq('account_id', dup.id);

    // Delete duplicate account
    await supabase.from('accounts').delete().eq('id', dup.id);
    console.log(`  ✅ Removed duplicate account ID: ${dup.id}`);
  }

  // Verify final count
  const { data: finalAccounts, count } = await supabase
    .from('accounts')
    .select('id', { count: 'exact' })
    .eq('is_active', true);

  console.log(`\n✅ Final account count: ${count} (target: 275)`);
  console.log('='.repeat(60));
  console.log('\n✨ Duplicate removal complete!\n');
}

removeDuplicatesAndFix().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

