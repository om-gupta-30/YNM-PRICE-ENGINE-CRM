import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

interface ExcelRow {
  account_name?: string | null;
  industres?: string | null;
  industry?: string | null;
  sub_industries?: string | null;
  'sub industry'?: string | null;
  sub_accounts?: string | null;
  subaccount?: string | null;
  'state '?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  Pincode?: string | number | null;
  pincode?: string | number | null;
  'contact name '?: string | null;
  'contact number'?: string | number | null;
  'phone '?: string | number | null;
  desigation?: string | null;
  designation?: string | null;
  email?: string | null;
}

interface ProcessedContact {
  name: string;
  phones: string[]; // All phone numbers for this contact
  designation: string | null;
  email: string | null;
}

interface ProcessedSubAccount {
  sub_account_name: string;
  state: string | null;
  city: string | null;
  address: string | null;
  pincode: string | null;
}

interface ProcessedAccount {
  account_name: string;
  industry: string;
  sub_industry: string;
  sub_account: ProcessedSubAccount;
  contacts: Map<string, ProcessedContact>; // Key: contact name (lowercase)
}

function cleanString(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ') || null;
}

function normalizeContactName(value: any): string[] {
  if (value === null || value === undefined || value === '') return [];
  const str = String(value).trim();
  if (!str) return [];
  return str
    .split(/[\r\n\/,]+/)
    .map(c => c.trim())
    .filter(c => c.length > 0);
}

function normalizePhone(value: any): string[] {
  if (value === null || value === undefined || value === '') return [];
  const str = String(value).trim();
  if (!str) return [];
  return str
    .split(/[\r\n\/,;|]+/)
    .map(p => p.trim().replace(/\s+/g, ''))
    .filter(p => p.length > 0);
}

async function fixContactsComplete() {
  console.log('\n🚀 Fixing contacts - combining multiple phones into one record...\n');
  console.log('='.repeat(60));

  // First, delete all existing contacts
  console.log('🗑️  Deleting all existing contacts...');
  await supabase.from('contacts').delete().neq('id', 0);
  console.log('✅ All contacts deleted\n');

  const files = [
    { name: 'finalfristdatabase.xlsx', display: 'finalfirstdatabase.xlsx' },
    { name: 'finalseconddatabase.xlsx', display: 'finalseconddatabase.xlsx' },
    { name: 'finalthirddatabase.xlsx', display: 'finalthirddatabase.xlsx' },
  ];

  const accountMap = new Map<string, ProcessedAccount>();

  // Process all files
  for (const file of files) {
    const filePath = path.resolve(process.cwd(), file.name);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file.name}, skipping...`);
      continue;
    }

    console.log(`📖 Reading ${file.display}...`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    let currentAccount: ProcessedAccount | null = null;

    for (const row of rows) {
      const accountName = cleanString(row.account_name);
      const subAccountName = cleanString(row.sub_accounts || row.subaccount) || accountName;
      const contactNameRaw = row['contact name '];
      const phoneRaw = row['phone '] || row['contact number'];
      const industry = cleanString(row.industres || row.industry) || 'Transport Infrastructure';
      const subIndustry = cleanString(row.sub_industries || row['sub industry']) || 'Road Infrastructure';

      if (accountName) {
        if (!accountMap.has(accountName)) {
          accountMap.set(accountName, {
            account_name: accountName,
            industry,
            sub_industry: subIndustry,
            sub_account: {
              sub_account_name: subAccountName,
              state: cleanString(row['state '] || row.state),
              city: cleanString(row.city),
              address: cleanString(row.address),
              pincode: row.Pincode || row.pincode ? String(row.Pincode || row.pincode).trim() : null,
            },
            contacts: new Map(),
          });
        }
        currentAccount = accountMap.get(accountName)!;
      }

      if (contactNameRaw && currentAccount) {
        const contactNames = normalizeContactName(contactNameRaw);
        const phones = normalizePhone(phoneRaw);

        for (const contactName of contactNames) {
          if (contactName) {
            const contactKey = contactName.toLowerCase().trim();
            let contact = currentAccount.contacts.get(contactKey);

            if (!contact) {
              contact = {
                name: contactName,
                phones: [],
                designation: cleanString(row.designation || row.desigation),
                email: cleanString(row.email),
              };
              currentAccount.contacts.set(contactKey, contact);
            }

            // Add phones (avoid duplicates)
            phones.forEach(phone => {
              if (phone && !contact.phones.includes(phone)) {
                contact.phones.push(phone);
              }
            });

            // Update other fields if missing
            if (!contact.designation && (row.designation || row.desigation)) {
              contact.designation = cleanString(row.designation || row.desigation);
            }
            if (!contact.email && row.email) {
              contact.email = cleanString(row.email);
            }
          }
        }
      }
    }
  }

  console.log(`\n📦 Processed ${accountMap.size} unique accounts`);
  let totalContacts = 0;
  accountMap.forEach(account => {
    totalContacts += account.contacts.size;
  });
  console.log(`📦 Total unique contacts: ${totalContacts} (target: 368)\n`);

  // Get reference data
  const { data: industries } = await supabase.from('industries').select('id, name');
  const { data: subIndustries } = await supabase.from('sub_industries').select('id, name, industry_id');
  const { data: states } = await supabase.from('states').select('id, state_name');
  const { data: cities } = await supabase.from('cities').select('id, city_name, state_id');

  const industryMap = new Map<string, number>();
  (industries || []).forEach(ind => {
    industryMap.set(ind.name.toLowerCase().trim(), ind.id);
  });

  const subIndustryMap = new Map<string, { id: number; industry_id: number }>();
  (subIndustries || []).forEach(si => {
    subIndustryMap.set(si.name.toLowerCase().trim(), { id: si.id, industry_id: si.industry_id });
  });

  const stateMap = new Map<string, number>();
  (states || []).forEach(s => {
    stateMap.set(s.state_name.toLowerCase().trim(), s.id);
  });

  const cityMap = new Map<string, { id: number; state_id: number }>();
  (cities || []).forEach(c => {
    cityMap.set(`${c.city_name.toLowerCase().trim()}_${c.state_id}`, { id: c.id, state_id: c.state_id });
  });

  // Import contacts
  let contactsCreated = 0;
  const errors: string[] = [];

  for (const accountData of accountMap.values()) {
    try {
      // Get account ID
      const { data: account } = await supabase
        .from('accounts')
        .select('id')
        .eq('account_name', accountData.account_name)
        .single();

      if (!account) {
        errors.push(`Account not found: ${accountData.account_name}`);
        continue;
      }

      // Get sub-account ID
      const { data: subAccount } = await supabase
        .from('sub_accounts')
        .select('id')
        .eq('account_id', account.id)
        .eq('sub_account_name', accountData.sub_account.sub_account_name)
        .single();

      if (!subAccount) {
        errors.push(`Sub-account not found: ${accountData.sub_account.sub_account_name}`);
        continue;
      }

      // Process contacts - one contact per person, combine phones with /
      for (const contactData of accountData.contacts.values()) {
        // Combine all phone numbers with /
        const combinedPhone = contactData.phones.length > 0
          ? contactData.phones.join(' / ')
          : null;

        const { error: contactError } = await supabase
          .from('contacts')
          .insert({
            sub_account_id: subAccount.id,
            account_id: account.id,
            name: contactData.name.trim(),
            phone: combinedPhone,
            email: contactData.email || null,
            designation: contactData.designation || null,
            created_by: 'system',
          });

        if (contactError) {
          errors.push(`Contact ${contactData.name}: ${contactError.message}`);
        } else {
          contactsCreated++;
        }
      }
    } catch (error: any) {
      errors.push(`${accountData.account_name}: ${error.message}`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CONTACTS IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Contacts created: ${contactsCreated} (target: 368)`);
  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length}`);
    errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
  }
  console.log('='.repeat(60));
  console.log('\n✨ Contacts import complete!\n');
}

fixContactsComplete().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

