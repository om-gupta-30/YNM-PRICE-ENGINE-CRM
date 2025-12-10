import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

interface ExcelRow {
  account_name?: string | null;
  company_stage?: string | null;
  company_tag?: string | null;
  industres?: string | null;
  industry?: string | null;
  sub_industries?: string | null;
  'sub industry'?: string | null;
  sub_accounts?: string | null;
  subaccount?: string | null;
  'office_type '?: string | null;
  address?: string | null;
  'state '?: string | null;
  state?: string | null;
  city?: string | null;
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
  phones: string[]; // Multiple phone numbers per contact
  designation: string | null;
  email: string | null;
}

interface ProcessedSubAccount {
  sub_account_name: string;
  state: string | null;
  city: string | null;
  address: string | null;
  pincode: string | null;
  office_type: string | null;
}

interface ProcessedAccount {
  account_name: string;
  industry: string;
  sub_industry: string;
  sub_account: ProcessedSubAccount;
  contacts: ProcessedContact[];
}

function cleanString(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ') || null;
}

function normalizeContactName(value: any): string[] {
  if (value === null || value === undefined || value === '') return [];
  const str = String(value).trim();
  if (!str) return [];
  const contacts = str
    .split(/[\r\n\/,]+/)
    .map(c => c.trim())
    .filter(c => c.length > 0);
  return contacts;
}

function normalizePhone(value: any): string[] {
  if (value === null || value === undefined || value === '') return [];
  const str = String(value).trim();
  if (!str) return [];
  // Split by common separators
  const phones = str
    .split(/[\r\n\/,;|]+/)
    .map(p => p.trim().replace(/\s+/g, ''))
    .filter(p => p.length > 0);
  return phones;
}

async function importAllDatabases() {
  console.log('\n🚀 Starting complete import of all 3 Excel files...\n');
  console.log('='.repeat(60));

  const files = [
    { name: 'finalfristdatabase.xlsx', display: 'finalfirstdatabase.xlsx' },
    { name: 'finalseconddatabase.xlsx', display: 'finalseconddatabase.xlsx' },
    { name: 'finalthirddatabase.xlsx', display: 'finalthirddatabase.xlsx' },
  ];

  // Process all files and collect unique accounts
  const accountMap = new Map<string, ProcessedAccount>();
  let totalRowsProcessed = 0;

  for (const file of files) {
    const filePath = path.resolve(process.cwd(), file.name);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file.name}, skipping...`);
      continue;
    }

    console.log(`\n📖 Reading ${file.display}...`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    console.log(`   Found ${rows.length} rows`);

    let currentAccount: ProcessedAccount | null = null;
    let currentSubAccount: ProcessedSubAccount | null = null;

    for (const row of rows) {
      const accountName = cleanString(row.account_name);
      const subAccountName = cleanString(row.sub_accounts || row.subaccount) || accountName;
      const contactNameRaw = row['contact name '];
      const phoneRaw = row['phone '] || row['contact number'];
      const industry = cleanString(row.industres || row.industry) || 'Transport Infrastructure';
      const subIndustry = cleanString(row.sub_industries || row['sub industry']) || 'Road Infrastructure';

      // If this row has account_name, it's a new account/sub-account
      if (accountName) {
        // Use account_name as unique key (remove duplicates)
        if (!accountMap.has(accountName)) {
          currentSubAccount = {
            sub_account_name: subAccountName,
            state: cleanString(row['state '] || row.state),
            city: cleanString(row.city),
            address: cleanString(row.address),
            pincode: row.Pincode || row.pincode ? String(row.Pincode || row.pincode).trim() : null,
            office_type: cleanString(row['office_type ']) || 'Headquarter',
          };

          currentAccount = {
            account_name: accountName,
            industry,
            sub_industry: subIndustry,
            sub_account: currentSubAccount,
            contacts: [],
          };

          accountMap.set(accountName, currentAccount);
        } else {
          // Account exists, update sub-account info if missing
          currentAccount = accountMap.get(accountName)!;
          currentSubAccount = currentAccount.sub_account;
          
          // Update sub-account fields if they're missing
          if (!currentSubAccount.state && (row['state '] || row.state)) {
            currentSubAccount.state = cleanString(row['state '] || row.state);
          }
          if (!currentSubAccount.city && row.city) {
            currentSubAccount.city = cleanString(row.city);
          }
          if (!currentSubAccount.address && row.address) {
            currentSubAccount.address = cleanString(row.address);
          }
          if (!currentSubAccount.pincode && (row.Pincode || row.pincode)) {
            currentSubAccount.pincode = String(row.Pincode || row.pincode).trim();
          }
        }
      }

      // Process contacts (can have multiple per account/sub-account)
      if (contactNameRaw && currentAccount) {
        const contactNames = normalizeContactName(contactNameRaw);
        const phones = normalizePhone(phoneRaw);

        for (const contactName of contactNames) {
          if (contactName) {
            // Check if contact already exists
            let existingContact = currentAccount.contacts.find(c => 
              c.name.toLowerCase().trim() === contactName.toLowerCase().trim()
            );

            if (!existingContact) {
              existingContact = {
                name: contactName,
                phones: phones.length > 0 ? phones : [],
                designation: cleanString(row.designation || row.desigation),
                email: cleanString(row.email),
              };
              currentAccount.contacts.push(existingContact);
            } else {
              // Merge phone numbers
              phones.forEach(phone => {
                if (phone && !existingContact.phones.includes(phone)) {
                  existingContact.phones.push(phone);
                }
              });
              // Update other fields if missing
              if (!existingContact.designation && (row.designation || row.desigation)) {
                existingContact.designation = cleanString(row.designation || row.desigation);
              }
              if (!existingContact.email && row.email) {
                existingContact.email = cleanString(row.email);
              }
            }
          }
        }
      }

      totalRowsProcessed++;
    }

    console.log(`   ✅ Processed ${accountMap.size} unique accounts so far`);
  }

  console.log(`\n📦 Total unique accounts: ${accountMap.size} (target: 275)`);
  let totalContacts = 0;
  accountMap.forEach(account => {
    totalContacts += account.contacts.length;
  });
  console.log(`📦 Total contacts: ${totalContacts}\n`);

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

  // Import to database
  let accountsCreated = 0;
  let accountsUpdated = 0;
  let subAccountsCreated = 0;
  let subAccountsUpdated = 0;
  let contactsCreated = 0;
  const errors: string[] = [];

  for (const accountData of accountMap.values()) {
    try {
      // Get or create industry
      const industryName = accountData.industry.toLowerCase().trim();
      let industryId = industryMap.get(industryName);
      if (!industryId) {
        const { data: newIndustry, error: createIndustryError } = await supabase
          .from('industries')
          .insert({ name: accountData.industry })
          .select('id')
          .single();

        if (!createIndustryError && newIndustry) {
          industryId = newIndustry.id;
          industryMap.set(industryName, industryId);
        } else if (createIndustryError?.code === '23505') {
          const { data: foundIndustry } = await supabase
            .from('industries')
            .select('id')
            .ilike('name', accountData.industry)
            .maybeSingle();
          if (foundIndustry) {
            industryId = foundIndustry.id;
            industryMap.set(industryName, industryId);
          }
        }
      }

      // Get or create sub-industry
      const subIndustryName = accountData.sub_industry.toLowerCase().trim();
      let subIndustryId: number | null = null;
      if (industryId) {
        let subIndustryData = subIndustryMap.get(subIndustryName);
        if (!subIndustryData || subIndustryData.industry_id !== industryId) {
          const { data: newSubIndustry, error: createSubIndustryError } = await supabase
            .from('sub_industries')
            .insert({
              industry_id: industryId,
              name: accountData.sub_industry,
            })
            .select('id, industry_id')
            .single();

          if (!createSubIndustryError && newSubIndustry) {
            subIndustryId = newSubIndustry.id;
            subIndustryMap.set(subIndustryName, { id: subIndustryId, industry_id: industryId });
          } else if (createSubIndustryError?.code === '23505') {
            const { data: foundSubIndustry } = await supabase
              .from('sub_industries')
              .select('id, industry_id')
              .eq('industry_id', industryId)
              .ilike('name', accountData.sub_industry)
              .maybeSingle();
            if (foundSubIndustry) {
              subIndustryId = foundSubIndustry.id;
              subIndustryMap.set(subIndustryName, { id: subIndustryId, industry_id: industryId });
            }
          }
        } else {
          subIndustryId = subIndustryData.id;
        }
      }

      // Find or create account
      let { data: existingAccount } = await supabase
        .from('accounts')
        .select('id, industries')
        .eq('account_name', accountData.account_name)
        .maybeSingle();

      let accountId: number;

      if (existingAccount) {
        // Update account to ensure it has correct company_stage and company_tag
        await supabase
          .from('accounts')
          .update({
            company_stage: 'Enterprise',
            company_tag: 'New',
          })
          .eq('id', existingAccount.id);
        accountId = existingAccount.id;
        accountsUpdated++;
      } else {
        const { data: newAccount, error: insertError } = await supabase
          .from('accounts')
          .insert({
            account_name: accountData.account_name,
            company_stage: 'Enterprise', // Valid enum: Enterprise, SMB, Pan India, etc.
            company_tag: 'New', // Valid enum: New, Prospect, Customer, etc.
            is_active: true,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        accountId = newAccount.id;
        accountsCreated++;
      }

      // Add industry/sub-industry to account
      if (industryId && subIndustryId) {
        const { data: currentAccount } = await supabase
          .from('accounts')
          .select('industries')
          .eq('id', accountId)
          .single();

        const currentIndustries = (currentAccount?.industries as any[]) || [];
        const exists = currentIndustries.some(
          (ind: any) =>
            ind.industry_id === industryId && ind.sub_industry_id === subIndustryId
        );

        if (!exists) {
          const newIndustries = [
            ...currentIndustries,
            {
              industry_id: industryId,
              industry_name: accountData.industry,
              sub_industry_id: subIndustryId,
              sub_industry_name: accountData.sub_industry,
            },
          ];

          await supabase
            .from('accounts')
            .update({ industries: newIndustries })
            .eq('id', accountId);
        }
      }

      // Get or create state
      let stateId: number | null = null;
      if (accountData.sub_account.state) {
        const stateName = accountData.sub_account.state.toLowerCase().trim();
        stateId = stateMap.get(stateName) || null;

        if (!stateId) {
          const { data: newState, error: createStateError } = await supabase
            .from('states')
            .insert({ state_name: accountData.sub_account.state.trim() })
            .select('id')
            .single();

          if (!createStateError && newState) {
            stateId = newState.id;
            stateMap.set(stateName, stateId);
          }
        }
      }

      // Get or create city
      let cityId: number | null = null;
      if (accountData.sub_account.city && stateId) {
        const cityName = accountData.sub_account.city.toLowerCase().trim();
        const cityKey = `${cityName}_${stateId}`;
        const cityData = cityMap.get(cityKey);
        cityId = cityData?.id || null;

        if (!cityId) {
          let { data: newCity, error: createCityError } = await supabase
            .from('cities')
            .insert({ state_id: stateId, name: accountData.sub_account.city.trim() })
            .select('id')
            .single();

          if (createCityError) {
            const { data: newCity2, error: createCityError2 } = await supabase
              .from('cities')
              .insert({ state_id: stateId, city_name: accountData.sub_account.city.trim() })
              .select('id')
              .single();

            if (!createCityError2 && newCity2) {
              cityId = newCity2.id;
              cityMap.set(cityKey, { id: cityId, state_id: stateId });
            }
          } else if (newCity) {
            cityId = newCity.id;
            cityMap.set(cityKey, { id: cityId, state_id: stateId });
          }
        }
      }

      // Find or create sub-account
      let { data: existingSubAccount } = await supabase
        .from('sub_accounts')
        .select('id')
        .eq('account_id', accountId)
        .eq('sub_account_name', accountData.sub_account.sub_account_name)
        .maybeSingle();

      let subAccountId: number;

      if (existingSubAccount) {
        const updateData: any = {
          state_id: stateId,
          city_id: cityId,
          address: accountData.sub_account.address || null,
          pincode: accountData.sub_account.pincode || null,
          is_headquarter: true,
          office_type: accountData.sub_account.office_type || 'Headquarter',
          is_active: true,
        };

        await supabase
          .from('sub_accounts')
          .update(updateData)
          .eq('id', existingSubAccount.id);

        subAccountId = existingSubAccount.id;
        subAccountsUpdated++;
      } else {
        const insertData: any = {
          account_id: accountId,
          sub_account_name: accountData.sub_account.sub_account_name,
          state_id: stateId,
          city_id: cityId,
          address: accountData.sub_account.address || null,
          pincode: accountData.sub_account.pincode || null,
          is_headquarter: true,
          office_type: accountData.sub_account.office_type || 'Headquarter',
          is_active: true,
        };

        const { data: newSubAccount, error: insertError } = await supabase
          .from('sub_accounts')
          .insert(insertData)
          .select('id')
          .single();

        if (insertError) {
          if (insertError.message?.includes('assigned_employee')) {
            insertData.assigned_employee = null;
            const { data: newSubAccount2, error: insertError2 } = await supabase
              .from('sub_accounts')
              .insert(insertData)
              .select('id')
              .single();

            if (insertError2) throw insertError2;
            subAccountId = newSubAccount2.id;
          } else {
            throw insertError;
          }
        } else {
          subAccountId = newSubAccount.id;
        }

        subAccountsCreated++;
      }

      // Process contacts - one contact per person, combine multiple phones with /
      for (const contactData of accountData.contacts) {
        if (!contactData.name) continue;

        // Combine all phone numbers into one string (separated by /)
        const combinedPhone = contactData.phones.length > 0 
          ? contactData.phones.filter(p => p).join(' / ')
          : null;

        // Check if contact already exists (case-insensitive by name)
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id, phone')
          .eq('sub_account_id', subAccountId)
          .ilike('name', contactData.name.trim())
          .maybeSingle();

        if (!existingContact) {
          // Create new contact
          const { error: contactError } = await supabase
            .from('contacts')
            .insert({
              sub_account_id: subAccountId,
              account_id: accountId,
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
        } else {
          // Update existing contact - merge phone numbers
          let updatedPhone = combinedPhone;
          if (existingContact.phone && combinedPhone) {
            // Merge phones, avoiding duplicates
            const existingPhones = existingContact.phone.split(' / ').map(p => p.trim());
            const newPhones = combinedPhone.split(' / ').map(p => p.trim());
            const allPhones = [...new Set([...existingPhones, ...newPhones])];
            updatedPhone = allPhones.join(' / ');
          } else if (existingContact.phone && !combinedPhone) {
            updatedPhone = existingContact.phone;
          }

          // Update contact with merged phone and other fields if missing
          const updateData: any = { phone: updatedPhone };
          if (contactData.email && !existingContact.email) {
            // We'd need to fetch the contact to check, but for now just update phone
          }

          await supabase
            .from('contacts')
            .update(updateData)
            .eq('id', existingContact.id);
        }
      }
    } catch (error: any) {
      console.error(`Error processing account ${accountData.account_name}:`, error);
      errors.push(`${accountData.account_name}: ${error.message}`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Accounts: ${accountsCreated} created, ${accountsUpdated} updated (Total: ${accountMap.size})`);
  console.log(`✅ Sub-Accounts: ${subAccountsCreated} created, ${subAccountsUpdated} updated (Total: ${accountMap.size})`);
  console.log(`✅ Contacts: ${contactsCreated} created`);
  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length}`);
    errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
  }
  console.log('='.repeat(60));
  console.log('\n✨ Import complete! Data is now visible in database and frontend.\n');
}

// Run import
importAllDatabases().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

