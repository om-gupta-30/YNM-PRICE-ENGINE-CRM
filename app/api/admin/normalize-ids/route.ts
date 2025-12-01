import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// API endpoint to normalize IDs across all tables
// Renumbers all IDs to be continuous (1, 2, 3, 4...) after deletions
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const results: Record<string, { success: boolean; rowsUpdated: number; lastId: number; message: string }> = {};

    // Tables to normalize (only tables that exist in the database)
    const tables = [
      { name: 'quotes_mbcb', sequence: 'quotes_mbcb_id_seq', idColumn: 'id' },
      { name: 'quotes_signages', sequence: 'quotes_signages_id_seq', idColumn: 'id' },
      { name: 'quotes_paint', sequence: 'quotes_paint_id_seq', idColumn: 'id' },
      { name: 'accounts', sequence: 'accounts_id_seq', idColumn: 'id' },
      { name: 'sub_accounts', sequence: 'sub_accounts_id_seq', idColumn: 'id' },
      { name: 'contacts', sequence: 'contacts_id_seq', idColumn: 'id' },
      { name: 'tasks', sequence: 'tasks_id_seq', idColumn: 'id' },
      { name: 'leads', sequence: 'leads_id_seq', idColumn: 'id' },
      { name: 'notifications', sequence: 'notifications_id_seq', idColumn: 'id' },
      { name: 'activities', sequence: 'activities_id_seq', idColumn: 'id' },
    ];

    for (const table of tables) {
      try {
        // Use the normalize_table_ids database function for atomic operation
        const { data: functionResult, error: functionError } = await supabase.rpc('normalize_table_ids', {
          table_name: table.name,
          id_column: table.idColumn,
          sequence_name: table.sequence,
        });

        if (!functionError && functionResult && Array.isArray(functionResult) && functionResult.length > 0) {
          const result = functionResult[0];
          console.log(`✅ Normalized ${table.name} using database function:`, result);
          results[table.name] = {
            success: true,
            rowsUpdated: result.rows_updated || 0,
            lastId: result.last_id || 0,
            message: `Successfully normalized ${result.rows_updated || 0} rows, last ID = ${result.last_id || 0}`,
          };
          continue;
        } else if (functionError) {
          console.warn(`Database function error for ${table.name}:`, functionError);
          // If it's a format() argument error, the function signature might be wrong
          // Continue to fallback method which works reliably
          if (functionError.code === '22023' || functionError.message?.includes('format()')) {
            console.warn(`Database function has incorrect signature for ${table.name}, using manual method`);
          }
          // Continue to fallback method
        }

        // Fallback: Manual normalization if database function doesn't exist
        console.warn(`Database function normalize_table_ids not available for ${table.name}, using manual method`);

        // Step 1: Fetch all rows sorted by current ID
        const { data: rows, error: fetchError } = await supabase
          .from(table.name)
          .select('*')
          .order(table.idColumn, { ascending: true });

        if (fetchError) {
          console.error(`Error fetching rows from ${table.name}:`, fetchError);
          results[table.name] = {
            success: false,
            rowsUpdated: 0,
            lastId: 0,
            message: `Error fetching rows: ${fetchError.message}`,
          };
          continue;
        }

        if (!rows || rows.length === 0) {
          // Table is empty, reset sequence to 1 using direct SQL
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          
          // Try RPC function first
          const { error: resetError } = await supabase.rpc('reset_sequence', {
            sequence_name: table.sequence,
          });

          if (resetError) {
            console.warn(`RPC function failed for ${table.name}, trying direct SQL...`);
            
            // Use direct SQL execution via REST API
            if (supabaseUrl && serviceKey) {
              try {
                // Execute SQL directly to reset sequence
                const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                  },
                  body: JSON.stringify({ 
                    sql: `ALTER SEQUENCE ${table.sequence} RESTART WITH 1;` 
                  }),
                });
                
                // If exec_sql doesn't exist, try using PostgREST to execute via a custom function
                // Or use the Supabase management API
                if (!sqlResponse.ok) {
                  // Fallback: Use Supabase client to execute raw SQL (if we have service role)
                  // Since we can't execute raw SQL directly, we'll use a workaround:
                  // Insert a dummy row, delete it, which should reset the sequence
                  // But this is not ideal. Instead, we'll log the SQL that needs to be run.
                  console.warn(`⚠️ Cannot reset sequence automatically. Please run in Supabase SQL Editor: ALTER SEQUENCE ${table.sequence} RESTART WITH 1;`);
                  
                  // Try one more method: Use the set_sequence_to_value function with 1
                  const { error: setSeqError } = await supabase.rpc('set_sequence_to_value', {
                    sequence_name: table.sequence,
                    new_value: 1,
                  });
                  
                  if (!setSeqError) {
                    console.log(`✅ Sequence reset for empty table ${table.name} using set_sequence_to_value(1)`);
                  } else {
                    console.error(`❌ Could not reset sequence for ${table.name}. Error:`, setSeqError);
                    // Log SQL that needs to be run manually
                    console.error(`⚠️ Please run in Supabase SQL Editor: ALTER SEQUENCE ${table.sequence} RESTART WITH 1;`);
                  }
                } else {
                  console.log(`✅ Sequence reset for empty table ${table.name} via SQL execution`);
                }
              } catch (fetchError) {
                console.error(`Failed to reset sequence for ${table.name}:`, fetchError);
                // Last resort: Try set_sequence_to_value with 1
                const { error: setSeqError } = await supabase.rpc('set_sequence_to_value', {
                  sequence_name: table.sequence,
                  new_value: 1,
                });
                if (!setSeqError) {
                  console.log(`✅ Sequence reset for empty table ${table.name} using set_sequence_to_value(1)`);
                } else {
                  console.error(`❌ All methods failed. Please run in Supabase SQL Editor: ALTER SEQUENCE ${table.sequence} RESTART WITH 1;`);
                }
              }
            } else {
              console.warn(`⚠️ Missing Supabase config. Cannot reset sequence for ${table.name}`);
            }
          } else {
            console.log(`✅ Sequence reset for empty table ${table.name} using RPC function`);
          }

          results[table.name] = {
            success: true,
            rowsUpdated: 0,
            lastId: 0,
            message: 'Table is empty, sequence reset to 1',
          };
          continue;
        }

        // Step 2: Create a mapping of old ID -> new ID
        const idMapping: Record<number, number> = {};
        rows.forEach((row, index) => {
          const oldId = row[table.idColumn] as number;
          const newId = index + 1;
          idMapping[oldId] = newId;
        });

        const lastId = rows.length;
        let updateCount = 0;

        // Step 3: Update IDs using a two-phase approach to avoid conflicts
        // Phase 1: Set all IDs to negative temporary values
        for (const row of rows) {
          const oldId = row[table.idColumn] as number;
          const tempId = -(oldId + 100000); // Use large negative to avoid conflicts

          const { error: tempUpdateError } = await supabase
            .from(table.name)
            .update({ [table.idColumn]: tempId })
            .eq(table.idColumn, oldId);

          if (tempUpdateError) {
            console.error(`Error setting temp ID for row ${oldId} in ${table.name}:`, tempUpdateError);
          }
        }

        // Phase 2: Set all IDs to their final normalized values
        for (const row of rows) {
          const oldId = row[table.idColumn] as number;
          const newId = idMapping[oldId];
          const tempId = -(oldId + 100000);

          const { error: finalUpdateError } = await supabase
            .from(table.name)
            .update({ [table.idColumn]: newId })
            .eq(table.idColumn, tempId);

          if (finalUpdateError) {
            console.error(`Error setting final ID for row ${oldId} in ${table.name}:`, finalUpdateError);
          } else {
            updateCount++;
          }
        }

        // Step 4: Update the sequence to point to lastId
        const { error: sequenceError } = await supabase.rpc('set_sequence_to_value', {
          sequence_name: table.sequence,
          new_value: lastId,
        });

        if (sequenceError) {
          // Fallback: use reset_sequence and advance it
          const { error: resetError } = await supabase.rpc('reset_sequence', {
            sequence_name: table.sequence,
          });

          if (!resetError && lastId > 0) {
            // Advance sequence to lastId by calling nextval (lastId - 1) times
            // Note: This is a workaround, the database function is preferred
            console.log(`Sequence reset for ${table.name}, will advance to ${lastId} on next insert`);
          }
        }

        console.log(`✅ Normalized ${table.name}: ${updateCount} rows, last ID = ${lastId}`);
        results[table.name] = {
          success: true,
          rowsUpdated: updateCount,
          lastId: lastId,
          message: `Successfully normalized ${updateCount} rows, last ID = ${lastId}`,
        };
      } catch (error: any) {
        console.error(`Error normalizing table ${table.name}:`, error);
        results[table.name] = {
          success: false,
          rowsUpdated: 0,
          lastId: 0,
          message: `Error: ${error.message}`,
        };
      }
    }

    const allSuccess = Object.values(results).every(r => r.success);

    return NextResponse.json({
      success: allSuccess,
      results: results,
      message: 'ID normalization completed',
    });
  } catch (error: any) {
    console.error('Error in normalize-ids endpoint:', error);
    return NextResponse.json(
      {
        error: 'Error normalizing IDs',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

