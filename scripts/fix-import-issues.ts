const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const XLSX = require('xlsx');

// Load environment variables from .env.local
const envPath = '.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach((line: string) => {
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

// Normalize text
function normalizeText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text).trim().replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

// Normalize phone number
function normalizePhone(phone: string | number | undefined | null): string {
  if (phone === undefined || phone === null) return '';
  let phoneStr = String(phone).trim();
  phoneStr = phoneStr.replace(/[\r\n,;]+/g, '/');
  phoneStr = phoneStr.replace(/\s*\/\s*/g, '/');
  phoneStr = phoneStr.split('/').map((p: string) => p.replace(/[^\d+]/g, '')).join('/');
  phoneStr = phoneStr.replace(/\/+/g, '/');
  phoneStr = phoneStr.replace(/^\/|\/$/g, '');
  return phoneStr;
}

// Fix 1: Update accounts where company_tag is null to "New"
async function fixCompanyTags() {
  console.log('\n🔧 Fix 1: Updating accounts with null company_tag to "New"...');
  
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, account_name, company_tag')
    .is('company_tag', null);
  
  if (error) {
    console.error('   ❌ Error fetching accounts:', error.message);
    return 0;
  }
  
  if (!accounts || accounts.length === 0) {
    console.log('   ✅ No accounts with null company_tag found');
    return 0;
  }
  
  console.log(`   📝 Found ${accounts.length} accounts with null company_tag`);
  
  let updated = 0;
  for (const account of accounts) {
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ company_tag: 'New' })
      .eq('id', account.id);
    
    if (updateError) {
      console.error(`   ⚠️  Failed to update account ${account.account_name}: ${updateError.message}`);
    } else {
      updated++;
      console.log(`   ✅ Updated: ${account.account_name}`);
    }
  }
  
  console.log(`   ✅ Updated ${updated} accounts`);
  return updated;
}

// Fix 2: Update all sub_accounts to set is_headquarter = TRUE and office_type = "Headquarter"
async function fixSubAccounts() {
  console.log('\n🔧 Fix 2: Updating all sub_accounts...');
  
  const { data: subAccounts, error } = await supabase
    .from('sub_accounts')
    .select('id, sub_account_name, is_headquarter, office_type');
  
  if (error) {
    console.error('   ❌ Error fetching sub_accounts:', error.message);
    return 0;
  }
  
  if (!subAccounts || subAccounts.length === 0) {
    console.log('   ✅ No sub_accounts found');
    return 0;
  }
  
  console.log(`   📝 Found ${subAccounts.length} sub_accounts`);
  
  let updated = 0;
  for (const subAccount of subAccounts) {
    const needsUpdate = 
      subAccount.is_headquarter !== true || 
      subAccount.office_type !== 'Headquarter';
    
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('sub_accounts')
        .update({
          is_headquarter: true,
          office_type: 'Headquarter'
        })
        .eq('id', subAccount.id);
      
      if (updateError) {
        console.error(`   ⚠️  Failed to update sub_account ${subAccount.sub_account_name}: ${updateError.message}`);
      } else {
        updated++;
        console.log(`   ✅ Updated: ${subAccount.sub_account_name}`);
      }
    }
  }
  
  console.log(`   ✅ Updated ${updated} sub_accounts`);
  return updated;
}

// Fix 3: Re-import all contacts to ensure all 122 are imported
async function fixContacts() {
  console.log('\n🔧 Fix 3: Re-importing all contacts from Excel...');
  
  // Read Excel file
  const workbook = XLSX.readFile('firstdatabase.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { raw: false });
  
  // Group contacts by account/sub-account
  let currentAccount: string | null = null;
  let currentSubAccount: string | null = null;
  const contactsByAccount = new Map<string, Array<{
    name: string;
    phone: string;
    designation: string | null;
    email: string | null;
  }>>();
  
  for (const row of data) {
    if (row.account_name) {
      currentAccount = normalizeText(row.account_name);
      currentSubAccount = normalizeText(row.sub_accounts) || currentAccount;
    }
    
    const contactName = normalizeText(row['contact name ']);
    const phone = normalizePhone(row['phone ']);
    
    if (contactName && currentAccount) {
      const key = `${currentAccount}|||${currentSubAccount}`;
      if (!contactsByAccount.has(key)) {
        contactsByAccount.set(key, []);
      }
      
      contactsByAccount.get(key)!.push({
        name: contactName,
        phone,
        designation: normalizeText(row.designation) || null,
        email: normalizeText(row.email) || null,
      });
    }
  }
  
  console.log(`   📝 Found ${contactsByAccount.size} account/sub-account pairs with contacts`);
  
  let totalContacts = 0;
  let contactsCreated = 0;
  let contactsSkipped = 0;
  
  // Get all accounts and sub-accounts
  for (const [key, contacts] of contactsByAccount.entries()) {
    const [accountName, subAccountName] = key.split('|||');
    
    // Get account
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .ilike('account_name', accountName)
      .maybeSingle();
    
    if (!account) {
      console.warn(`   ⚠️  Account not found: ${accountName}`);
      continue;
    }
    
    // Get sub-account
    const { data: subAccount } = await supabase
      .from('sub_accounts')
      .select('id')
      .eq('account_id', account.id)
      .ilike('sub_account_name', subAccountName)
      .maybeSingle();
    
    if (!subAccount) {
      console.warn(`   ⚠️  Sub-account not found: ${subAccountName} (Account: ${accountName})`);
      continue;
    }
    
    // Process each contact
    for (const contact of contacts) {
      totalContacts++;
      
      // Check if contact already exists
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('sub_account_id', subAccount.id)
        .ilike('name', contact.name)
        .maybeSingle();
      
      if (existingContact) {
        contactsSkipped++;
        continue;
      }
      
      // Create contact
      const { error: contactError } = await supabase
        .from('contacts')
        .insert({
          account_id: account.id,
          sub_account_id: subAccount.id,
          name: contact.name,
          phone: contact.phone || null,
          designation: contact.designation || null,
          email: contact.email || null,
          created_by: 'System',
        });
      
      if (contactError) {
        console.warn(`   ⚠️  Failed to create contact ${contact.name}: ${contactError.message}`);
      } else {
        contactsCreated++;
        console.log(`   ✅ Created contact: ${contact.name} (${contact.phone || 'no phone'})`);
      }
    }
  }
  
  console.log(`   ✅ Total contacts in Excel: ${totalContacts}`);
  console.log(`   ✅ Contacts created: ${contactsCreated}`);
  console.log(`   ✅ Contacts skipped (already exist): ${contactsSkipped}`);
  
  return contactsCreated;
}

// Main function
async function fixAllIssues() {
  console.log('\n🚀 Starting fixes for import issues...\n');
  console.log('='.repeat(60));
  
  try {
    // Fix 1: Company tags
    const accountsUpdated = await fixCompanyTags();
    
    // Fix 2: Sub-accounts
    const subAccountsUpdated = await fixSubAccounts();
    
    // Fix 3: Contacts
    const contactsCreated = await fixContacts();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FIX SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Accounts updated (company_tag): ${accountsUpdated}`);
    console.log(`✅ Sub-accounts updated (is_headquarter, office_type): ${subAccountsUpdated}`);
    console.log(`✅ Contacts created: ${contactsCreated}`);
    console.log('='.repeat(60));
    console.log('\n✨ All fixes complete!\n');
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run fixes
fixAllIssues();

