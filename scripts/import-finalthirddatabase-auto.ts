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
  sub_industries?: string | null;
  sub_accounts?: string | null;
  'office_type '?: string | null;
  address?: string | null;
  'state '?: string | null;
  city?: string | null;
  Pincode?: string | number | null;
  'contact name '?: string | null;
  'phone '?: string | number | null;
  designation?: string | null;
  email?: string | null;
}

interface ProcessedContact {
  name: string;
  phone: string | null;
  designation: string | null;
  email: string | null;
}

interface ProcessedSubAccount {
  sub_account_name: string;
  office_type: string | null;
  address: string | null;
  state: string | null;
  city: string | null;
  pin_code: string | null;
  contacts: ProcessedContact[];
}

interface ProcessedAccount {
  account_name: string;
  company_stage: string | null;
  company_tag: string | null;
  industry: string | null;
  sub_industry: string | null;
  sub_accounts: ProcessedSubAccount[];
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

async function importFinalThirdDatabase() {
  console.log('\n🚀 Starting automatic import of finalthirddatabase.xlsx...\n');
  console.log('='.repeat(60));

  // Read Excel file
  const fileName = 'finalthirddatabase.xlsx';
  const filePath = path.resolve(process.cwd(), fileName);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Excel file not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`📖 Reading ${fileName}...`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

  console.log(`📊 Found ${rows.length} rows in Excel file\n`);

  // Process rows and group by unique account and account/sub-account pairs
  const accountMap = new Map<string, ProcessedAccount>();
  let currentAccountKey: string | null = null;
  let currentSubAccountKey: string | null = null;

  for (const row of rows) {
    const accountName = cleanString(row.account_name);
    const subAccountName = cleanString(row.sub_accounts) || accountName;
    const contactNameRaw = row['contact name '];

    if (accountName) {
      const key = `${accountName}|||${subAccountName}`;
      currentAccountKey = accountName;
      currentSubAccountKey = key;

      if (!accountMap.has(accountName)) {
        accountMap.set(accountName, {
          account_name: accountName,
          company_stage: cleanString(row.company_stage),
          company_tag: cleanString(row.company_tag),
          industry: cleanString(row.industres),
          sub_industry: cleanString(row.sub_industries),
          sub_accounts: [],
        });
      }

      const account = accountMap.get(accountName)!;
      if (row.company_stage) account.company_stage = cleanString(row.company_stage);
      if (row.company_tag) account.company_tag = cleanString(row.company_tag);
      if (row.industres) account.industry = cleanString(row.industres);
      if (row.sub_industries) account.sub_industry = cleanString(row.sub_industries);

      let subAccount = account.sub_accounts.find(sa => sa.sub_account_name === subAccountName);
      if (!subAccount) {
        subAccount = {
          sub_account_name: subAccountName,
          office_type: cleanString(row['office_type ']),
          address: cleanString(row.address),
          state: cleanString(row['state ']),
          city: cleanString(row.city),
          pin_code: row.Pincode ? String(row.Pincode).trim() : null,
          contacts: [],
        };
        account.sub_accounts.push(subAccount);
      } else {
        if (row['office_type '] && !subAccount.office_type) subAccount.office_type = cleanString(row['office_type ']);
        if (row.address && !subAccount.address) subAccount.address = cleanString(row.address);
        if (row['state '] && !subAccount.state) subAccount.state = cleanString(row['state ']);
        if (row.city && !subAccount.city) subAccount.city = cleanString(row.city);
        if (row.Pincode && !subAccount.pin_code) subAccount.pin_code = String(row.Pincode).trim();
      }

      if (contactNameRaw) {
        const contactNames = normalizeContactName(contactNameRaw);
        for (const contactName of contactNames) {
          if (contactName) {
            const existingContact = subAccount.contacts.find(c => 
              c.name.toLowerCase().trim() === contactName.toLowerCase().trim()
            );
            if (!existingContact) {
              subAccount.contacts.push({
                name: contactName,
                phone: row['phone '] ? String(row['phone ']).trim() : null,
                designation: cleanString(row.designation),
                email: cleanString(row.email),
              });
            } else {
              if (row['phone '] && !existingContact.phone) existingContact.phone = String(row['phone ']).trim();
              if (row.email && !existingContact.email) existingContact.email = cleanString(row.email);
              if (row.designation && !existingContact.designation) existingContact.designation = cleanString(row.designation);
            }
          }
        }
      }
    } else if (currentAccountKey && currentSubAccountKey && contactNameRaw) {
      const account = accountMap.get(currentAccountKey);
      if (account) {
        const subAccount = account.sub_accounts[account.sub_accounts.length - 1];
        if (subAccount) {
          const contactNames = normalizeContactName(contactNameRaw);
          for (const contactName of contactNames) {
            if (contactName) {
              const existingContact = subAccount.contacts.find(c => 
                c.name.toLowerCase().trim() === contactName.toLowerCase().trim()
              );
              if (!existingContact) {
                subAccount.contacts.push({
                  name: contactName,
                  phone: row['phone '] ? String(row['phone ']).trim() : null,
                  designation: cleanString(row.designation),
                  email: cleanString(row.email),
                });
              } else {
                if (row['phone '] && !existingContact.phone) existingContact.phone = String(row['phone ']).trim();
                if (row.email && !existingContact.email) existingContact.email = cleanString(row.email);
                if (row.designation && !existingContact.designation) existingContact.designation = cleanString(row.designation);
              }
            }
          }
        }
      }
    }
  }

  console.log(`📦 Processed ${accountMap.size} unique accounts (target: 117)`);
  let totalSubAccounts = 0;
  let totalContacts = 0;
  accountMap.forEach(account => {
    totalSubAccounts += account.sub_accounts.length;
    account.sub_accounts.forEach(sa => {
      totalContacts += sa.contacts.length;
    });
  });
  console.log(`📦 Processed ${totalSubAccounts} unique sub-accounts (target: 117)`);
  console.log(`📦 Processed ${totalContacts} contacts (target: 173)\n`);

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
      // Find or create account
      let { data: existingAccount } = await supabase
        .from('accounts')
        .select('id, account_name')
        .eq('account_name', accountData.account_name)
        .maybeSingle();

      let accountId: number;

      if (existingAccount) {
        accountId = existingAccount.id;
        accountsUpdated++;
      } else {
        const { data: newAccount, error: insertError } = await supabase
          .from('accounts')
          .insert({
            account_name: accountData.account_name,
            company_stage: accountData.company_stage || 'Lead',
            company_tag: accountData.company_tag || 'New',
            is_active: true,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        accountId = newAccount.id;
        accountsCreated++;
      }

      // Handle industry - ensure ALL accounts have industry/sub-industry
      // Industry is stored in accounts.industries JSONB column as an array
      let finalIndustry = accountData.industry || 'Transport Infrastructure';
      let finalSubIndustry = accountData.sub_industry || 'Road Infrastructure';

      const industryName = finalIndustry.toLowerCase().trim();
      const subIndustryName = finalSubIndustry.toLowerCase().trim();
      
      // Get or create industry
      let industryId = industryMap.get(industryName);
      if (!industryId) {
        // Create industry if it doesn't exist
        const { data: newIndustry, error: createIndustryError } = await supabase
          .from('industries')
          .insert({ name: finalIndustry })
          .select('id')
          .single();

        if (!createIndustryError && newIndustry) {
          industryId = newIndustry.id;
          industryMap.set(industryName, industryId);
        } else if (createIndustryError?.code === '23505') {
          // Duplicate - try to find it
          const { data: foundIndustry } = await supabase
            .from('industries')
            .select('id')
            .ilike('name', finalIndustry)
            .maybeSingle();
          if (foundIndustry) {
            industryId = foundIndustry.id;
            industryMap.set(industryName, industryId);
          }
        }
      }

      // Get or create sub-industry
      let subIndustryId: number | null = null;
      if (industryId) {
        let subIndustryData = subIndustryMap.get(subIndustryName);
        if (!subIndustryData || subIndustryData.industry_id !== industryId) {
          // Create sub-industry if it doesn't exist
          const { data: newSubIndustry, error: createSubIndustryError } = await supabase
            .from('sub_industries')
            .insert({
              industry_id: industryId,
              name: finalSubIndustry,
            })
            .select('id, industry_id')
            .single();

          if (!createSubIndustryError && newSubIndustry) {
            subIndustryId = newSubIndustry.id;
            subIndustryMap.set(subIndustryName, { id: subIndustryId, industry_id: industryId });
          } else if (createSubIndustryError?.code === '23505') {
            // Duplicate - try to find it
            const { data: foundSubIndustry } = await supabase
              .from('sub_industries')
              .select('id, industry_id')
              .eq('industry_id', industryId)
              .ilike('name', finalSubIndustry)
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

      // Always add industry/sub-industry to accounts.industries JSONB column if we have both IDs
      if (industryId && subIndustryId) {
        // Get current industries array from account
        const { data: currentAccount } = await supabase
          .from('accounts')
          .select('industries')
          .eq('id', accountId)
          .single();

        const currentIndustries = (currentAccount?.industries as any[]) || [];
        
        // Check if this industry/sub-industry combination already exists
        const exists = currentIndustries.some(
          (ind: any) =>
            ind.industry_id === industryId && ind.sub_industry_id === subIndustryId
        );

        if (!exists) {
          const newIndustries = [
            ...currentIndustries,
            {
              industry_id: industryId,
              industry_name: finalIndustry,
              sub_industry_id: subIndustryId,
              sub_industry_name: finalSubIndustry,
            },
          ];

          const { error: updateError } = await supabase
            .from('accounts')
            .update({ industries: newIndustries })
            .eq('id', accountId);

          if (updateError) {
            console.error(`Error updating industries for ${accountData.account_name}:`, updateError);
          } else {
            console.log(`✅ Added industry: ${finalIndustry} / ${finalSubIndustry} to ${accountData.account_name}`);
          }
        }
      } else {
        console.warn(`⚠️ Could not set industry for ${accountData.account_name}: industryId=${industryId}, subIndustryId=${subIndustryId}`);
      }

      // Process sub-accounts
      for (const subAccountData of accountData.sub_accounts) {
        let stateId: number | null = null;
        let cityId: number | null = null;

        if (subAccountData.state) {
          const stateName = subAccountData.state.toLowerCase().trim();
          stateId = stateMap.get(stateName) || null;

          if (!stateId) {
            const { data: newState, error: createStateError } = await supabase
              .from('states')
              .insert({ state_name: subAccountData.state.trim() })
              .select('id')
              .single();

            if (!createStateError && newState) {
              stateId = newState.id;
              stateMap.set(stateName, stateId);
            }
          }
        }

        if (subAccountData.city && stateId) {
          const cityName = subAccountData.city.toLowerCase().trim();
          const cityKey = `${cityName}_${stateId}`;
          const cityData = cityMap.get(cityKey);
          cityId = cityData?.id || null;

          if (!cityId) {
            let { data: newCity, error: createCityError } = await supabase
              .from('cities')
              .insert({ state_id: stateId, name: subAccountData.city.trim() })
              .select('id')
              .single();

            if (createCityError) {
              const { data: newCity2, error: createCityError2 } = await supabase
                .from('cities')
                .insert({ state_id: stateId, city_name: subAccountData.city.trim() })
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
          .eq('sub_account_name', subAccountData.sub_account_name)
          .maybeSingle();

        let subAccountId: number;

        if (existingSubAccount) {
          const updateData: any = {
            address: subAccountData.address || null,
            pincode: subAccountData.pin_code || null,
          };
          if (stateId) updateData.state_id = stateId;
          if (cityId) updateData.city_id = cityId;
          if (subAccountData.office_type) updateData.office_type = subAccountData.office_type;

          await supabase
            .from('sub_accounts')
            .update(updateData)
            .eq('id', existingSubAccount.id);

          subAccountId = existingSubAccount.id;
          subAccountsUpdated++;
        } else {
          const insertData: any = {
            account_id: accountId,
            sub_account_name: subAccountData.sub_account_name,
            state_id: stateId,
            city_id: cityId,
            address: subAccountData.address || null,
            pincode: subAccountData.pin_code || null,
            is_active: true,
          };

          if (subAccountData.office_type) {
            insertData.office_type = subAccountData.office_type;
          }

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

        // Process contacts
        for (const contactData of subAccountData.contacts) {
          if (!contactData.name) continue;

          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .eq('sub_account_id', subAccountId)
            .ilike('name', contactData.name.trim())
            .maybeSingle();

          if (!existingContact) {
            const { error: contactError } = await supabase
              .from('contacts')
              .insert({
                sub_account_id: subAccountId,
                account_id: accountId,
                name: contactData.name.trim(),
                phone: contactData.phone || null,
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
  console.log(`✅ Sub-Accounts: ${subAccountsCreated} created, ${subAccountsUpdated} updated (Total: ${totalSubAccounts})`);
  console.log(`✅ Contacts: ${contactsCreated} created (Total: ${totalContacts})`);
  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length}`);
    errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
  }
  console.log('='.repeat(60));
  console.log('\n✨ Import complete! Data is now visible in database and frontend.\n');
}

// Run import
importFinalThirdDatabase().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

