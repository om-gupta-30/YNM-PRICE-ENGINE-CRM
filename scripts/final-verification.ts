const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
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

const supabase = createClient(supabaseUrl, supabaseKey);

interface ExcelRow {
  account_name?: string;
  sub_accounts?: string;
}

function normalizeText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text).trim().replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

async function finalVerification() {
  console.log('\n📊 Final Verification Report\n');
  console.log('='.repeat(60));
  
  // Read both Excel files and get all unique account+sub-account pairs
  const firstWorkbook = XLSX.readFile('firstdatabase.xlsx');
  const firstSheet = firstWorkbook.Sheets[firstWorkbook.SheetNames[0]];
  const firstRows = XLSX.utils.sheet_to_json(firstSheet, { raw: false }) as ExcelRow[];
  
  const secondWorkbook = XLSX.readFile('seconddatabase.xlsx');
  const secondSheet = secondWorkbook.Sheets[secondWorkbook.SheetNames[0]];
  const secondRows = XLSX.utils.sheet_to_json(secondSheet, { raw: false }) as ExcelRow[];
  
  // Build set of all account+sub-account pairs from Excel
  const excelAccountSubAccountPairs = new Set<string>();
  
  for (const row of [...firstRows, ...secondRows]) {
    const accountName = normalizeText(row.account_name);
    const subAccountName = normalizeText(row.sub_accounts) || accountName;
    if (accountName) {
      const key = `${accountName}|||${subAccountName}`;
      excelAccountSubAccountPairs.add(key);
    }
  }
  
  console.log(`\n📊 Excel Files:`);
  console.log(`   Unique account+sub-account pairs: ${excelAccountSubAccountPairs.size}`);
  
  // Get all accounts and sub-accounts from database
  const { data: dbAccounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, account_name');
  
  const { data: dbSubAccounts, error: subAccountsError } = await supabase
    .from('sub_accounts')
    .select('id, sub_account_name, account_id')
    .order('account_id');
  
  const { data: dbContacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id');
  
  if (accountsError || subAccountsError || contactsError) {
    console.error('❌ Error fetching data:', { accountsError, subAccountsError, contactsError });
    return;
  }
  
  console.log(`\n📊 Database:`);
  console.log(`   Accounts: ${dbAccounts?.length || 0}`);
  console.log(`   Sub-accounts: ${dbSubAccounts?.length || 0}`);
  console.log(`   Contacts: ${dbContacts?.length || 0}`);
  
  // Check if H.G. Infra has multiple sub-accounts
  const hgInfraAccount = dbAccounts?.find(a => 
    a.account_name.toLowerCase().includes('h. g. infra') || 
    a.account_name.toLowerCase().includes('hg infra')
  );
  
  if (hgInfraAccount) {
    const hgSubAccounts = dbSubAccounts?.filter(sa => sa.account_id === hgInfraAccount.id);
    console.log(`\n🔍 H. G. Infra Engineering Ltd.:`);
    console.log(`   Account ID: ${hgInfraAccount.id}`);
    console.log(`   Sub-accounts: ${hgSubAccounts?.length || 0}`);
    if (hgSubAccounts && hgSubAccounts.length > 0) {
      hgSubAccounts.forEach(sa => {
        console.log(`     - ${sa.sub_account_name} (ID: ${sa.id})`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📈 Summary:');
  console.log(`   Expected Accounts:     197`);
  console.log(`   Actual Accounts:       ${dbAccounts?.length || 0}`);
  console.log(`   Expected Sub-accounts: 197`);
  console.log(`   Actual Sub-accounts:   ${dbSubAccounts?.length || 0}`);
  console.log(`   Expected Contacts:     233`);
  console.log(`   Actual Contacts:       ${dbContacts?.length || 0}`);
  console.log('='.repeat(60));
  
  const accountDiff = 197 - (dbAccounts?.length || 0);
  const subAccountDiff = 197 - (dbSubAccounts?.length || 0);
  const contactDiff = 233 - (dbContacts?.length || 0);
  
  if (accountDiff === 0 && subAccountDiff === 0 && contactDiff === 0) {
    console.log('\n✅ All counts match perfectly!');
  } else {
    console.log('\n⚠️  Discrepancies:');
    if (accountDiff !== 0) console.log(`   Accounts: ${accountDiff > 0 ? '+' : ''}${accountDiff}`);
    if (subAccountDiff !== 0) console.log(`   Sub-accounts: ${subAccountDiff > 0 ? '+' : ''}${subAccountDiff}`);
    if (contactDiff !== 0) console.log(`   Contacts: ${contactDiff > 0 ? '+' : ''}${contactDiff}`);
  }
}

finalVerification().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

