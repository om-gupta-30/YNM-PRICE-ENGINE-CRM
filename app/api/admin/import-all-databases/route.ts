import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

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

// Helper to clean and normalize strings
function cleanString(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim().replace(/[\r\n]+/g, ' ') || null;
}

// Helper to get value from row with multiple possible column names
function getValue(row: ExcelRow, possibleNames: string[]): string | null {
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return cleanString(row[name]);
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Find all database Excel files
    const baseDir = process.cwd();
    const fileNames = ['database1.xlsx', 'database2.xlsx', 'database3.xlsx', 'database4.xlsx'];
    
    const allAccounts = new Map<string, ProcessedAccount>();
    let totalRowsProcessed = 0;
    const fileResults: Record<string, { rows: number; accounts: number }> = {};

    for (const fileName of fileNames) {
      const filePath = path.join(baseDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ File not found: ${fileName}`);
        fileResults[fileName] = { rows: 0, accounts: 0 };
        continue;
      }

      console.log(`📖 Reading ${fileName}...`);
      
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

      console.log(`📊 Found ${rows.length} rows in ${fileName}`);
      if (rows.length > 0) {
        console.log('Column names:', Object.keys(rows[0]));
      }

      let currentAccount: ProcessedAccount | null = null;
      let currentSubAccount: ProcessedSubAccount | null = null;
      let accountsInFile = 0;

      for (const row of rows) {
        // Try to get account name from various possible column names
        const accountName = getValue(row, ['account_name', 'Account Name', 'Account_Name', 'account name', 'ACCOUNT_NAME']);
        const subAccountName = getValue(row, ['subaccount', 'sub_account', 'Sub Account', 'SubAccount', 'sub account', 'Subaccount', 'SUBACCOUNT']);
        const contactName = getValue(row, ['contact name ', 'contact_name', 'Contact Name', 'contact name', 'ContactName', 'CONTACT_NAME', 'contact_name ']);

        // If we have an account name, start/continue with that account
        if (accountName) {
          if (!allAccounts.has(accountName)) {
            allAccounts.set(accountName, {
              account_name: accountName,
              company_stage: getValue(row, ['company_stage', 'Company Stage', 'company stage', 'CompanyStage']),
              company_tag: getValue(row, ['company_tag', 'Company Tag', 'company tag', 'CompanyTag']),
              industry: getValue(row, ['industry', 'Industry', 'INDUSTRY']),
              sub_industry: getValue(row, ['sub industry', 'sub_industry', 'Sub Industry', 'SubIndustry', 'SUB_INDUSTRY']),
              sub_accounts: [],
            });
            accountsInFile++;
          }
          currentAccount = allAccounts.get(accountName)!;

          // Update account-level fields if they have values
          const newStage = getValue(row, ['company_stage', 'Company Stage', 'company stage']);
          const newTag = getValue(row, ['company_tag', 'Company Tag', 'company tag']);
          const newIndustry = getValue(row, ['industry', 'Industry']);
          const newSubIndustry = getValue(row, ['sub industry', 'sub_industry', 'Sub Industry']);
          
          if (newStage) currentAccount.company_stage = newStage;
          if (newTag) currentAccount.company_tag = newTag;
          if (newIndustry) currentAccount.industry = newIndustry;
          if (newSubIndustry) currentAccount.sub_industry = newSubIndustry;
        }

        // Process sub-account if we have one and a current account
        if (subAccountName && currentAccount) {
          let subAccount = currentAccount.sub_accounts.find(sa => sa.sub_account_name === subAccountName);
          
          if (!subAccount) {
            subAccount = {
              sub_account_name: subAccountName,
              office_type: getValue(row, ['office_type', 'Office Type', 'office type', 'OfficeType', 'OFFICE_TYPE']),
              address: getValue(row, ['address', 'Address', 'ADDRESS']),
              state: getValue(row, ['state ', 'state', 'State', 'STATE']),
              city: getValue(row, ['city', 'City', 'CITY']),
              pincode: getValue(row, ['pincode', 'Pincode', 'PINCODE', 'pin_code', 'Pin Code']),
              contacts: [],
            };
            currentAccount.sub_accounts.push(subAccount);
          } else {
            // Update sub-account fields if they have values
            const newOfficeType = getValue(row, ['office_type', 'Office Type', 'office type']);
            const newAddress = getValue(row, ['address', 'Address']);
            const newState = getValue(row, ['state ', 'state', 'State']);
            const newCity = getValue(row, ['city', 'City']);
            const newPincode = getValue(row, ['pincode', 'Pincode', 'pin_code']);
            
            if (newOfficeType) subAccount.office_type = newOfficeType;
            if (newAddress) subAccount.address = newAddress;
            if (newState) subAccount.state = newState;
            if (newCity) subAccount.city = newCity;
            if (newPincode) subAccount.pincode = newPincode;
          }
          
          currentSubAccount = subAccount;

          // Add contact if present
          if (contactName) {
            // Check if this contact already exists for this sub-account
            const existingContact = subAccount.contacts.find(c => c.name === contactName);
            if (!existingContact) {
              subAccount.contacts.push({
                name: contactName,
                phone: getValue(row, ['contact number', 'contact_number', 'Contact Number', 'phone', 'Phone', 'PHONE']),
                designation: getValue(row, ['desigation', 'designation', 'Designation', 'DESIGNATION']), // Note: typo in Excel
                email: getValue(row, ['email', 'Email', 'EMAIL']),
              });
            }
          }
        } else if (contactName && currentSubAccount) {
          // This is an additional contact row for the current sub-account
          const existingContact = currentSubAccount.contacts.find(c => c.name === contactName);
          if (!existingContact) {
            currentSubAccount.contacts.push({
              name: contactName,
              phone: getValue(row, ['contact number', 'contact_number', 'Contact Number', 'phone', 'Phone']),
              designation: getValue(row, ['desigation', 'designation', 'Designation']),
              email: getValue(row, ['email', 'Email']),
            });
          }
        }

        totalRowsProcessed++;
      }

      fileResults[fileName] = { rows: rows.length, accounts: accountsInFile };
    }

    console.log(`📦 Total unique accounts: ${allAccounts.size}`);

    // Get existing reference data
    const { data: industries } = await supabase.from('industries').select('id, name');
    const { data: subIndustries } = await supabase.from('sub_industries').select('id, name, industry_id');
    const { data: states } = await supabase.from('states').select('id, state_name');
    const { data: cities } = await supabase.from('cities').select('id, city_name, state_id');

    // Build lookup maps
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

    // Import data
    let accountsCreated = 0;
    let accountsUpdated = 0;
    let subAccountsCreated = 0;
    let subAccountsUpdated = 0;
    let contactsCreated = 0;
    const errors: string[] = [];

    for (const accountData of allAccounts.values()) {
      try {
        // Find or create account
        let { data: existingAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('account_name', accountData.account_name)
          .maybeSingle();

        let accountId: number;

        if (existingAccount) {
          // Update existing account
          const { error: updateError } = await supabase
            .from('accounts')
            .update({
              company_stage: accountData.company_stage,
              company_tag: accountData.company_tag,
            })
            .eq('id', existingAccount.id);

          if (updateError) throw updateError;
          accountId = existingAccount.id;
          accountsUpdated++;
        } else {
          // Create new account (assigned_to is NULL = unassigned)
          const { data: newAccount, error: insertError } = await supabase
            .from('accounts')
            .insert({
              account_name: accountData.account_name,
              company_stage: accountData.company_stage,
              company_tag: accountData.company_tag,
              assigned_to: null, // Unassigned - will show in Admin portal
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          accountId = newAccount.id;
          accountsCreated++;
        }

        // Handle industry association
        if (accountData.industry && accountData.sub_industry) {
          const industryName = accountData.industry.toLowerCase().trim();
          const subIndustryName = accountData.sub_industry.toLowerCase().trim();
          const industryId = industryMap.get(industryName);
          const subIndustryData = subIndustryMap.get(subIndustryName);

          if (industryId && subIndustryData) {
            // Check if this industry combination already exists
            const { data: existingIndustry } = await supabase
              .from('account_industries')
              .select('id')
              .eq('account_id', accountId)
              .eq('industry_id', industryId)
              .eq('sub_industry_id', subIndustryData.id)
              .maybeSingle();

            if (!existingIndustry) {
              await supabase.from('account_industries').insert({
                account_id: accountId,
                industry_id: industryId,
                industry_name: accountData.industry,
                sub_industry_id: subIndustryData.id,
                sub_industry_name: accountData.sub_industry,
              });
            }
          }
        }

        // Process sub-accounts
        for (const subAccountData of accountData.sub_accounts) {
          // Find state and city IDs
          let stateId: number | null = null;
          let cityId: number | null = null;

          if (subAccountData.state) {
            const stateName = subAccountData.state.toLowerCase().trim();
            stateId = stateMap.get(stateName) || null;
          }

          if (subAccountData.city && stateId) {
            const cityName = subAccountData.city.toLowerCase().trim();
            const cityKey = `${cityName}_${stateId}`;
            const cityData = cityMap.get(cityKey);
            cityId = cityData?.id || null;
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
            // Update existing sub-account
            const { error: updateError } = await supabase
              .from('sub_accounts')
              .update({
                office_type: subAccountData.office_type,
                address: subAccountData.address,
                state_id: stateId,
                city_id: cityId,
                pincode: subAccountData.pincode,
              })
              .eq('id', existingSubAccount.id);

            if (updateError) throw updateError;
            subAccountId = existingSubAccount.id;
            subAccountsUpdated++;
          } else {
            // Create new sub-account
            const { data: newSubAccount, error: insertError } = await supabase
              .from('sub_accounts')
              .insert({
                account_id: accountId,
                sub_account_name: subAccountData.sub_account_name,
                office_type: subAccountData.office_type,
                address: subAccountData.address,
                state_id: stateId,
                city_id: cityId,
                pincode: subAccountData.pincode,
                is_active: true,
              })
              .select('id')
              .single();

            if (insertError) throw insertError;
            subAccountId = newSubAccount.id;
            subAccountsCreated++;
          }

          // Process contacts
          for (const contactData of subAccountData.contacts) {
            // Check if contact already exists
            const { data: existingContact } = await supabase
              .from('contacts')
              .select('id')
              .eq('sub_account_id', subAccountId)
              .eq('name', contactData.name)
              .maybeSingle();

            if (!existingContact) {
              const { error: contactError } = await supabase
                .from('contacts')
                .insert({
                  sub_account_id: subAccountId,
                  account_id: accountId,
                  name: contactData.name,
                  phone: contactData.phone,
                  email: contactData.email,
                  designation: contactData.designation,
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

    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`Accounts: ${accountsCreated} created, ${accountsUpdated} updated`);
    console.log(`Sub-Accounts: ${subAccountsCreated} created, ${subAccountsUpdated} updated`);
    console.log(`Contacts: ${contactsCreated} created`);

    return NextResponse.json({
      success: true,
      summary: {
        totalRowsProcessed,
        totalUniqueAccounts: allAccounts.size,
        accountsCreated,
        accountsUpdated,
        subAccountsCreated,
        subAccountsUpdated,
        contactsCreated,
        fileResults,
      },
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET() {
  const baseDir = process.cwd();
  const fileNames = ['database1.xlsx', 'database2.xlsx', 'database3.xlsx', 'database4.xlsx'];
  
  const fileStatus = fileNames.map(fileName => ({
    name: fileName,
    exists: fs.existsSync(path.join(baseDir, fileName)),
    path: path.join(baseDir, fileName),
  }));

  return NextResponse.json({
    message: 'Import API ready. Send POST request to import all Excel files.',
    files: fileStatus,
  });
}
