import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = '.env.local';
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found');
  process.exit(1);
}

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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 8 Union Territories from the image
const unionTerritories = [
  'Andaman & Nicobar Islands',
  'Chandigarh',
  'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi (National Capital Territory)',
  'Jammu & Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

async function addUnionTerritories() {
  console.log('\n🚀 Adding 8 Union Territories to states table...\n');
  console.log('='.repeat(60));

  // Check which union territories already exist
  const { data: existingStates } = await supabase
    .from('states')
    .select('id, state_name');

  if (!existingStates) {
    console.error('❌ Failed to fetch existing states');
    process.exit(1);
  }

  const existingStateNames = new Set(
    existingStates.map(s => s.state_name.toLowerCase().trim())
  );

  let added = 0;
  let alreadyExists = 0;
  const errors: string[] = [];

  for (const ut of unionTerritories) {
    const normalizedName = ut.toLowerCase().trim();
    
    if (existingStateNames.has(normalizedName)) {
      console.log(`   ✓ "${ut}" already exists`);
      alreadyExists++;
      continue;
    }

    try {
      const { data, error } = await supabase
        .from('states')
        .insert({ state_name: ut })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation - already exists
          console.log(`   ✓ "${ut}" already exists (unique constraint)`);
          alreadyExists++;
        } else {
          errors.push(`${ut}: ${error.message}`);
          console.error(`   ❌ Error adding "${ut}":`, error.message);
        }
      } else {
        console.log(`   ✅ Added "${ut}" (ID: ${data.id})`);
        added++;
        existingStateNames.add(normalizedName);
      }
    } catch (error: any) {
      errors.push(`${ut}: ${error.message}`);
      console.error(`   ❌ Error adding "${ut}":`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Added: ${added} union territories`);
  console.log(`ℹ️  Already exists: ${alreadyExists} union territories`);
  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length}`);
    errors.forEach(err => console.log(`   - ${err}`));
  }
  console.log('='.repeat(60));

  // Now update sub_accounts that have Delhi/New Delhi to reference the correct union territory
  console.log('\n🔄 Updating sub_accounts with Delhi references...\n');
  
  // Get the Delhi union territory ID
  const { data: delhiState } = await supabase
    .from('states')
    .select('id')
    .ilike('state_name', '%Delhi%')
    .maybeSingle();

  if (!delhiState) {
    console.log('   ⚠️  Delhi (National Capital Territory) not found in states table');
    return;
  }

  const delhiStateId = delhiState.id;
  console.log(`   Found Delhi (National Capital Territory) with ID: ${delhiStateId}`);

  // Find sub_accounts that might need updating (those with null state_id that are in Delhi)
  // We'll update based on city names that are typically in Delhi
  const delhiCities = ['Delhi', 'New Delhi', 'Gurgaon', 'Noida', 'Faridabad', 'Ghaziabad'];
  
  // Get all sub_accounts with null state_id or that might be in Delhi
  const { data: subAccounts } = await supabase
    .from('sub_accounts')
    .select('id, sub_account_name, state_id, city_id, account_id')
    .or('state_id.is.null');

  if (!subAccounts || subAccounts.length === 0) {
    console.log('   ℹ️  No sub_accounts found with null state_id');
    return;
  }

  console.log(`   Found ${subAccounts.length} sub_accounts with null state_id`);

  // Get cities to check
  const { data: cities } = await supabase
    .from('cities')
    .select('id, city_name, state_id');

  const delhiCityIds = new Set<number>();
  (cities || []).forEach(city => {
    if (delhiCities.some(dc => city.city_name.toLowerCase().includes(dc.toLowerCase()))) {
      delhiCityIds.add(city.id);
    }
  });

  let updated = 0;
  let skipped = 0;

  for (const subAccount of subAccounts) {
    // Check if city_id matches Delhi cities
    if (subAccount.city_id && delhiCityIds.has(subAccount.city_id)) {
      const { error: updateError } = await supabase
        .from('sub_accounts')
        .update({ state_id: delhiStateId })
        .eq('id', subAccount.id);

      if (updateError) {
        console.error(`   ❌ Error updating sub_account ${subAccount.id}:`, updateError.message);
      } else {
        updated++;
        console.log(`   ✅ Updated sub_account "${subAccount.sub_account_name}" (ID: ${subAccount.id})`);
      }
    } else {
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUB_ACCOUNTS UPDATE SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Updated: ${updated} sub_accounts`);
  console.log(`ℹ️  Skipped: ${skipped} sub_accounts (not in Delhi area)`);
  console.log('='.repeat(60));
  console.log('\n✨ Complete! Union territories added and sub_accounts updated.\n');
}

// Run the script
addUnionTerritories().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

