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
  pincode?: number | null;
  'contact name '?: string | null;
  'contact number'?: number | null;
  desigation?: string | null;
  email?: string | null;
}

interface ProcessedAccount {
  account_name: string;
  industry: string;
  sub_industry: string;
  sub_account_name: string;
  address: string;
  state: string;
  city: string;
  pincode: string | null;
  contacts: Array<{
    name: string;
    designation: string | null;
    phone: string | null;
    email: string | null;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Try multiple possible paths for the Excel file
    const fileName = 'accounts_rows (2)(1).xlsx';
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
      // List files in current directory for debugging
      let dirContents = 'Unable to read directory';
      try {
        dirContents = fs.readdirSync(process.cwd()).join(', ');
      } catch (err) {
        dirContents = String(err);
      }
      
      return NextResponse.json(
        { 
          error: 'Excel file not found: accounts_rows (2)(1).xlsx',
          message: 'Tried paths: ' + possiblePaths.join(', '),
          cwd: process.cwd(),
          dirContents: dirContents
        },
        { status: 404 }
      );
    }

    // Read Excel file
    let workbook: XLSX.WorkBook;
    try {
      // Try reading with the resolved path
      workbook = XLSX.readFile(excelFilePath!);
    } catch (fileError: any) {
      console.error('Error reading Excel file:', fileError);
      // Try reading as buffer instead
      try {
        const fileBuffer = fs.readFileSync(excelFilePath!);
        workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      } catch (bufferError: any) {
        return NextResponse.json(
          {
            error: 'Failed to read Excel file',
            message: bufferError.message || 'Unknown error',
            filePath: excelFilePath,
          },
          { status: 500 }
        );
      }
    }
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    console.log(`📊 Read ${rows.length} rows from Excel file`);

    // Process rows and group by account
    const accountMap = new Map<string, ProcessedAccount>();
    let currentAccountKey: string | null = null;

    for (const row of rows) {
      const accountName = (row.account_name as string)?.trim();
      const subAccountName = (row.subaccount as string)?.trim();
      const contactName = (row['contact name '] as string)?.trim();

      // If this row has account_name and subaccount, it's a new account/sub-account
      if (accountName && subAccountName) {
        const key = `${accountName}|||${subAccountName}`;
        currentAccountKey = key;

        if (!accountMap.has(key)) {
          accountMap.set(key, {
            account_name: accountName,
            industry: (row.industry as string)?.trim() || '',
            sub_industry: (row['sub industry'] as string)?.trim() || '',
            sub_account_name: subAccountName,
          address: (row.address as string)?.trim() || '',
          state: (row['state '] as string)?.trim().replace(/\s+/g, ' ') || '', // Normalize whitespace
          city: (row.city as string)?.trim().replace(/\s+/g, ' ') || '', // Normalize whitespace
            pincode: row.pincode ? String(row.pincode).trim() : null,
            contacts: [],
          });
        }

        // Add contact if present in this row
        if (contactName) {
          accountMap.get(key)!.contacts.push({
            name: contactName,
            designation: (row.desigation as string)?.trim() || null,
            phone: row['contact number'] ? String(row['contact number']).trim() : null,
            email: (row.email as string)?.trim() || null,
          });
        }
      } else if (currentAccountKey && accountMap.has(currentAccountKey) && contactName) {
        // This row doesn't have account_name but has a contact - it's an additional contact
        // for the current account/sub-account
        accountMap.get(currentAccountKey)!.contacts.push({
          name: contactName,
          designation: (row.desigation as string)?.trim() || null,
          phone: row['contact number'] ? String(row['contact number']).trim() : null,
          email: (row.email as string)?.trim() || null,
        });
      }
    }

    console.log(`📋 Processed ${accountMap.size} unique account/sub-account combinations`);

    // Fetch industries and sub-industries for matching
    const { data: industries, error: industriesError } = await supabase
      .from('industries')
      .select('id, name');

    if (industriesError) {
      console.error('Error fetching industries:', industriesError);
      return NextResponse.json(
        { error: `Failed to fetch industries: ${industriesError.message}` },
        { status: 500 }
      );
    }

    const { data: subIndustries, error: subIndustriesError } = await supabase
      .from('sub_industries')
      .select('id, industry_id, name');

    if (subIndustriesError) {
      console.error('Error fetching sub-industries:', subIndustriesError);
      return NextResponse.json(
        { error: `Failed to fetch sub-industries: ${subIndustriesError.message}` },
        { status: 500 }
      );
    }

    // Create lookup maps
    const industryMap = new Map<string, number>();
    (industries || []).forEach((ind: any) => {
      industryMap.set(ind.name.toLowerCase().trim(), ind.id);
    });

    const subIndustryMap = new Map<string, { id: number; industry_id: number }>();
    (subIndustries || []).forEach((si: any) => {
      subIndustryMap.set(si.name.toLowerCase().trim(), { id: si.id, industry_id: si.industry_id });
    });

    // Fetch states for matching - try both column names
    let states: any[] = [];
    let stateMap = new Map<string, number>();
    
    // Try state_name first (as used in meta API)
    const { data: statesData1, error: statesError1 } = await supabase
      .from('states')
      .select('id, state_name');

    if (!statesError1 && statesData1) {
      states = statesData1;
      states.forEach((state: any) => {
        const stateName = (state.state_name || '').toLowerCase().trim();
        if (stateName) {
          stateMap.set(stateName, state.id);
          // Also add normalized version (remove extra spaces)
          const normalizedName = stateName.replace(/\s+/g, ' ').trim();
          if (normalizedName !== stateName) {
            stateMap.set(normalizedName, state.id);
          }
        }
      });
    } else {
      // Fallback: try with 'name' column
      const { data: statesData2, error: statesError2 } = await supabase
        .from('states')
        .select('id, name');

      if (statesError2) {
        console.error('Error fetching states:', statesError2);
        return NextResponse.json(
          { error: `Failed to fetch states: ${statesError2.message}` },
          { status: 500 }
        );
      }

      states = statesData2 || [];
      states.forEach((state: any) => {
        const stateName = (state.name || '').toLowerCase().trim();
        if (stateName) {
          stateMap.set(stateName, state.id);
          // Also add normalized version (remove extra spaces)
          const normalizedName = stateName.replace(/\s+/g, ' ').trim();
          if (normalizedName !== stateName) {
            stateMap.set(normalizedName, state.id);
          }
        }
      });
    }
    
    console.log(`📊 Loaded ${stateMap.size} state entries into map from ${states.length} states`);

    const results = {
      updated: 0,
      created: 0,
      errors: [] as string[],
      details: [] as Array<{
        account_name: string;
        sub_account_name: string;
        status: string;
        message: string;
      }>,
    };

    // Process each account
    for (const [key, accountData] of accountMap.entries()) {
      try {
        // Find account by name
        const { data: existingAccount, error: accountError } = await supabase
          .from('accounts')
          .select('id, account_name, industries')
          .eq('account_name', accountData.account_name)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (accountError && accountError.code !== 'PGRST116') {
          // PGRST116 is "not found" which is okay
          throw new Error(`Failed to find account: ${accountError.message}`);
        }

        if (!existingAccount) {
          results.errors.push(
            `Account not found: ${accountData.account_name}. Please create the account first.`
          );
          results.details.push({
            account_name: accountData.account_name,
            sub_account_name: accountData.sub_account_name,
            status: 'error',
            message: 'Account not found',
          });
          continue;
        }

        const accountId = existingAccount.id;

        // Update account with industry information
        const industryName = accountData.industry.toLowerCase().trim();
        const subIndustryName = accountData.sub_industry.toLowerCase().trim();

        const industryId = industryMap.get(industryName);
        const subIndustryData = subIndustryMap.get(subIndustryName);

        if (industryId && subIndustryData && subIndustryData.industry_id === industryId) {
          // Check if this industry/sub-industry combination already exists
          const currentIndustries = (existingAccount.industries as any[]) || [];
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

            const { error: updateAccountError } = await supabase
              .from('accounts')
              .update({ industries: newIndustries })
              .eq('id', accountId);

            if (updateAccountError) {
              console.error(`Error updating account industries:`, updateAccountError);
            }
          }
        }

        // Find or create state
        const stateNameRaw = accountData.state.trim().replace(/\s+/g, ' '); // Normalize whitespace
        const stateName = stateNameRaw.toLowerCase();
        let stateId: number | null = stateMap.get(stateName) || null;
        
        // Also try with normalized version
        if (!stateId) {
          const normalizedStateName = stateName.replace(/\s+/g, ' ').trim();
          stateId = stateMap.get(normalizedStateName) || null;
        }

        if (!stateId && accountData.state) {
          // Try to find state with exact match first
          let matchingState = (states || []).find(
            (s: any) => {
              const sName = ((s.state_name || s.name) || '').toLowerCase().trim();
              return sName === stateName;
            }
          );
          
          // If not found, try partial match (contains)
          if (!matchingState) {
            matchingState = (states || []).find(
              (s: any) => {
                const sName = ((s.state_name || s.name) || '').toLowerCase().trim();
                return sName.includes(stateName) || stateName.includes(sName);
              }
            );
          }
          
          if (matchingState) {
            stateId = matchingState.id;
            console.log(`✅ Found state: ${accountData.state} (ID: ${stateId})`);
          } else {
            // Create new state if not found - try both column names
            const insertData: any = {};
            // Check which column exists by trying state_name first
            const { data: testState } = await supabase
              .from('states')
              .select('state_name, name')
              .limit(1)
              .single();
            
            if (testState?.state_name !== undefined) {
              insertData.state_name = accountData.state;
            } else {
              insertData.name = accountData.state;
            }

            const { data: newState, error: createStateError } = await supabase
              .from('states')
              .insert(insertData)
              .select('id')
              .single();

            if (!createStateError && newState) {
              stateId = newState.id;
              stateMap.set(stateName, newState.id);
            }
          }
        }

        // Find or create city
        let cityId: number | null = null;
        if (stateId && accountData.city) {
          const cityName = accountData.city.trim();
          
          if (!cityName) {
            console.log(`⚠️ City name is empty for account: ${accountData.account_name}`);
          } else {
            // First, try to find existing city - try both column names
            let existingCity: any = null;
            
            // Try with 'name' column first (standard schema)
            const { data: cityByName, error: errByName } = await supabase
              .from('cities')
              .select('id')
              .eq('state_id', stateId)
              .eq('name', cityName)
              .limit(1)
              .maybeSingle();
            
            if (!errByName && cityByName) {
              existingCity = cityByName;
              cityId = cityByName.id;
              console.log(`✅ Found existing city (name): ${cityName} (ID: ${cityId})`);
            } else {
              // Try with 'city_name' column (alternative schema)
              const { data: cityByCityName, error: errByCityName } = await supabase
                .from('cities')
                .select('id')
                .eq('state_id', stateId)
                .eq('city_name', cityName)
                .limit(1)
                .maybeSingle();
              
              if (!errByCityName && cityByCityName) {
                existingCity = cityByCityName;
                cityId = cityByCityName.id;
                console.log(`✅ Found existing city (city_name): ${cityName} (ID: ${cityId})`);
              }
            }

            // If city doesn't exist, create it
            if (!existingCity && stateId) {
              console.log(`🆕 Creating new city: ${cityName} for state ID: ${stateId}`);
              
              // Try with 'name' column first (standard schema)
              const { data: newCity, error: createCityError } = await supabase
                .from('cities')
                .insert({ state_id: stateId, name: cityName })
                .select('id')
                .single();

              if (createCityError) {
                // Check if it's a duplicate key error - city might have been created by another process
                if (createCityError.code === '23505' || createCityError.message?.includes('duplicate key')) {
                  console.log(`⚠️ City "${cityName}" already exists (duplicate key), looking it up...`);
                  // Try to find it again - it might have been created between our check and insert
                  const { data: foundCity, error: findError } = await supabase
                    .from('cities')
                    .select('id')
                    .eq('state_id', stateId)
                    .eq('name', cityName)
                    .limit(1)
                    .maybeSingle();
                  
                  if (!findError && foundCity) {
                    cityId = foundCity.id;
                    console.log(`✅ Found city after duplicate error: ${cityName} (ID: ${cityId})`);
                  } else {
                    // Try with 'city_name' column as fallback
                    const { data: newCity2, error: createCityError2 } = await supabase
                      .from('cities')
                      .insert({ state_id: stateId, city_name: cityName })
                      .select('id')
                      .single();
                    
                    if (!createCityError2 && newCity2) {
                      cityId = newCity2.id;
                      console.log(`✅ Created new city (city_name column): ${cityName} (ID: ${cityId})`);
                    } else if (createCityError2?.code === '23505' || createCityError2?.message?.includes('duplicate key')) {
                      // Also duplicate with city_name, try to find it
                      const { data: foundCity2, error: findError2 } = await supabase
                        .from('cities')
                        .select('id')
                        .eq('state_id', stateId)
                        .eq('city_name', cityName)
                        .limit(1)
                        .maybeSingle();
                      
                      if (!findError2 && foundCity2) {
                        cityId = foundCity2.id;
                        console.log(`✅ Found city (city_name) after duplicate error: ${cityName} (ID: ${cityId})`);
                      } else {
                        console.error(`❌ Failed to find or create city ${cityName}:`, findError2);
                      }
                    } else {
                      console.error(`❌ Failed to create city ${cityName}:`, createCityError2);
                    }
                  }
                } else {
                  // If 'name' column failed with non-duplicate error, try with 'city_name' column
                  console.log(`⚠️ Failed with 'name' column, trying 'city_name' column...`);
                  const { data: newCity2, error: createCityError2 } = await supabase
                    .from('cities')
                    .insert({ state_id: stateId, city_name: cityName })
                    .select('id')
                    .single();
                  
                  if (!createCityError2 && newCity2) {
                    cityId = newCity2.id;
                    console.log(`✅ Created new city (city_name column): ${cityName} (ID: ${cityId})`);
                  } else {
                    console.error(`❌ Failed to create city ${cityName}:`, createCityError2);
                  }
                }
              } else if (newCity) {
                cityId = newCity.id;
                console.log(`✅ Created new city (name column): ${cityName} (ID: ${cityId})`);
              }
            }
          }
        } else {
          if (!stateId && accountData.city) {
            console.log(`⚠️ Cannot create city "${accountData.city}": No state ID found`);
            results.errors.push(`Cannot create city "${accountData.city}": State not found`);
          }
        }

        // Find or create sub-account
        const { data: existingSubAccount, error: subAccountError } = await supabase
          .from('sub_accounts')
          .select('id')
          .eq('account_id', accountId)
          .eq('sub_account_name', accountData.sub_account_name)
          .eq('is_active', true)
          .limit(1)
          .single();

        let subAccountId: number;

        if (subAccountError && subAccountError.code === 'PGRST116') {
          // Sub-account doesn't exist, create it
          // Note: sub_accounts table may not have assigned_employee column
          const insertData: any = {
            account_id: accountId,
            sub_account_name: accountData.sub_account_name,
            address: accountData.address || null,
            state_id: stateId,
            city_id: cityId,
            pincode: accountData.pincode,
            is_active: true,
            engagement_score: 0,
          };

          const { data: newSubAccount, error: createSubAccountError } = await supabase
            .from('sub_accounts')
            .insert(insertData)
            .select('id')
            .single();

          if (createSubAccountError || !newSubAccount) {
            throw new Error(
              `Failed to create sub-account: ${createSubAccountError?.message || 'Unknown error'}`
            );
          }

          subAccountId = newSubAccount.id;
          results.created++;
        } else if (subAccountError) {
          throw new Error(`Failed to find sub-account: ${subAccountError.message}`);
        } else {
          // Update existing sub-account
          subAccountId = existingSubAccount.id;

          const updateData: any = {};
          if (accountData.address) updateData.address = accountData.address;
          if (stateId !== null && stateId !== undefined) updateData.state_id = stateId;
          if (cityId !== null && cityId !== undefined) updateData.city_id = cityId;
          if (accountData.pincode) updateData.pincode = accountData.pincode;
          
          console.log(`📝 Updating sub-account ${subAccountId} with:`, {
            address: accountData.address || 'N/A',
            state_id: stateId || 'N/A',
            city_id: cityId || 'N/A',
            pincode: accountData.pincode || 'N/A'
          });

          if (Object.keys(updateData).length > 0) {
            const { error: updateSubAccountError } = await supabase
              .from('sub_accounts')
              .update(updateData)
              .eq('id', subAccountId);

            if (updateSubAccountError) {
              console.error(`Error updating sub-account:`, updateSubAccountError);
            }
          }

          results.updated++;
        }

        // Create or update contacts
        for (const contact of accountData.contacts) {
          if (!contact.name) continue;

          // Check if contact already exists
          const { data: existingContact, error: contactError } = await supabase
            .from('contacts')
            .select('id')
            .eq('sub_account_id', subAccountId)
            .eq('account_id', accountId)
            .eq('name', contact.name.trim())
            .limit(1)
            .single();

          if (contactError && contactError.code === 'PGRST116') {
            // Contact doesn't exist, create it
            const { error: createContactError } = await supabase.from('contacts').insert({
              account_id: accountId,
              sub_account_id: subAccountId,
              name: contact.name.trim(),
              designation: contact.designation,
              phone: contact.phone,
              email: contact.email,
              created_by: 'system',
            });

            if (createContactError) {
              console.error(`Error creating contact ${contact.name}:`, createContactError);
            }
          } else if (!contactError && existingContact) {
            // Update existing contact
            const updateData: any = {};
            if (contact.designation) updateData.designation = contact.designation;
            if (contact.phone) updateData.phone = contact.phone;
            if (contact.email) updateData.email = contact.email;

            if (Object.keys(updateData).length > 0) {
              const { error: updateContactError } = await supabase
                .from('contacts')
                .update(updateData)
                .eq('id', existingContact.id);

              if (updateContactError) {
                console.error(`Error updating contact ${contact.name}:`, updateContactError);
              }
            }
          }
        }

        results.details.push({
          account_name: accountData.account_name,
          sub_account_name: accountData.sub_account_name,
          status: 'success',
          message: `Processed ${accountData.contacts.length} contact(s)`,
        });
      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        results.errors.push(
          `Error processing ${accountData.account_name}/${accountData.sub_account_name}: ${errorMsg}`
        );
        results.details.push({
          account_name: accountData.account_name,
          sub_account_name: accountData.sub_account_name,
          status: 'error',
          message: errorMsg,
        });
        console.error(`Error processing account:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${accountMap.size} account/sub-account combinations`,
      results,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        error: 'Failed to import Excel file',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
