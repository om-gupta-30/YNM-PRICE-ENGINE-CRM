/**
 * Import All Databases Script
 * 
 * This script imports data from database1.xlsx, database2.xlsx, database3.xlsx, and database4.xlsx
 * into the Supabase database.
 * 
 * Run with: npx ts-node --esm scripts/import-all-databases.ts
 * Or: npx tsx scripts/import-all-databases.ts
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env.local file
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseServiceKey = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
  supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || '';
  supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || '';
} catch (e) {
  console.error('Could not read .env.local file');
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ExcelRow {
  [key: string]: any;
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
  pincode: string | null;
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
  return String(value).trim().replace(/[\r\n]+/g, ' ') || null;
}

// Normalize company_tag to match enum values
function normalizeCompanyTag(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  const tagMap: Record<string, string> = {
    'new': 'New',
    'prospect': 'Prospect',
    'customer': 'Customer',
    'onboard': 'Onboard',
    'lapsed': 'Lapsed',
  };
  return tagMap[normalized] || null;
}

// Normalize company_stage to match enum values
function normalizeCompanyStage(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  const stageMap: Record<string, string> = {
    'startup': 'Startup',
    'sme': 'SME',
    'enterprise': 'Enterprise',
    'corporate': 'Corporate',
    'mnc': 'MNC',
  };
  return stageMap[normalized] || null;
}

function getValue(row: ExcelRow, possibleNames: string[]): string | null {
  // First try exact match
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return cleanString(row[name]);
    }
  }
  
  // Then try case-insensitive match with trimmed keys
  const rowKeys = Object.keys(row);
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().trim();
    for (const key of rowKeys) {
      if (key.toLowerCase().trim() === normalizedName) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return cleanString(row[key]);
        }
      }
    }
  }
  
  return null;
}

async function importAllDatabases() {
  console.log('🚀 Starting import of all database files...\n');

  const baseDir = process.cwd();
  const fileNames = ['database1.xlsx', 'database2.xlsx', 'database3.xlsx', 'database4.xlsx'];
  
  const allAccounts = new Map<string, ProcessedAccount>();
  let totalRowsProcessed = 0;

  // Read and process all Excel files
  for (const fileName of fileNames) {
    const filePath = path.join(baseDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${fileName}`);
      continue;
    }

    console.log(`📖 Reading ${fileName}...`);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`   📊 Found ${rows.length} rows`);

    let currentAccount: ProcessedAccount | null = null;
    let currentSubAccount: ProcessedSubAccount | null = null;

    for (const row of rows) {
      const accountName = getValue(row, ['account_name', 'Account Name', 'Account_Name', 'account name']);
      const subAccountName = getValue(row, ['subaccount', 'sub_account', 'Sub Account', 'SubAccount', 'sub account', 'Subaccount']);
      const contactName = getValue(row, ['contact name ', 'contact_name', 'Contact Name', 'contact name', 'contact_name ']);

      if (accountName) {
        if (!allAccounts.has(accountName)) {
          allAccounts.set(accountName, {
            account_name: accountName,
            company_stage: normalizeCompanyStage(getValue(row, ['company_stage', 'Company Stage', 'company stage'])),
            company_tag: normalizeCompanyTag(getValue(row, ['company_tag', 'Company Tag', 'company tag'])),
            industry: getValue(row, ['industry', 'Industry']),
            sub_industry: getValue(row, ['sub industry', 'sub_industry', 'Sub Industry']),
            sub_accounts: [],
          });
        }
        currentAccount = allAccounts.get(accountName)!;

        const newStage = normalizeCompanyStage(getValue(row, ['company_stage', 'Company Stage']));
        const newTag = normalizeCompanyTag(getValue(row, ['company_tag', 'Company Tag']));
        const newIndustry = getValue(row, ['industry', 'Industry']);
        const newSubIndustry = getValue(row, ['sub industry', 'sub_industry']);
        
        if (newStage) currentAccount.company_stage = newStage;
        if (newTag) currentAccount.company_tag = newTag;
        if (newIndustry) currentAccount.industry = newIndustry;
        if (newSubIndustry) currentAccount.sub_industry = newSubIndustry;
      }

      if (subAccountName && currentAccount) {
        let subAccount = currentAccount.sub_accounts.find(sa => sa.sub_account_name === subAccountName);
        
        if (!subAccount) {
          subAccount = {
            sub_account_name: subAccountName,
            office_type: getValue(row, ['office_type', 'Office Type', 'office type']),
            address: getValue(row, ['address', 'Address']),
            state: getValue(row, ['state ', 'state', 'State']),
            city: getValue(row, ['city', 'City']),
            pincode: getValue(row, ['pincode', 'Pincode', 'pin_code']),
            contacts: [],
          };
          currentAccount.sub_accounts.push(subAccount);
        }
        
        currentSubAccount = subAccount;

        if (contactName) {
          const existingContact = subAccount.contacts.find(c => c.name === contactName);
          if (!existingContact) {
            const contactPhone = getValue(row, ['contact number', 'contact_number', 'Contact Number', 'phone', 'Phone', 'PHONE', 'contact number ']);
            const contactDesignation = getValue(row, ['desigation', 'designation', 'Designation', 'DESIGNATION']);
            const contactEmail = getValue(row, ['email', 'Email', 'EMAIL', 'e-mail']);
            
            subAccount.contacts.push({
              name: contactName,
              phone: contactPhone,
              designation: contactDesignation,
              email: contactEmail,
            });
          }
        }
      } else if (contactName && currentSubAccount) {
        const existingContact = currentSubAccount.contacts.find(c => c.name === contactName);
        if (!existingContact) {
          currentSubAccount.contacts.push({
            name: contactName,
            phone: getValue(row, ['contact number', 'contact_number', 'Contact Number', 'phone', 'Phone', 'PHONE', 'contact number ']),
            designation: getValue(row, ['desigation', 'designation', 'Designation', 'DESIGNATION']),
            email: getValue(row, ['email', 'Email', 'EMAIL', 'e-mail']),
          });
        }
      }

      totalRowsProcessed++;
    }
  }

  // Count total contacts found
  let totalContactsFound = 0;
  let totalSubAccountsFound = 0;
  for (const account of allAccounts.values()) {
    totalSubAccountsFound += account.sub_accounts.length;
    for (const sa of account.sub_accounts) {
      totalContactsFound += sa.contacts.length;
    }
  }
  
  console.log(`\n📦 Total unique accounts: ${allAccounts.size}`);
  console.log(`📦 Total sub-accounts: ${totalSubAccountsFound}`);
  console.log(`📦 Total contacts found in Excel: ${totalContactsFound}`);

  // Get reference data
  console.log('\n📚 Loading reference data...');
  
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

  console.log(`   States: ${states?.length || 0}, Cities: ${cities?.length || 0}`);
  console.log(`   Industries: ${industries?.length || 0}, Sub-Industries: ${subIndustries?.length || 0}`);

  // Import data
  console.log('\n💾 Importing data to database...\n');

  let accountsCreated = 0;
  let accountsUpdated = 0;
  let subAccountsCreated = 0;
  let subAccountsUpdated = 0;
  let contactsCreated = 0;
  let errorCount = 0;

  let processed = 0;
  const total = allAccounts.size;

  for (const accountData of allAccounts.values()) {
    processed++;
    
    try {
      // Find or create account
      let { data: existingAccount } = await supabase
        .from('accounts')
        .select('id')
        .eq('account_name', accountData.account_name)
        .maybeSingle();

      let accountId: number;

      if (existingAccount) {
        await supabase
          .from('accounts')
          .update({
            company_stage: accountData.company_stage,
            company_tag: accountData.company_tag,
          })
          .eq('id', existingAccount.id);

        accountId = existingAccount.id;
        accountsUpdated++;
      } else {
        const { data: newAccount, error: insertError } = await supabase
          .from('accounts')
          .insert({
            account_name: accountData.account_name,
            company_stage: accountData.company_stage,
            company_tag: accountData.company_tag,
            assigned_to: null, // Unassigned
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        accountId = newAccount.id;
        accountsCreated++;
      }

        // Handle industry - update the industries array in accounts table
        if (accountData.industry || accountData.sub_industry) {
          let industryId: number | null = null;
          let subIndustryId: number | null = null;
          let matchedIndustryName = accountData.industry;
          let matchedSubIndustryName = accountData.sub_industry;

          // Try to find industry
          if (accountData.industry) {
            const industryName = accountData.industry.toLowerCase().trim();
            industryId = industryMap.get(industryName) || null;
            
            // Try partial match if exact match failed
            if (!industryId) {
              for (const [key, id] of industryMap.entries()) {
                if (key.includes(industryName) || industryName.includes(key)) {
                  industryId = id;
                  break;
                }
              }
            }
          }

          // Try to find sub-industry
          if (accountData.sub_industry) {
            const subIndustryName = accountData.sub_industry.toLowerCase().trim();
            const subIndData = subIndustryMap.get(subIndustryName);
            if (subIndData) {
              subIndustryId = subIndData.id;
              if (!industryId) {
                industryId = subIndData.industry_id;
              }
            } else {
              // Try partial match
              for (const [key, data] of subIndustryMap.entries()) {
                if (key.includes(subIndustryName) || subIndustryName.includes(key)) {
                  subIndustryId = data.id;
                  if (!industryId) {
                    industryId = data.industry_id;
                  }
                  break;
                }
              }
            }
          }

          // Update the industries array in accounts table
          if (industryId || subIndustryId) {
            const industriesArray = [];
            
            if (industryId && subIndustryId) {
              industriesArray.push({
                industryId: industryId,
                industryName: matchedIndustryName || 'Unknown',
                subIndustryId: subIndustryId,
                subIndustryName: matchedSubIndustryName || 'Unknown',
              });
            } else if (industryId) {
              industriesArray.push({
                industryId: industryId,
                industryName: matchedIndustryName || 'Unknown',
              });
            }
            
            const { error: indError } = await supabase
              .from('accounts')
              .update({ industries: industriesArray })
              .eq('id', accountId);
            
            if (indError) {
              console.error(`\n   ⚠️  Industry update error for ${accountData.account_name}:`, indError.message);
            }
          }
        }

      // Process sub-accounts
      for (const subAccountData of accountData.sub_accounts) {
        let stateId: number | null = null;
        let cityId: number | null = null;

        if (subAccountData.state) {
          stateId = stateMap.get(subAccountData.state.toLowerCase().trim()) || null;
        }

        if (subAccountData.city && stateId) {
          const cityName = subAccountData.city.toLowerCase().trim();
          const cityKey = `${cityName}_${stateId}`;
          cityId = cityMap.get(cityKey)?.id || null;
          
          // If city doesn't exist, create it
          if (!cityId) {
            const { data: newCity, error: cityError } = await supabase
              .from('cities')
              .insert({
                state_id: stateId,
                city_name: subAccountData.city,
              })
              .select('id')
              .single();
            
            if (!cityError && newCity) {
              cityId = newCity.id;
              cityMap.set(cityKey, { id: cityId, state_id: stateId });
              console.log(`\n   🏙️  Created new city: ${subAccountData.city}`);
            }
          }
        }

        let { data: existingSubAccount } = await supabase
          .from('sub_accounts')
          .select('id')
          .eq('account_id', accountId)
          .eq('sub_account_name', subAccountData.sub_account_name)
          .maybeSingle();

        let subAccountId: number;

        if (existingSubAccount) {
          await supabase
            .from('sub_accounts')
            .update({
              office_type: 'Headquarter', // All sub-accounts are headquarters
              address: subAccountData.address,
              state_id: stateId,
              city_id: cityId,
              pincode: subAccountData.pincode,
              is_headquarter: true, // All sub-accounts are headquarters
            })
            .eq('id', existingSubAccount.id);

          subAccountId = existingSubAccount.id;
          subAccountsUpdated++;
        } else {
          const { data: newSubAccount, error: insertError } = await supabase
            .from('sub_accounts')
            .insert({
              account_id: accountId,
              sub_account_name: subAccountData.sub_account_name,
              office_type: 'Headquarter', // All sub-accounts are headquarters
              address: subAccountData.address,
              state_id: stateId,
              city_id: cityId,
              pincode: subAccountData.pincode,
              is_active: true,
              is_headquarter: true, // All sub-accounts are headquarters
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          subAccountId = newSubAccount.id;
          subAccountsCreated++;
        }

        // Process contacts
        for (const contactData of subAccountData.contacts) {
          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .eq('sub_account_id', subAccountId)
            .eq('name', contactData.name)
            .maybeSingle();

          if (!existingContact) {
            const { data: newContact, error: contactError } = await supabase
              .from('contacts')
              .insert({
                sub_account_id: subAccountId,
                account_id: accountId,
                name: contactData.name,
                phone: contactData.phone,
                email: contactData.email,
                designation: contactData.designation,
                created_by: 'system', // Required field
              })
              .select('id')
              .single();

            if (contactError) {
              console.error(`\n   ❌ Contact error for "${contactData.name}":`, contactError.message);
            } else {
              contactsCreated++;
            }
          }
        }
      }

      // Progress indicator
      if (processed % 10 === 0 || processed === total) {
        process.stdout.write(`\r   Progress: ${processed}/${total} accounts (${Math.round(processed/total*100)}%)`);
      }

    } catch (error: any) {
      errorCount++;
      console.error(`\n❌ Error processing ${accountData.account_name}:`, error.message);
    }
  }

  console.log('\n\n========================================');
  console.log('         IMPORT COMPLETE');
  console.log('========================================');
  console.log(`✅ Accounts:     ${accountsCreated} created, ${accountsUpdated} updated`);
  console.log(`✅ Sub-Accounts: ${subAccountsCreated} created, ${subAccountsUpdated} updated`);
  console.log(`✅ Contacts:     ${contactsCreated} created`);
  if (errorCount > 0) {
    console.log(`⚠️  Errors:       ${errorCount}`);
  }
  console.log('========================================\n');
}

importAllDatabases().catch(console.error);
