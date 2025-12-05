import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load environment variables from .env.local
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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ExcelRow {
  id: number;
  account_name: string;
  subaccount: string;
  'contact name ': string;
  'contact number': number | string;
  desigation: string;
  email: string;
}

// Normalize text
function normalizeText(text: string | number | undefined): string {
  if (text === undefined || text === null) return '';
  return String(text).trim().replace(/\s+/g, ' ').replace(/\r\n/g, ' ');
}

// Read all Excel files
function readAllExcelFiles(): ExcelRow[] {
  const allData: ExcelRow[] = [];
  
  for (let i = 1; i <= 4; i++) {
    const filename = `database${i}.xlsx`;
    const workbook = XLSX.readFile(filename);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as ExcelRow[];
    allData.push(...data);
  }
  
  return allData;
}

async function importContacts() {
  console.log('\n🚀 Starting contacts import...\n');
  
  const allRows = readAllExcelFiles();
  console.log(`📊 Total rows: ${allRows.length}\n`);
  
  let contactsCreated = 0;
  let contactsSkipped = 0;
  let errors = 0;
  
  for (const row of allRows) {
    const accountName = normalizeText(row.account_name);
    const subAccountName = normalizeText(row.subaccount);
    const contactName = normalizeText(row['contact name ']);
    const contactPhone = normalizeText(String(row['contact number']));
    const contactEmail = normalizeText(row.email);
    const designation = normalizeText(row.desigation);
    
    if (!accountName || !subAccountName || !contactName || !contactPhone) {
      contactsSkipped++;
      continue;
    }
    
    try {
      // Find account
      const { data: account } = await supabase
        .from('accounts')
        .select('id')
        .ilike('account_name', accountName)
        .maybeSingle();
      
      if (!account) {
        console.warn(`⚠️  Account not found: ${accountName}`);
        errors++;
        continue;
      }
      
      // Find sub-account
      const { data: subAccount } = await supabase
        .from('sub_accounts')
        .select('id')
        .eq('account_id', account.id)
        .ilike('sub_account_name', subAccountName)
        .maybeSingle();
      
      if (!subAccount) {
        console.warn(`⚠️  Sub-account not found: ${subAccountName} (Account: ${accountName})`);
        errors++;
        continue;
      }
      
      // Check if contact already exists
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('sub_account_id', subAccount.id)
        .ilike('name', contactName)
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
          name: contactName,
          phone: contactPhone,
          email: contactEmail,
          designation: designation,
          created_by: 'System Import', // Imported from Excel
        });
      
      if (contactError) {
        console.warn(`⚠️  Failed to create contact ${contactName}: ${contactError.message}`);
        errors++;
      } else {
        contactsCreated++;
        console.log(`✅ Contact created: ${contactName} (${accountName})`);
      }
      
    } catch (error: any) {
      console.error(`❌ Error processing contact ${contactName}:`, error.message);
      errors++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CONTACTS IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Contacts created: ${contactsCreated}`);
  console.log(`⏭️  Contacts skipped (already exist or missing data): ${contactsSkipped}`);
  if (errors > 0) {
    console.log(`❌ Errors: ${errors}`);
  }
  console.log('='.repeat(60));
  console.log('\n✨ Import complete!\n');
}

importContacts().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

