import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface ExcelRow {
  id?: number | null;
  account_name?: string | null;
  company_stage?: string | null;
  company_tag?: string | null;
  industry?: string | null;
  'sub industry'?: string | null;
  subaccount?: string | null;
  address?: string | null;
  'state '?: string | null;
  city?: string | null;
  pincode?: string | number | null;
  'contact name '?: string | null;
  'contact number'?: string | number | null;
  desigation?: string | null;
  email?: string | null;
}

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
    pin_code: string | null;
    contacts: Array<{
      name: string;
      phone: string | null;
      designation: string | null;
      email: string | null;
    }>;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Find the Excel file
    const fileName = 'database1.xlsx';
    const possiblePaths = [
      path.resolve(process.cwd(), fileName),
      path.resolve(__dirname, '../../../../', fileName),
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
          success: false,
          error: 'Excel file not found: database1.xlsx',
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
        { success: false, error: 'Error reading Excel file: ' + fileError.message },
        { status: 500 }
      );
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Excel file is empty' },
        { status: 400 }
      );
    }

    console.log(`📊 Found ${rows.length} rows in Excel file`);

    // Process rows and group by account
    const accountMap = new Map<string, ProcessedAccount>();

    for (const row of rows) {
      const accountName = (row.account_name as string)?.trim();
      if (!accountName) continue;

      // Initialize account if not exists
      if (!accountMap.has(accountName)) {
        accountMap.set(accountName, {
          account_name: accountName,
          company_stage: (row.company_stage as string)?.trim() || null,
          company_tag: (row.company_tag as string)?.trim() || null,
          industry: (row.industry as string)?.trim() || null,
          sub_industry: (row['sub industry'] as string)?.trim() || null,
          sub_accounts: [],
        });
      }

      const account = accountMap.get(accountName)!;
      
      // Update account-level fields if they exist
      if (row.company_stage) account.company_stage = (row.company_stage as string)?.trim() || null;
      if (row.company_tag) account.company_tag = (row.company_tag as string)?.trim() || null;
      if (row.industry) account.industry = (row.industry as string)?.trim() || null;
      if (row['sub industry']) account.sub_industry = (row['sub industry'] as string)?.trim() || null;

      // Process sub-account
      const subAccountName = (row.subaccount as string)?.trim();
      if (!subAccountName) continue;

      let subAccount = account.sub_accounts.find(sa => sa.sub_account_name === subAccountName);
      if (!subAccount) {
        subAccount = {
          sub_account_name: subAccountName,
          address: (row.address as string)?.trim() || null,
          state: (row['state '] as string)?.trim() || null,
          city: (row.city as string)?.trim() || null,
          pin_code: row.pincode ? String(row.pincode).trim() : null,
          contacts: [],
        };
        account.sub_accounts.push(subAccount);
      }

      // Update sub-account fields if they exist
      if (row.address) subAccount.address = (row.address as string)?.trim() || null;
      if (row['state ']) subAccount.state = (row['state '] as string)?.trim() || null;
      if (row.city) subAccount.city = (row.city as string)?.trim() || null;
      if (row.pincode) subAccount.pin_code = String(row.pincode).trim() || null;

      // Process contact
      const contactName = (row['contact name '] as string)?.trim();
      if (contactName) {
        const contact = {
          name: contactName,
          phone: row['contact number'] ? String(row['contact number']).trim() : null,
          designation: (row.desigation as string)?.trim() || null,
          email: (row.email as string)?.trim() || null,
        };
        subAccount.contacts.push(contact);
      }
    }

    console.log(`📦 Processed ${accountMap.size} unique accounts`);

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

    // Get states and cities - handle both column name variations
    const { data: states } = await supabase
      .from('states')
      .select('id, state_name, name');

    const { data: cities } = await supabase
      .from('cities')
      .select('id, city_name, name, state_id');

    const stateMap = new Map<string, number>();
    (states || []).forEach(s => {
      const stateName = (s.state_name || s.name || '').toLowerCase().trim();
      if (stateName) {
        stateMap.set(stateName, s.id);
      }
    });

    const cityMap = new Map<string, { id: number; state_id: number }>();
    (cities || []).forEach(c => {
      const cityName = (c.city_name || c.name || '').toLowerCase().trim();
      if (cityName && c.state_id) {
        cityMap.set(`${cityName}_${c.state_id}`, { id: c.id, state_id: c.state_id });
      }
    });

    // Import accounts
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
          .single();

        let accountId: number;

        if (existingAccount) {
          // Update existing account
          const updateData: any = {};
          if (accountData.company_stage) updateData.company_stage = accountData.company_stage;
          if (accountData.company_tag) updateData.company_tag = accountData.company_tag;

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from('accounts')
              .update(updateData)
              .eq('id', existingAccount.id);

            if (updateError) throw updateError;
          }
          accountId = existingAccount.id;
          accountsUpdated++;
        } else {
          // Create new account
          const { data: newAccount, error: insertError } = await supabase
            .from('accounts')
            .insert({
              account_name: accountData.account_name,
              company_stage: accountData.company_stage || null,
              company_tag: accountData.company_tag || null,
              assigned_employee: 'system', // Default assignment
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          accountId = newAccount.id;
          accountsCreated++;

          // Add industry if provided
          if (accountData.industry && accountData.sub_industry) {
            const industryName = accountData.industry.toLowerCase().trim();
            const subIndustryName = accountData.sub_industry.toLowerCase().trim();
            const industryId = industryMap.get(industryName);
            const subIndustryData = subIndustryMap.get(subIndustryName);

            if (industryId && subIndustryData && subIndustryData.industry_id === industryId) {
              // Check if industries column exists (JSONB) or use account_industries table
              const { data: account } = await supabase
                .from('accounts')
                .select('industries')
                .eq('id', accountId)
                .single();

              if (account) {
                const currentIndustries = (account.industries as any[]) || [];
                const exists = currentIndustries.some(
                  (ind: any) =>
                    ind.industry_id === industryId && ind.sub_industry_id === subIndustryData.id
                );

                if (!exists) {
                  const newIndustries = [
                    ...currentIndustries,
                    {
                      industry_id: industryId,
                      industry_name: accountData.industry,
                      sub_industry_id: subIndustryData.id,
                      sub_industry_name: accountData.sub_industry,
                    },
                  ];

                  await supabase
                    .from('accounts')
                    .update({ industries: newIndustries })
                    .eq('id', accountId);
                }
              }
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

            // If not found, try to create it
            if (!stateId) {
              const { data: newState, error: createStateError } = await supabase
                .from('states')
                .insert({ state_name: subAccountData.state })
                .select('id')
                .single();

              if (!createStateError && newState) {
                stateId = newState.id;
                stateMap.set(stateName, newState.id);
              }
            }
          }

          if (subAccountData.city && stateId) {
            const cityName = subAccountData.city.toLowerCase().trim();
            const cityKey = `${cityName}_${stateId}`;
            let cityData = cityMap.get(cityKey);

            if (!cityData) {
              // Try to find or create city
              const { data: existingCity } = await supabase
                .from('cities')
                .select('id')
                .eq('state_id', stateId)
                .or(`name.eq.${subAccountData.city},city_name.eq.${subAccountData.city}`)
                .limit(1)
                .maybeSingle();

              if (existingCity) {
                cityId = existingCity.id;
                cityMap.set(cityKey, { id: cityId, state_id: stateId });
              } else {
                // Create new city
                const { data: newCity, error: createCityError } = await supabase
                  .from('cities')
                  .insert({ 
                    state_id: stateId, 
                    name: subAccountData.city,
                    city_name: subAccountData.city 
                  })
                  .select('id')
                  .single();

                if (!createCityError && newCity) {
                  cityId = newCity.id;
                  cityMap.set(cityKey, { id: cityId, state_id: stateId });
                }
              }
            } else {
              cityId = cityData.id;
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
            // Update existing sub-account
            const updateData: any = {};
            if (subAccountData.address) updateData.address = subAccountData.address;
            if (subAccountData.pin_code) updateData.pincode = subAccountData.pin_code;
            if (stateId) updateData.state_id = stateId;
            if (cityId) updateData.city_id = cityId;

            if (Object.keys(updateData).length > 0) {
              const { error: updateError } = await supabase
                .from('sub_accounts')
                .update(updateData)
                .eq('id', existingSubAccount.id);

              if (updateError) throw updateError;
            }
            subAccountId = existingSubAccount.id;
            subAccountsUpdated++;
          } else {
            // Create new sub-account
            const { data: newSubAccount, error: insertError } = await supabase
              .from('sub_accounts')
              .insert({
                account_id: accountId,
                sub_account_name: subAccountData.sub_account_name,
                state_id: stateId,
                city_id: cityId,
                address: subAccountData.address || null,
                pincode: subAccountData.pin_code || null,
                assigned_employee: 'system',
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
                  phone: contactData.phone || null,
                  email: contactData.email || null,
                  designation: contactData.designation || null,
                  created_by: 'system',
                });

              if (contactError) {
                console.error(`Error creating contact ${contactData.name}:`, contactError);
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

    return NextResponse.json({
      success: true,
      summary: {
        accountsCreated,
        accountsUpdated,
        subAccountsCreated,
        subAccountsUpdated,
        contactsCreated,
        totalAccounts: accountMap.size,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Auto import error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
