import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// API endpoint to reset SERIAL sequences in PostgreSQL
// Automatically resets sequences to 1 when tables become empty
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const resetResults: Record<string, { reset: boolean; count: number; message: string }> = {};

    // Check row counts and reset sequences for each table (only existing tables)
    const tables = [
      { name: 'quotes_mbcb', sequence: 'quotes_mbcb_id_seq' },
      { name: 'quotes_signages', sequence: 'quotes_signages_id_seq' },
      { name: 'quotes_paint', sequence: 'quotes_paint_id_seq' },
      { name: 'accounts', sequence: 'accounts_id_seq' },
      { name: 'sub_accounts', sequence: 'sub_accounts_id_seq' },
      { name: 'contacts', sequence: 'contacts_id_seq' },
      { name: 'tasks', sequence: 'tasks_id_seq' },
      { name: 'leads', sequence: 'leads_id_seq' },
    ];

    for (const table of tables) {
      try {
        // Check row count
        const { count, error: countError } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true });

        if (countError) {
          console.error(`Error checking count for ${table.name}:`, countError);
          resetResults[table.name] = {
            reset: false,
            count: -1,
            message: `Error: ${countError.message}`,
          };
          continue;
        }

        // If table is empty (count === 0), reset the sequence
        if (count === 0) {
          // Use Supabase RPC to call a database function that resets the sequence
          // First, try to call the reset_sequence function
          const { error: resetError } = await supabase.rpc('reset_sequence', {
            sequence_name: table.sequence,
          });

          if (resetError) {
            // If RPC function doesn't exist, use direct SQL execution via REST API
            // We'll use the Supabase REST API with service role key to execute SQL
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (supabaseUrl && serviceKey) {
              try {
                // Use Supabase's REST API to execute SQL via the query endpoint
                // Note: This requires the database function to exist or using pg_rest API
                // For now, we'll use a workaround: call the SQL function directly
                const response = await fetch(`${supabaseUrl}/rest/v1/rpc/reset_sequence`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                  },
                  body: JSON.stringify({ sequence_name: table.sequence }),
                });

                if (response.ok) {
                  console.log(`✅ Successfully reset sequence ${table.sequence} for empty table ${table.name}`);
                  resetResults[table.name] = {
                    reset: true,
                    count: 0,
                    message: `Sequence ${table.sequence} reset to 1`,
                  };
                } else {
                  // If RPC doesn't work, we need to create the function first
                  // For now, log the SQL that needs to be run
                  console.warn(`⚠️ RPC function not available. Table ${table.name} is empty. Run: ALTER SEQUENCE ${table.sequence} RESTART WITH 1;`);
                  resetResults[table.name] = {
                    reset: false,
                    count: 0,
                    message: `Table is empty but sequence reset requires database function. Run: ALTER SEQUENCE ${table.sequence} RESTART WITH 1;`,
                  };
                }
              } catch (fetchError: any) {
                console.error(`Error calling reset_sequence RPC for ${table.sequence}:`, fetchError);
                resetResults[table.name] = {
                  reset: false,
                  count: 0,
                  message: `Table is empty. Sequence reset requires database function.`,
                };
              }
            } else {
              resetResults[table.name] = {
                reset: false,
                count: 0,
                message: 'Missing Supabase configuration',
              };
            }
          } else {
            console.log(`✅ Successfully reset sequence ${table.sequence} for empty table ${table.name}`);
            resetResults[table.name] = {
              reset: true,
              count: 0,
              message: `Sequence ${table.sequence} reset to 1`,
            };
          }
        } else {
          console.log(`ℹ️ Table ${table.name} has ${count} rows. Sequence not reset.`);
          resetResults[table.name] = {
            reset: false,
            count: count || 0,
            message: `Table has ${count} rows, sequence not reset`,
          };
        }
      } catch (error: any) {
        console.error(`Error processing table ${table.name}:`, error);
        resetResults[table.name] = {
          reset: false,
          count: -1,
          message: `Error: ${error.message}`,
        };
      }
    }

    const allReset = Object.values(resetResults).every(r => r.reset || r.count > 0);
    
    return NextResponse.json({
      success: true,
      results: resetResults,
      message: 'Sequence reset check completed',
      summary: {
        tablesChecked: tables.length,
        tablesReset: Object.values(resetResults).filter(r => r.reset).length,
        emptyTables: Object.values(resetResults).filter(r => r.count === 0).length,
      },
    });
  } catch (error: any) {
    console.error('Error in reset-sequences endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Error checking and resetting sequences',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

