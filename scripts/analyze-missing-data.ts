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
  company_stage?: string;
  company_tag?: string;
  industres?: string;
  sub_industries?: string;
  sub_accounts?: string;
  'office_type '?: string;
  address?: string;
  'state '?: string;
  city?: string;
  pincode?: string | number;
  'contact name '?: string;
  'phone '?: string | number;
  designation?: string;
  email?: string;
}

function normalizeText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text).trim().replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

function normalizePhone(phone: string | number | undefined | null): string {
  if (phone === undefined || phone === null) return '';
  let phoneStr = String(phone).trim();
  phoneStr = phoneStr.replace(/[\r\n,;]+/g, '/');
  phoneStr = phoneStr.replace(/\s*\/\s*/g, '/');
  phoneStr = phoneStr.split('/').map(p => p.replace(/[^\d+]/g, '')).join('/');
  phoneStr = phoneStr.replace(/\/+/g, '/');
  phoneStr = phoneStr.replace(/^\/|\/$/g, '');
  return phoneStr;
}

// Group data by account and sub-account (same logic as import script)
function groupDataByAccount(rows: ExcelRow[], filename: string): Map<string, { accountName: string; subAccountName: string; contacts: number; hasState: boolean }> {
  const accountMap = new Map<string, { accountName: string; subAccountName: string; contacts: number; hasState: boolean }>();
  
  let currentAccountData: { accountName: string; subAccountName: string; contacts: number; hasState: boolean } | null = null;
  
  for (const row of rows) {
    if (row.account_name) {
      const rawState = normalizeText(row['state ']);
      const accountName = normalizeText(row.account_name);
      const subAccountName = normalizeText(row.sub_accounts) || accountName;
      const key = `${accountName}|||${subAccountName}`;
      
      currentAccountData = {
        accountName,
        subAccountName,
        contacts: 0,
        hasState: !!rawState
      };
      
      accountMap.set(key, currentAccountData);
    }
    
    const contactName = normalizeText(row['contact name ']);
    if (contactName && currentAccountData) {
      currentAccountData.contacts++;
    }
  }
  
  return accountMap;
}

async function analyzeMissing() {
  console.log('\n🔍 Detailed Analysis of Missing Data\n');
  console.log('='.repeat(60));
  
  // Read both Excel files
  console.log('\n📖 Reading Excel files...');
  const firstWorkbook = XLSX.readFile('firstdatabase.xlsx');
  const firstSheet = firstWorkbook.Sheets[firstWorkbook.SheetNames[0]];
  const firstRows = XLSX.utils.sheet_to_json(firstSheet, { raw: false }) as ExcelRow[];
  
  const secondWorkbook = XLSX.readFile('seconddatabase.xlsx');
  const secondSheet = secondWorkbook.Sheets[secondWorkbook.SheetNames[0]];
  const secondRows = XLSX.utils.sheet_to_json(secondSheet, { raw: false }) as ExcelRow[];
  
  // Group accounts from both files
  const firstAccounts = groupDataByAccount(firstRows, 'firstdatabase.xlsx');
  const secondAccounts = groupDataByAccount(secondRows, 'seconddatabase.xlsx');
  
  // Combine all accounts
  const allExcelAccounts = new Map<string, { accountName: string; subAccountName: string; contacts: number; hasState: boolean; source: string }>();
  
  for (const [key, data] of firstAccounts.entries()) {
    allExcelAccounts.set(key, { ...data, source: 'firstdatabase.xlsx' });
  }
  
  for (const [key, data] of secondAccounts.entries()) {
    if (allExcelAccounts.has(key)) {
      // Merge contacts if duplicate
      const existing = allExcelAccounts.get(key)!;
      existing.contacts += data.contacts;
      existing.source = 'both';
    } else {
      allExcelAccounts.set(key, { ...data, source: 'seconddatabase.xlsx' });
    }
  }
  
  console.log(`\n📊 Excel Analysis:`);
  console.log(`   Total unique account/sub-account pairs: ${allExcelAccounts.size}`);
  
  // Count total contacts
  let totalContacts = 0;
  for (const data of allExcelAccounts.values()) {
    totalContacts += data.contacts;
  }
  console.log(`   Total contacts: ${totalContacts}`);
  
  // Check accounts without state
  const accountsWithoutState: string[] = [];
  for (const [key, data] of allExcelAccounts.entries()) {
    if (!data.hasState) {
      accountsWithoutState.push(data.accountName);
    }
  }
  
  if (accountsWithoutState.length > 0) {
    console.log(`\n⚠️  ${accountsWithoutState.length} accounts without state:`);
    accountsWithoutState.forEach(name => console.log(`   - ${name}`));
  }
  
  // Get all accounts from database
  const { data: dbAccounts, error: dbAccountsError } = await supabase
    .from('accounts')
    .select('account_name');
  
  const { data: dbSubAccounts, error: dbSubAccountsError } = await supabase
    .from('sub_accounts')
    .select('sub_account_name, account_id');
  
  const { data: dbContacts, error: dbContactsError } = await supabase
    .from('contacts')
    .select('name, sub_account_id');
  
  if (dbAccountsError) {
    console.error('❌ Error fetching accounts:', dbAccountsError);
    return;
  }
  
  console.log(`\n📊 Database Analysis:`);
  console.log(`   Accounts in DB: ${dbAccounts?.length || 0}`);
  console.log(`   Sub-accounts in DB: ${dbSubAccounts?.length || 0}`);
  console.log(`   Contacts in DB: ${dbContacts?.length || 0}`);
  
  // Find missing accounts
  const dbAccountNames = new Set((dbAccounts || []).map(a => a.account_name.toLowerCase().trim()));
  const missingAccounts: string[] = [];
  
  for (const [key, excelData] of allExcelAccounts.entries()) {
    const excelNameLower = excelData.accountName.toLowerCase().trim();
    let found = false;
    
    for (const dbName of dbAccountNames) {
      if (dbName === excelNameLower || 
          dbName.includes(excelNameLower) || 
          excelNameLower.includes(dbName)) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      missingAccounts.push(excelData.accountName);
    }
  }
  
  if (missingAccounts.length > 0) {
    console.log(`\n❌ ${missingAccounts.length} accounts from Excel not in database:`);
    missingAccounts.forEach(name => console.log(`   - ${name}`));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📈 Expected vs Actual:');
  console.log(`   Expected Accounts:     ${allExcelAccounts.size}`);
  console.log(`   Actual Accounts:      ${dbAccounts?.length || 0}`);
  console.log(`   Expected Sub-accounts: ${allExcelAccounts.size}`);
  console.log(`   Actual Sub-accounts:   ${dbSubAccounts?.length || 0}`);
  console.log(`   Expected Contacts:     ${totalContacts}`);
  console.log(`   Actual Contacts:       ${dbContacts?.length || 0}`);
  console.log('='.repeat(60));
}

analyzeMissing().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

