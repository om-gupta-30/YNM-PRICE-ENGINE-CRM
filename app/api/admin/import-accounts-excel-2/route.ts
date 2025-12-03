import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface ExcelRow {
  id?: number | null;
  account_name?: string | null;
  subaccount?: string | null;
  address?: string | null;
  'state '?: string | null;
  city?: string | null;
  pincode?: number | null;
}

interface ProcessedAccount {
  account_name: string;
  sub_account_name: string;
  address: string;
  state: string;
  city: string;
  pincode: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Try multiple possible paths for the Excel file
    const fileName = 'account rows 2.xlsx';
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
          error: 'Excel file not found: account rows 2.xlsx',
          message: 'Tried paths: ' + possiblePaths.join(', '),
          cwd: process.cwd()
        },
        { status: 404 }
      );
    }

    // Read Excel file
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.readFile(excelFilePath!);
    } catch (fileError: any) {
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

    // Process rows
    const accountMap = new Map<string, ProcessedAccount>();

    for (const row of rows) {
      if (!row.account_name || !row.subaccount) continue;

      const accountName = (row.account_name as string).trim();
      const subAccountName = (row.subaccount as string).trim();
      const key = `${accountName}|||${subAccountName}`;

      accountMap.set(key, {
        account_name: accountName,
        sub_account_name: subAccountName,
        address: (row.address as string)?.trim() || '',
        state: (row['state '] as string)?.trim().replace(/\s+/g, ' ') || '',
        city: (row.city as string)?.trim().replace(/\s+/g, ' ') || '',
        pincode: row.pincode ? String(row.pincode).trim() : null,
      });
    }

    console.log(`📋 Processed ${accountMap.size} unique account/sub-account combinations`);

    // Fetch states for matching
    let states: any[] = [];
    let stateMap = new Map<string, number>();
    
    const { data: statesData1, error: statesError1 } = await supabase
      .from('states')
      .select('id, state_name');

    if (!statesError1 && statesData1) {
      states = statesData1;
      states.forEach((state: any) => {
        const stateName = (state.state_name || '').toLowerCase().trim();
        if (stateName) {
          stateMap.set(stateName, state.id);
          const normalizedName = stateName.replace(/\s+/g, ' ').trim();
          if (normalizedName !== stateName) {
            stateMap.set(normalizedName, state.id);
          }
        }
      });
    } else {
      const { data: statesData2, error: statesError2 } = await supabase
        .from('states')
        .select('id, name');

      if (statesError2) {
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
          const normalizedName = stateName.replace(/\s+/g, ' ').trim();
          if (normalizedName !== stateName) {
            stateMap.set(normalizedName, state.id);
          }
        }
      });
    }

    const results = {
      updated: 0,
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
          .select('id, account_name')
          .eq('account_name', accountData.account_name)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (accountError && accountError.code !== 'PGRST116') {
          throw new Error(`Failed to find account: ${accountError.message}`);
        }

        if (!existingAccount) {
          results.errors.push(`Account not found: ${accountData.account_name}`);
          continue;
        }

        const accountId = existingAccount.id;

        // Find or create state
        const stateNameRaw = accountData.state.trim().replace(/\s+/g, ' ');
        const stateName = stateNameRaw.toLowerCase();
        let stateId: number | null = stateMap.get(stateName) || null;

        if (!stateId && accountData.state) {
          let matchingState = (states || []).find(
            (s: any) => {
              const sName = ((s.state_name || s.name) || '').toLowerCase().trim();
              return sName === stateName;
            }
          );
          
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
          } else {
            // Create new state
            const insertData: any = {};
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
          
          // Try to find existing city
          const { data: cityByName, error: errByName } = await supabase
            .from('cities')
            .select('id')
            .eq('state_id', stateId)
            .eq('name', cityName)
            .limit(1)
            .maybeSingle();
          
          if (!errByName && cityByName) {
            cityId = cityByName.id;
          } else {
            // Try with city_name column
            const { data: cityByCityName, error: errByCityName } = await supabase
              .from('cities')
              .select('id')
              .eq('state_id', stateId)
              .eq('city_name', cityName)
              .limit(1)
              .maybeSingle();
            
            if (!errByCityName && cityByCityName) {
              cityId = cityByCityName.id;
            }
          }

          // Create city if not found
          if (!cityId && stateId) {
            const { data: newCity, error: createCityError } = await supabase
              .from('cities')
              .insert({ state_id: stateId, name: cityName })
              .select('id')
              .single();

            if (createCityError) {
              if (createCityError.code === '23505') {
                // Duplicate - try to find it
                const { data: foundCity } = await supabase
                  .from('cities')
                  .select('id')
                  .eq('state_id', stateId)
                  .eq('name', cityName)
                  .limit(1)
                  .maybeSingle();
                
                if (foundCity) {
                  cityId = foundCity.id;
                } else {
                  // Try with city_name
                  const { data: newCity2, error: createCityError2 } = await supabase
                    .from('cities')
                    .insert({ state_id: stateId, city_name: cityName })
                    .select('id')
                    .single();
                  
                  if (!createCityError2 && newCity2) {
                    cityId = newCity2.id;
                  }
                }
              } else {
                // Try with city_name column
                const { data: newCity2, error: createCityError2 } = await supabase
                  .from('cities')
                  .insert({ state_id: stateId, city_name: cityName })
                  .select('id')
                  .single();
                
                if (!createCityError2 && newCity2) {
                  cityId = newCity2.id;
                }
              }
            } else if (newCity) {
              cityId = newCity.id;
            }
          }
        }

        // Find and update sub-account
        const { data: existingSubAccount, error: subAccountError } = await supabase
          .from('sub_accounts')
          .select('id')
          .eq('account_id', accountId)
          .eq('sub_account_name', accountData.sub_account_name)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (subAccountError && subAccountError.code === 'PGRST116') {
          results.errors.push(`Sub-account not found: ${accountData.sub_account_name}`);
          continue;
        }

        if (!existingSubAccount) {
          results.errors.push(`Sub-account not found: ${accountData.sub_account_name}`);
          continue;
        }

        // Update sub-account
        const updateData: any = {};
        if (accountData.address) updateData.address = accountData.address;
        if (stateId !== null && stateId !== undefined) updateData.state_id = stateId;
        if (cityId !== null && cityId !== undefined) updateData.city_id = cityId;
        if (accountData.pincode) updateData.pincode = accountData.pincode;

        const { error: updateError } = await supabase
          .from('sub_accounts')
          .update(updateData)
          .eq('id', existingSubAccount.id);

        if (updateError) {
          throw new Error(`Failed to update sub-account: ${updateError.message}`);
        }

        results.updated++;
        results.details.push({
          account_name: accountData.account_name,
          sub_account_name: accountData.sub_account_name,
          status: 'success',
          message: `Updated with state: ${accountData.state}, city: ${accountData.city}`,
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
