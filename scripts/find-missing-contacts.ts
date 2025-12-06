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
  'contact name '?: string;
  'phone '?: string | number;
}

function normalizeText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text).trim().replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

// Split contact names that contain multiple names
function splitContactNames(contactName: string): string[] {
  // Patterns to detect multiple names:
  // - "Mr. Name1, Mr. Name2"
  // - "Mr. Name1 Mr. Name2"
  // - "Mr. Name1/ Mr. Name2"
  // - "Mr. Name1, Mr. Name2, Mr. Name3"
  
  const names: string[] = [];
  const trimmed = contactName.trim();
  
  // Split by common delimiters
  const parts = trimmed.split(/[,;\/]/).map(p => p.trim()).filter(p => p);
  
  for (const part of parts) {
    // Check if part contains "Mr." or "Mrs." or "Ms." - likely a name
    if (/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)/i.test(part)) {
      names.push(part);
    } else if (part.length > 0) {
      // If no title, might still be a name
      names.push(part);
    }
  }
  
  // If no splits found, return original
  if (names.length === 0) {
    return [trimmed];
  }
  
  // Also check for "Mr. Name1 Mr. Name2" pattern (no delimiter)
  if (names.length === 1 && /Mr\.\s+\w+\s+Mr\./i.test(trimmed)) {
    const matches = trimmed.match(/(Mr\.\s+[^,;\/]+)/gi);
    if (matches && matches.length > 1) {
      return matches.map(m => m.trim());
    }
  }
  
  return names;
}

async function findMissingContacts() {
  console.log('\n🔍 Finding Missing Contacts\n');
  console.log('='.repeat(60));
  
  // Read both Excel files
  const firstWorkbook = XLSX.readFile('firstdatabase.xlsx');
  const firstSheet = firstWorkbook.Sheets[firstWorkbook.SheetNames[0]];
  const firstRows = XLSX.utils.sheet_to_json(firstSheet, { raw: false }) as ExcelRow[];
  
  const secondWorkbook = XLSX.readFile('seconddatabase.xlsx');
  const secondSheet = secondWorkbook.Sheets[secondWorkbook.SheetNames[0]];
  const secondRows = XLSX.utils.sheet_to_json(secondSheet, { raw: false }) as ExcelRow[];
  
  // Count contacts from Excel (splitting multiple names)
  let excelContactCount = 0;
  const contactsWithMultipleNames: Array<{ account: string; original: string; split: string[] }> = [];
  
  for (const row of [...firstRows, ...secondRows]) {
    const contactName = normalizeText(row['contact name ']);
    if (contactName) {
      const splitNames = splitContactNames(contactName);
      excelContactCount += splitNames.length;
      
      if (splitNames.length > 1) {
        contactsWithMultipleNames.push({
          account: normalizeText(row.account_name) || 'Unknown',
          original: contactName,
          split: splitNames
        });
      }
    }
  }
  
  console.log(`\n📊 Contact Analysis:`);
  console.log(`   Total contacts in Excel (after splitting): ${excelContactCount}`);
  console.log(`   Contacts with multiple names: ${contactsWithMultipleNames.length}`);
  
  if (contactsWithMultipleNames.length > 0) {
    console.log(`\n⚠️  Found contacts that should be split:`);
    contactsWithMultipleNames.slice(0, 10).forEach(({ account, original, split }) => {
      console.log(`   Account: ${account}`);
      console.log(`     Original: "${original}"`);
      console.log(`     Should be: ${split.length} contacts`);
      split.forEach(name => console.log(`       - ${name}`));
    });
    if (contactsWithMultipleNames.length > 10) {
      console.log(`   ... and ${contactsWithMultipleNames.length - 10} more`);
    }
  }
  
  // Get contacts from database
  const { data: dbContacts, error } = await supabase
    .from('contacts')
    .select('name');
  
  if (error) {
    console.error('❌ Error fetching contacts:', error);
    return;
  }
  
  console.log(`\n📊 Database:`);
  console.log(`   Contacts in DB: ${dbContacts?.length || 0}`);
  console.log(`   Expected: ${excelContactCount}`);
  console.log(`   Missing: ${excelContactCount - (dbContacts?.length || 0)}`);
  
  console.log('\n' + '='.repeat(60));
}

findMissingContacts().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

