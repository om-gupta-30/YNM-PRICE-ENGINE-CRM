import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env.local file manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ExcelRow {
  id?: number;
  account_name?: string;
  company_stage?: string;
  company_tag?: string;
  industry?: string;
  'sub industry'?: string;
  subaccount?: string;
  address?: string;
  'state '?: string;
  city?: string;
  pincode?: number | string;
  'contact name '?: string;
  'contact number'?: number | string;
  desigation?: string;
  email?: string;
}

async function importData() {
  console.log('📖 Reading database1.xlsx...');
  
  const workbook = XLSX.readFile(path.resolve(__dirname, '../database1.xlsx'));
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

  console.log(`📊 Found ${rows.length} rows`);

  // Process and group by account
  interface ProcessedAccount {
    account_name: string;
    company_stage: string | null;
    company_tag: string | null;
    industry: string | null;
    sub_industry: string | null;
    sub_accounts: Array<{
      sub_account_name: string;
      address: string | null;
      state: string | null;
      city: string | null;
      pincode: string | null;
      contacts: Array<{
        name: string;
        phone: string | null;
        designation: string | null;
        email: string | null;
      }>;
    }>;
  }

  const accountMap = new Map<string, ProcessedAccount>();
  let currentAccount: ProcessedAccount | null = null;
  let currentSubAccount: ProcessedAccount['sub_accounts'][0] | null = null;

  for (const row of rows) {
    const accountName = row.account_name?.toString().trim();
    const subAccountName = row.subaccount?.toString().trim();
    const contactName = row['contact name ']?.toString().trim().replace(/[\r\n]+/g, ' ');

    // If this row has an account name, it's a new account
    if (accountName) {
      if (!accountMap.has(accountName)) {
        accountMap.set(accountName, {
          account_name: accountName,
          company_stage: row.company_stage?.toString().trim() || null,
          company_tag: row.company_tag?.toString().trim() || null,
          industry: row.industry?.toString().trim() || null,
          sub_industry: row['sub industry']?.toString().trim() || null,
          sub_accounts: [],
        });
      }
      currentAccount = accountMap.get(accountName)!;

      // Process sub-account
      if (subAccountName) {
        let subAccount = currentAccount.sub_accounts.find(sa => sa.sub_account_name === subAccountName);
        if (!subAccount) {
          subAccount = {
            sub_account_name: subAccountName,
            address: row.address?.toString().trim() || null,
            state: row['state ']?.toString().trim() || null,
            city: row.city?.toString().trim() || null,
            pincode: row.pincode ? String(row.pincode).trim() : null,
            contacts: [],
          };
          currentAccount.sub_accounts.push(subAccount);
        }
        currentSubAccount = subAccount;

        // Add contact if present
        if (contactName) {
          subAccount.contacts.push({
            name: contactName,
            phone: row['contact number'] ? String(row['contact number']).trim() : null,
            designation: row.desigation?.toString().trim() || null,
            email: row.email?.toString().trim().replace(/[\r\n]+/g, '') || null,
          });
        }
      }
    } else if (contactName && currentSubAccount) {
      // This is an additional contact for the current sub-account
      currentSubAccount.contacts.push({
        name: contactName,
        phone: row['contact number'] ? String(row['contact number']).trim() : null,
        designation: row.desigation?.toString().trim() || null,
        email: row.email?.toString().trim().replace(/[\r\n]+/g, '') || null,
      });
    }
  }

  console.log(`📦 Processed ${accountMap.size} accounts`);

  // Get existing states and cities
  const { data: states } = await supabase.from('states').select('id, state_name, name');
  const { data: cities } = await supabase.from('cities').select('id, city_name, name, state_id');

  const stateMap = new Map<string, number>();
  (states || []).forEach(s => {
    const name = (s.state_name || s.name || '').toLowerCase().trim();
    if (name) stateMap.set(name, s.id);
  });

  const cityMap = new Map<string, number>();
  (cities || []).forEach(c => {
    const name = (c.city_name || c.name || '').toLowerCase().trim();
    if (name && c.state_id) cityMap.set(`${name}_${c.state_id}`, c.id);
  });

  // Import data
  let accountsCreated = 0, accountsUpdated = 0;
  let subAccountsCreated = 0, subAccountsUpdated = 0;
  let contactsCreated = 0;

  for (const accountData of accountMap.values()) {
    try {
      // Find or create account
      let { data: existingAccount } = await supabase
        .from('accounts')
        .select('id')
        .eq('account_name', accountData.account_name)
        .maybeSingle();

      let accountId: number;

      if (existingAccount) {
        accountId = existingAccount.id;
        await supabase.from('accounts').update({
          company_stage: accountData.company_stage,
          company_tag: accountData.company_tag,
        }).eq('id', accountId);
        accountsUpdated++;
        console.log(`✅ Updated account: ${accountData.account_name}`);
      } else {
        const { data: newAccount, error } = await supabase
          .from('accounts')
          .insert({
            account_name: accountData.account_name,
            company_stage: accountData.company_stage,
            company_tag: accountData.company_tag,
            assigned_employee: 'system',
          })
          .select('id')
          .single();

        if (error) throw error;
        accountId = newAccount.id;
        accountsCreated++;
        console.log(`🆕 Created account: ${accountData.account_name}`);
      }

      // Process sub-accounts
      for (const subAccountData of accountData.sub_accounts) {
        // Find state ID
        let stateId: number | null = null;
        if (subAccountData.state) {
          const stateName = subAccountData.state.toLowerCase().trim();
          stateId = stateMap.get(stateName) || null;

          if (!stateId) {
            const { data: newState } = await supabase
              .from('states')
              .insert({ state_name: subAccountData.state, name: subAccountData.state })
              .select('id')
              .single();
            if (newState) {
              stateId = newState.id;
              stateMap.set(stateName, stateId);
            }
          }
        }

        // Find city ID
        let cityId: number | null = null;
        if (subAccountData.city && stateId) {
          const cityName = subAccountData.city.toLowerCase().trim();
          cityId = cityMap.get(`${cityName}_${stateId}`) || null;

          if (!cityId) {
            const { data: newCity } = await supabase
              .from('cities')
              .insert({ state_id: stateId, city_name: subAccountData.city, name: subAccountData.city })
              .select('id')
              .single();
            if (newCity) {
              cityId = newCity.id;
              cityMap.set(`${cityName}_${stateId}`, cityId);
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
          subAccountId = existingSubAccount.id;
          await supabase.from('sub_accounts').update({
            address: subAccountData.address,
            state_id: stateId,
            city_id: cityId,
            pincode: subAccountData.pincode,
          }).eq('id', subAccountId);
          subAccountsUpdated++;
        } else {
          const { data: newSubAccount, error } = await supabase
            .from('sub_accounts')
            .insert({
              account_id: accountId,
              sub_account_name: subAccountData.sub_account_name,
              address: subAccountData.address,
              state_id: stateId,
              city_id: cityId,
              pincode: subAccountData.pincode,
              assigned_employee: 'system',
              is_active: true,
            })
            .select('id')
            .single();

          if (error) throw error;
          subAccountId = newSubAccount.id;
          subAccountsCreated++;
        }

        // Create contacts
        for (const contactData of subAccountData.contacts) {
          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .eq('sub_account_id', subAccountId)
            .eq('name', contactData.name)
            .maybeSingle();

          if (!existingContact) {
            await supabase.from('contacts').insert({
              account_id: accountId,
              sub_account_id: subAccountId,
              name: contactData.name,
              phone: contactData.phone,
              email: contactData.email,
              designation: contactData.designation,
              created_by: 'system',
            });
            contactsCreated++;
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${accountData.account_name}:`, error.message);
    }
  }

  console.log('\n=== IMPORT COMPLETE ===');
  console.log(`Accounts: ${accountsCreated} created, ${accountsUpdated} updated`);
  console.log(`Sub-Accounts: ${subAccountsCreated} created, ${subAccountsUpdated} updated`);
  console.log(`Contacts: ${contactsCreated} created`);
}

importData().catch(console.error);
