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

function splitContactNames(contactName: string): string[] {
  const names: string[] = [];
  const trimmed = contactName.trim();
  const parts = trimmed.split(/[,;\/]/).map(p => p.trim()).filter(p => p);
  
  for (const part of parts) {
    if (/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)/i.test(part)) {
      names.push(part);
    } else if (part.length > 0) {
      names.push(part);
    }
  }
  
  if (names.length === 0) {
    return [trimmed];
  }
  
  if (names.length === 1 && /Mr\.\s+\w+\s+Mr\./i.test(trimmed)) {
    const matches = trimmed.match(/(Mr\.\s+[^,;\/]+)/gi);
    if (matches && matches.length > 1) {
      return matches.map(m => m.trim());
    }
  }
  
  return names;
}

async function fixContacts() {
  console.log('\n🔧 Fixing Missing Contacts\n');
  console.log('='.repeat(60));
  
  // Read both Excel files
  const firstWorkbook = XLSX.readFile('firstdatabase.xlsx');
  const firstSheet = firstWorkbook.Sheets[firstWorkbook.SheetNames[0]];
  const firstRows = XLSX.utils.sheet_to_json(firstSheet, { raw: false }) as ExcelRow[];
  
  const secondWorkbook = XLSX.readFile('seconddatabase.xlsx');
  const secondSheet = secondWorkbook.Sheets[secondWorkbook.SheetNames[0]];
  const secondRows = XLSX.utils.sheet_to_json(secondSheet, { raw: false }) as ExcelRow[];
  
  let contactsAdded = 0;
  let contactsSkipped = 0;
  
  // Process all rows
  for (const row of [...firstRows, ...secondRows]) {
    const accountName = normalizeText(row.account_name);
    const subAccountName = normalizeText(row.sub_accounts) || accountName;
    const contactName = normalizeText(row['contact name ']);
    
    if (!accountName || !contactName) continue;
    
    // Find the account
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .ilike('account_name', accountName)
      .maybeSingle();
    
    if (!account) {
      console.log(`⚠️  Account not found: ${accountName}`);
      continue;
    }
    
    // Find the sub-account
    const { data: subAccount } = await supabase
      .from('sub_accounts')
      .select('id')
      .eq('account_id', account.id)
      .ilike('sub_account_name', subAccountName)
      .maybeSingle();
    
    if (!subAccount) {
      console.log(`⚠️  Sub-account not found: ${subAccountName} for ${accountName}`);
      continue;
    }
    
    // Split contact names
    const contactNames = splitContactNames(contactName);
    const phone = normalizePhone(row['phone ']);
    const phones = phone ? phone.split('/').map(p => p.trim()).filter(p => p) : [];
    
    for (let i = 0; i < contactNames.length; i++) {
      const name = contactNames[i].trim();
      const contactPhone = phones[i] || (phones.length === 1 ? phones[0] : phone) || null;
      
      if (!name) continue;
      
      // Check if contact already exists
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('sub_account_id', subAccount.id)
        .ilike('name', name)
        .maybeSingle();
      
      if (existingContact) {
        contactsSkipped++;
        continue;
      }
      
      // Create contact
      const { error } = await supabase
        .from('contacts')
        .insert({
          account_id: account.id,
          sub_account_id: subAccount.id,
          name,
          phone: contactPhone,
          designation: normalizeText(row.designation) || null,
          email: normalizeText(row.email) || null,
          created_by: 'System',
        });
      
      if (error) {
        console.warn(`⚠️  Failed to create contact ${name} for ${accountName}: ${error.message}`);
      } else {
        contactsAdded++;
        console.log(`✅ Added contact: ${name} for ${accountName}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Contacts added: ${contactsAdded}`);
  console.log(`ℹ️  Contacts skipped (already exist): ${contactsSkipped}`);
  console.log('='.repeat(60));
  
  // Final count
  const { count: finalCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Total contacts in database: ${finalCount || 0}`);
}

fixContacts().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

