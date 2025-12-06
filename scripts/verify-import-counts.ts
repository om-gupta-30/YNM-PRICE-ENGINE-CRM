const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

// Normalize text
function normalizeText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text).trim().replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

// Count unique accounts and contacts from Excel
function countFromExcel(filename: string): { accounts: number; contacts: number; accountNames: Set<string> } {
  console.log(`\n📖 Reading ${filename}...`);
  const workbook = XLSX.readFile(filename);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { raw: false }) as ExcelRow[];
  
  const accountNames = new Set<string>();
  let contactCount = 0;
  
  for (const row of data) {
    const accountName = normalizeText(row.account_name);
    if (accountName) {
      accountNames.add(accountName);
    }
    
    const contactName = normalizeText(row['contact name ']);
    if (contactName) {
      contactCount++;
    }
  }
  
  return {
    accounts: accountNames.size,
    contacts: contactCount,
    accountNames
  };
}

async function verifyCounts() {
  console.log('\n🔍 Verifying Import Counts\n');
  console.log('='.repeat(60));
  
  // Count from Excel files
  const firstDb = countFromExcel('firstdatabase.xlsx');
  const secondDb = countFromExcel('seconddatabase.xlsx');
  
  console.log(`\n📊 Excel File Counts:`);
  console.log(`   firstdatabase.xlsx:  ${firstDb.accounts} accounts, ${firstDb.contacts} contacts`);
  console.log(`   seconddatabase.xlsx: ${secondDb.accounts} accounts, ${secondDb.contacts} contacts`);
  console.log(`   Total Expected:      ${firstDb.accounts + secondDb.accounts} accounts, ${firstDb.contacts + secondDb.contacts} contacts`);
  
  // Check for duplicates between files
  const allExcelAccounts = new Set([...firstDb.accountNames, ...secondDb.accountNames]);
  const duplicates = firstDb.accountNames.size + secondDb.accountNames.size - allExcelAccounts.size;
  if (duplicates > 0) {
    console.log(`   ⚠️  ${duplicates} duplicate account names found between files`);
  }
  
  // Count from database
  const { count: dbAccountCount, error: accountError } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true });
  
  const { count: dbSubAccountCount, error: subAccountError } = await supabase
    .from('sub_accounts')
    .select('*', { count: 'exact', head: true });
  
  const { count: dbContactCount, error: contactError } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });
  
  if (accountError) {
    console.error('❌ Error counting accounts:', accountError);
  }
  if (subAccountError) {
    console.error('❌ Error counting sub_accounts:', subAccountError);
  }
  if (contactError) {
    console.error('❌ Error counting contacts:', contactError);
  }
  
  console.log(`\n📊 Database Counts:`);
  console.log(`   Accounts:     ${dbAccountCount || 0}`);
  console.log(`   Sub-accounts:  ${dbSubAccountCount || 0}`);
  console.log(`   Contacts:     ${dbContactCount || 0}`);
  
  // Get all account names from database
  const { data: dbAccounts, error: dbAccountsError } = await supabase
    .from('accounts')
    .select('account_name');
  
  if (dbAccountsError) {
    console.error('❌ Error fetching account names:', dbAccountsError);
  } else {
    const dbAccountNames = new Set(dbAccounts?.map(a => a.account_name.toLowerCase().trim()) || []);
    const excelAccountNames = new Set(
      Array.from(allExcelAccounts).map(name => name.toLowerCase().trim())
    );
    
    // Find missing accounts
    const missingInDb: string[] = [];
    for (const excelName of excelAccountNames) {
      let found = false;
      for (const dbName of dbAccountNames) {
        if (dbName === excelName || dbName.includes(excelName) || excelName.includes(dbName)) {
          found = true;
          break;
        }
      }
      if (!found) {
        // Find original case
        const original = Array.from(allExcelAccounts).find(n => n.toLowerCase().trim() === excelName);
        if (original) missingInDb.push(original);
      }
    }
    
    if (missingInDb.length > 0) {
      console.log(`\n⚠️  ${missingInDb.length} accounts from Excel not found in database:`);
      missingInDb.slice(0, 10).forEach(name => console.log(`   - ${name}`));
      if (missingInDb.length > 10) {
        console.log(`   ... and ${missingInDb.length - 10} more`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📈 Summary:');
  console.log(`   Expected Accounts:     ${firstDb.accounts + secondDb.accounts}`);
  console.log(`   Actual Accounts:       ${dbAccountCount || 0}`);
  console.log(`   Expected Sub-accounts: ${firstDb.accounts + secondDb.accounts}`);
  console.log(`   Actual Sub-accounts:   ${dbSubAccountCount || 0}`);
  console.log(`   Expected Contacts:     ${firstDb.contacts + secondDb.contacts}`);
  console.log(`   Actual Contacts:       ${dbContactCount || 0}`);
  console.log('='.repeat(60));
  
  const accountDiff = (firstDb.accounts + secondDb.accounts) - (dbAccountCount || 0);
  const subAccountDiff = (firstDb.accounts + secondDb.accounts) - (dbSubAccountCount || 0);
  const contactDiff = (firstDb.contacts + secondDb.contacts) - (dbContactCount || 0);
  
  if (accountDiff !== 0 || subAccountDiff !== 0 || contactDiff !== 0) {
    console.log('\n⚠️  Discrepancies found!');
    if (accountDiff !== 0) console.log(`   Accounts: ${accountDiff > 0 ? '+' : ''}${accountDiff}`);
    if (subAccountDiff !== 0) console.log(`   Sub-accounts: ${subAccountDiff > 0 ? '+' : ''}${subAccountDiff}`);
    if (contactDiff !== 0) console.log(`   Contacts: ${contactDiff > 0 ? '+' : ''}${contactDiff}`);
  } else {
    console.log('\n✅ All counts match!');
  }
}

verifyCounts().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

