import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface ExcelRow {
  account_name?: string | null;
  company_stage?: string | null;
  company_tag?: string | null;
  industres?: string | null; // Note: typo in Excel column name
  sub_industries?: string | null;
  sub_accounts?: string | null;
  'office_type '?: string | null;
  address?: string | null;
  'state '?: string | null; // Note: trailing space in Excel
  city?: string | null;
  Pincode?: string | number | null;
  'contact name '?: string | null; // Note: trailing space in Excel
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

// Helper to clean and normalize strings
function cleanString(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ') || null;
}

// Helper to normalize contact name (handle multiple contacts separated by newlines/slashes)
function normalizeContactName(value: any): string[] {
  if (value === null || value === undefined || value === '') return [];
  const str = String(value).trim();
  if (!str) return [];
  
  // Split by newline, slash, or comma
  const contacts = str
    .split(/[\r\n\/,]+/)
    .map(c => c.trim())
    .filter(c => c.length > 0);
  
  return contacts;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Find the Excel file
    const fileName = 'finalthirddatabase.xlsx';
    const possiblePaths = [
      path.resolve(process.cwd(), fileName),
      path.resolve(__dirname, '../../../', fileName),
      path.resolve(process.cwd(), '..', fileName),
      '/Users/omg/Desktop/price engine ysm/' + fileName,
    ];

    let excelFilePath: string | null = null;
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          excelFilePath = filePath;
          console.log(`✅ Found Excel file at: ${filePath}`);
          break;
        }
      } catch (err) {
        console.log(`⚠️ Could not check path: ${filePath}`, err);
      }
    }

    if (!excelFilePath) {
      return NextResponse.json(
        { 
          error: 'Excel file not found: finalthirddatabase.xlsx',
          message: 'Tried paths: ' + possiblePaths.join(', '),
        },
        { status: 404 }
      );
    }

    // Read Excel file
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.readFile(excelFilePath);
    } catch (fileError: any) {
      return NextResponse.json(
        { error: 'Error reading Excel file: ' + fileError.message },
        { status: 500 }
      );
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Excel file is empty' },
        { status: 400 }
      );
    }

    console.log(`📊 Found ${rows.length} rows in Excel file`);

    // Process rows and group by unique account and account/sub-account pairs
    // This ensures we get 117 unique accounts and 117 unique sub-accounts
    const accountMap = new Map<string, ProcessedAccount>();
    let currentAccountKey: string | null = null;
    let currentSubAccountKey: string | null = null;

    for (const row of rows) {
      const accountName = cleanString(row.account_name);
      const subAccountName = cleanString(row.sub_accounts) || accountName; // Use account name as fallback
      const contactNameRaw = row['contact name '];

      // If this row has account_name, it's a new account/sub-account
      if (accountName) {
        const key = `${accountName}|||${subAccountName}`;
        currentAccountKey = accountName;
        currentSubAccountKey = key;

        // Create or get account
        if (!accountMap.has(accountName)) {
          accountMap.set(accountName, {
            account_name: accountName,
            company_stage: cleanString(row.company_stage),
            company_tag: cleanString(row.company_tag),
            industry: cleanString(row.industres), // Note: typo in Excel column
            sub_industry: cleanString(row.sub_industries),
            sub_accounts: [],
          });
        }

        const account = accountMap.get(accountName)!;
        
        // Update account-level fields if they exist
        if (row.company_stage) account.company_stage = cleanString(row.company_stage);
        if (row.company_tag) account.company_tag = cleanString(row.company_tag);
        if (row.industres) account.industry = cleanString(row.industres);
        if (row.sub_industries) account.sub_industry = cleanString(row.sub_industries);

        // Find or create sub-account (only create if it doesn't exist)
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
          // Update sub-account fields if they exist and are not already set
          if (row['office_type '] && !subAccount.office_type) subAccount.office_type = cleanString(row['office_type ']);
          if (row.address && !subAccount.address) subAccount.address = cleanString(row.address);
          if (row['state '] && !subAccount.state) subAccount.state = cleanString(row['state ']);
          if (row.city && !subAccount.city) subAccount.city = cleanString(row.city);
          if (row.Pincode && !subAccount.pin_code) subAccount.pin_code = String(row.Pincode).trim();
        }

        // Process contact if present in this row
        if (contactNameRaw) {
          const contactNames = normalizeContactName(contactNameRaw);
          for (const contactName of contactNames) {
            if (contactName) {
              // Check if this contact already exists (case-insensitive)
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
                // Merge contact data (prefer non-null values)
                if (row['phone '] && !existingContact.phone) existingContact.phone = String(row['phone ']).trim();
                if (row.email && !existingContact.email) existingContact.email = cleanString(row.email);
                if (row.designation && !existingContact.designation) existingContact.designation = cleanString(row.designation);
              }
            }
          }
        }
      } else if (currentAccountKey && currentSubAccountKey && contactNameRaw) {
        // This row doesn't have account_name but has a contact - it's an additional contact
        // for the current account/sub-account
        const account = accountMap.get(currentAccountKey);
        if (account) {
          // Find the current sub-account (last one added)
          const subAccount = account.sub_accounts[account.sub_accounts.length - 1];
          if (subAccount) {
            const contactNames = normalizeContactName(contactNameRaw);
            for (const contactName of contactNames) {
              if (contactName) {
                // Check if this contact already exists (case-insensitive)
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
                  // Merge contact data (prefer non-null values)
                  if (row['phone '] && !existingContact.phone) existingContact.phone = String(row['phone ']).trim();
                  if (row.email && !existingContact.email) existingContact.email = cleanString(row.email);
                  if (row.designation && !existingContact.designation) existingContact.designation = cleanString(row.designation);
                }
              }
            }
          }
        }
      } else if (currentAccountKey && currentSubAccountKey) {
        // This row might have updated location data for the current sub-account
        const account = accountMap.get(currentAccountKey);
        if (account) {
          const subAccount = account.sub_accounts[account.sub_accounts.length - 1];
          if (subAccount) {
            // Update sub-account fields if they exist and are not already set
            if (row['office_type '] && !subAccount.office_type) subAccount.office_type = cleanString(row['office_type ']);
            if (row.address && !subAccount.address) subAccount.address = cleanString(row.address);
            if (row['state '] && !subAccount.state) subAccount.state = cleanString(row['state ']);
            if (row.city && !subAccount.city) subAccount.city = cleanString(row.city);
            if (row.Pincode && !subAccount.pin_code) subAccount.pin_code = String(row.Pincode).trim();
          }
        }
      }
    }

    console.log(`📦 Processed ${accountMap.size} unique accounts (target: 117)`);
    let totalSubAccounts = 0;
    accountMap.forEach(account => {
      totalSubAccounts += account.sub_accounts.length;
    });
    console.log(`📦 Processed ${totalSubAccounts} unique sub-accounts (target: 117)`);

    // Get or create industries and sub-industries
    const { data: industries } = await supabase
      .from('industries')
      .select('id, name');

    const { data: subIndustries } = await supabase
      .from('sub_industries')
      .select('id, name, industry_id');

    const industryMap = new Map<string, number>();
    (industries || []).forEach(ind => {
      industryMap.set(ind.name.toLowerCase().trim(), ind.id);
    });

    const subIndustryMap = new Map<string, { id: number; industry_id: number }>();
    (subIndustries || []).forEach(si => {
      subIndustryMap.set(si.name.toLowerCase().trim(), { id: si.id, industry_id: si.industry_id });
    });

    // Get states and cities
    const { data: states } = await supabase
      .from('states')
      .select('id, state_name');

    const { data: cities } = await supabase
      .from('cities')
      .select('id, city_name, state_id');

    const stateMap = new Map<string, number>();
    (states || []).forEach(s => {
      stateMap.set(s.state_name.toLowerCase().trim(), s.id);
    });

    const cityMap = new Map<string, { id: number; state_id: number }>();
    (cities || []).forEach(c => {
      cityMap.set(`${c.city_name.toLowerCase().trim()}_${c.state_id}`, { id: c.id, state_id: c.state_id });
    });

    // Import accounts - process unique accounts and sub-accounts
    let accountsCreated = 0;
    let accountsUpdated = 0;
    let subAccountsCreated = 0;
    let subAccountsUpdated = 0;
    let contactsCreated = 0;
    const errors: string[] = [];
    const uniqueSubAccounts = new Set<string>();
    const uniqueContacts = new Set<string>();

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
          // Update existing account - only update if we have new values
          const updateData: any = {};
          if (accountData.company_stage) updateData.company_stage = accountData.company_stage;
          if (accountData.company_tag) updateData.company_tag = accountData.company_tag;

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from('accounts')
              .update(updateData)
              .eq('id', existingAccount.id);

            if (updateError) {
              console.error(`Error updating account ${accountData.account_name}:`, updateError);
              throw updateError;
            }
          }
          accountId = existingAccount.id;
          accountsUpdated++;
          console.log(`✅ Updated account: ${accountData.account_name} (ID: ${accountId})`);
        } else {
          // Create new account - set default values for required enum fields
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

          if (insertError) {
            console.error(`Error creating account ${accountData.account_name}:`, insertError);
            throw insertError;
          }
          accountId = newAccount.id;
          accountsCreated++;
          console.log(`✅ Created account: ${accountData.account_name} (ID: ${accountId})`);
        }

        // Handle industry association
        if (accountData.industry && accountData.sub_industry) {
          const industryName = accountData.industry.toLowerCase().trim();
          const subIndustryName = accountData.sub_industry.toLowerCase().trim();
          const industryId = industryMap.get(industryName);
          const subIndustryData = subIndustryMap.get(subIndustryName);

          if (industryId && subIndustryData && subIndustryData.industry_id === industryId) {
            // Check if this industry combination already exists
            const { data: existingIndustries } = await supabase
              .from('account_industries')
              .select('id')
              .eq('account_id', accountId)
              .eq('industry_id', industryId)
              .eq('sub_industry_id', subIndustryData.id)
              .maybeSingle();

            if (!existingIndustries) {
              await supabase
                .from('account_industries')
                .insert({
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
          // Find state and city IDs - create if they don't exist
          let stateId: number | null = null;
          let cityId: number | null = null;

          if (subAccountData.state) {
            const stateName = subAccountData.state.toLowerCase().trim();
            stateId = stateMap.get(stateName) || null;

            // If state doesn't exist, create it
            if (!stateId) {
              const { data: newState, error: createStateError } = await supabase
                .from('states')
                .insert({ state_name: subAccountData.state.trim() })
                .select('id')
                .single();

              if (!createStateError && newState) {
                stateId = newState.id;
                stateMap.set(stateName, stateId);
                console.log(`🆕 Created new state: ${subAccountData.state}`);
              }
            }
          }

          if (subAccountData.city) {
            // If we have a city but no state, we need to handle this
            if (!stateId) {
              // Try to infer state from city or create a default
              // For now, we'll skip city if no state
              console.log(`⚠️ City "${subAccountData.city}" provided but no state, skipping city`);
            } else {
              const cityName = subAccountData.city.toLowerCase().trim();
              const cityKey = `${cityName}_${stateId}`;
              const cityData = cityMap.get(cityKey);
              cityId = cityData?.id || null;

              // If city doesn't exist, create it - try both column names
              if (!cityId) {
                // Try with 'name' column first
                let { data: newCity, error: createCityError } = await supabase
                  .from('cities')
                  .insert({ 
                    state_id: stateId, 
                    name: subAccountData.city.trim() 
                  })
                  .select('id')
                  .single();

                if (createCityError) {
                  // If 'name' column doesn't work, try 'city_name' column
                  if (createCityError.code === '42703' || createCityError.message?.includes('column') || createCityError.message?.includes('name')) {
                    const { data: newCity2, error: createCityError2 } = await supabase
                      .from('cities')
                      .insert({ 
                        state_id: stateId, 
                        city_name: subAccountData.city.trim() 
                      })
                      .select('id')
                      .single();

                    if (!createCityError2 && newCity2) {
                      cityId = newCity2.id;
                      cityMap.set(cityKey, { id: cityId, state_id: stateId });
                      console.log(`🆕 Created new city: ${subAccountData.city} (${subAccountData.state})`);
                    } else if (createCityError2?.code === '23505') {
                      // Duplicate key - city might have been created, try to find it
                      const { data: foundCity } = await supabase
                        .from('cities')
                        .select('id')
                        .eq('state_id', stateId)
                        .eq('city_name', subAccountData.city.trim())
                        .maybeSingle();
                      
                      if (foundCity) {
                        cityId = foundCity.id;
                        cityMap.set(cityKey, { id: cityId, state_id: stateId });
                      }
                    }
                  } else if (createCityError.code === '23505') {
                    // Duplicate key - city might have been created, try to find it
                    const { data: foundCity } = await supabase
                      .from('cities')
                      .select('id')
                      .eq('state_id', stateId)
                      .eq('name', subAccountData.city.trim())
                      .maybeSingle();
                    
                    if (foundCity) {
                      cityId = foundCity.id;
                      cityMap.set(cityKey, { id: cityId, state_id: stateId });
                    }
                  }
                } else if (newCity) {
                  cityId = newCity.id;
                  cityMap.set(cityKey, { id: cityId, state_id: stateId });
                  console.log(`🆕 Created new city: ${subAccountData.city} (${subAccountData.state})`);
                }
              }
            }
          }

          // Track unique sub-accounts
          const subAccountKey = `${accountData.account_name}|||${subAccountData.sub_account_name}`;
          uniqueSubAccounts.add(subAccountKey);

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
            const updateData: any = {
              office_type: subAccountData.office_type || null,
              address: subAccountData.address || null,
              pincode: subAccountData.pin_code || null,
            };

            if (stateId) updateData.state_id = stateId;
            if (cityId) updateData.city_id = cityId;

            const { error: updateError } = await supabase
              .from('sub_accounts')
              .update(updateData)
              .eq('id', existingSubAccount.id);

            if (updateError) throw updateError;
            subAccountId = existingSubAccount.id;
            subAccountsUpdated++;
          } else {
            // Create new sub-account - check if assigned_employee column exists
            const insertData: any = {
              account_id: accountId,
              sub_account_name: subAccountData.sub_account_name,
              state_id: stateId,
              city_id: cityId,
              address: subAccountData.address || null,
              pincode: subAccountData.pin_code || null,
              is_active: true,
            };

            // Add office_type if column exists
            if (subAccountData.office_type) {
              insertData.office_type = subAccountData.office_type;
            }

            // Try to add assigned_employee if column exists (set to null for unassigned)
            // Some schemas have this as required, others don't
            try {
              const { data: newSubAccount, error: insertError } = await supabase
                .from('sub_accounts')
                .insert(insertData)
                .select('id')
                .single();

              if (insertError) {
                // If error is about missing assigned_employee, try with it
                if (insertError.message?.includes('assigned_employee') || insertError.code === '23502') {
                  insertData.assigned_employee = null; // Unassigned
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
            } catch (err: any) {
              console.error(`Error creating sub-account ${subAccountData.sub_account_name}:`, err);
              throw err;
            }

            subAccountsCreated++;
            console.log(`✅ Created sub-account: ${subAccountData.sub_account_name} (ID: ${subAccountId})`);
          }

          // Process contacts - duplicates already merged during processing
          for (const contactData of subAccountData.contacts) {
            if (!contactData.name) continue;

            // Track unique contacts (use account + sub-account + contact name for uniqueness)
            const contactKey = `${accountData.account_name}|||${subAccountData.sub_account_name}|||${contactData.name.toLowerCase().trim()}`;
            uniqueContacts.add(contactKey);

            // Check if contact already exists
            const { data: existingContact } = await supabase
              .from('contacts')
              .select('id')
              .eq('sub_account_id', subAccountId)
              .ilike('name', contactData.name.trim())
              .maybeSingle();

            if (!existingContact) {
              const insertData: any = {
                sub_account_id: subAccountId,
                account_id: accountId,
                name: contactData.name.trim(),
                phone: contactData.phone || null,
                email: contactData.email || null,
                designation: contactData.designation || null,
                created_by: 'system', // Required field
              };

              const { error: contactError } = await supabase
                .from('contacts')
                .insert(insertData);

              if (contactError) {
                console.error(`Error creating contact ${contactData.name}:`, contactError);
                errors.push(`Contact ${contactData.name}: ${contactError.message}`);
              } else {
                contactsCreated++;
                console.log(`✅ Created contact: ${contactData.name}`);
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
    console.log(`✅ Accounts: ${accountsCreated} created, ${accountsUpdated} updated (Total unique: ${accountMap.size})`);
    console.log(`✅ Sub-Accounts: ${subAccountsCreated} created, ${subAccountsUpdated} updated (Total unique: ${uniqueSubAccounts.size})`);
    console.log(`✅ Contacts: ${contactsCreated} created (Total unique: ${uniqueContacts.size})`);
    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`);
      errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }
    console.log('='.repeat(60));

    return NextResponse.json({
      success: true,
      message: `Import completed: ${accountsCreated + accountsUpdated} accounts, ${subAccountsCreated + subAccountsUpdated} sub-accounts, ${contactsCreated} contacts`,
      summary: {
        accountsCreated,
        accountsUpdated,
        subAccountsCreated,
        subAccountsUpdated,
        contactsCreated,
        totalUniqueAccounts: accountMap.size, // Should be 117
        totalUniqueSubAccounts: uniqueSubAccounts.size, // Should be 117
        uniqueContacts: uniqueContacts.size, // Should be 173
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

