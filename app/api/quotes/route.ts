import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { logQuotationSaveActivity } from '@/lib/utils/activityLogger';
import { triggerKnowledgeSync } from '@/lib/ai/knowledgeSync';

// Helper function to determine which table to use based on section
function getTableName(section: string): string {
  const sectionLower = section.toLowerCase();
  
  if (sectionLower.includes('signages') || sectionLower.includes('reflective')) {
    return 'quotes_signages';
  } else if (sectionLower.includes('paint')) {
    return 'quotes_paint';
  } else {
    // Default to MBCB for W-Beam, Thrie, Double W-Beam, etc.
    return 'quotes_mbcb';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      section,
      state_id,
      city_id,
      account_id,
      sub_account_name,
      sub_account_id,
      contact_id,
      purpose,
      date,
      quantity_rm,
      total_weight_per_rm,
      total_cost_per_rm,
      final_total_cost,
      competitor_price_per_unit,
      client_demand_price_per_unit,
      ai_suggested_price_per_unit,
      ai_win_probability,
      ai_pricing_insights,
      raw_payload,
      created_by,
      is_saved,
    } = body;

    // Validate required fields
    if (!section || !state_id || !city_id || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: section, state_id, city_id, date' },
        { status: 400 }
      );
    }

    // sub_account_name or sub_account_id must be provided
    if (!sub_account_name && !sub_account_id) {
      return NextResponse.json(
        { error: 'Either sub_account_name or sub_account_id is required' },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (error: any) {
      console.error('Error creating Supabase client:', error);
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    const tableName = getTableName(section);

    // Handle sub-account lookup if sub_account_name is provided
    let finalSubAccountId = sub_account_id || null;
    let finalAccountId = account_id || null;
    
    if (!finalSubAccountId && sub_account_name) {
      // Find sub-account by name (optionally filter by account_id if provided)
      let subAccountQuery = supabase
        .from('sub_accounts')
        .select('id, sub_account_name, account_id, accounts:account_id(account_name)')
        .eq('sub_account_name', sub_account_name)
        .eq('is_active', true);
      
      // If account_id is provided, filter by it
      if (finalAccountId) {
        subAccountQuery = subAccountQuery.eq('account_id', finalAccountId);
      }
      
      const { data: subAccountData } = await subAccountQuery
        .limit(1)
        .single();
      
      if (subAccountData) {
        finalSubAccountId = subAccountData.id;
        // If account_id wasn't provided, get it from sub-account
        if (!finalAccountId) {
          finalAccountId = subAccountData.account_id;
        }
      }
    }

    if (!finalSubAccountId) {
      return NextResponse.json(
        { error: 'Sub-account not found. Please ensure sub_account_name is correct.' },
        { status: 400 }
      );
    }

    // Prepare insert data based on table type
    // Note: account_id column may not exist in quotes_mbcb/quotes_signages/quotes_paint tables
    // The relationship to accounts is maintained through sub_account_id → sub_accounts → accounts
    let insertData: any = {
      section,
      state_id,
      city_id,
      sub_account_id: finalSubAccountId,
      contact_id: contact_id || null,
      // Legacy field - provide fallback value for backward compatibility
      place_of_supply: `State:${state_id}, City:${city_id}`,
      customer_name: sub_account_name || 'N/A',
      purpose: purpose || null,
      date,
      final_total_cost: final_total_cost || null,
      competitor_price_per_unit: competitor_price_per_unit || null,
      client_demand_price_per_unit: client_demand_price_per_unit || null,
      ai_suggested_price_per_unit: ai_suggested_price_per_unit || null,
      ai_win_probability: ai_win_probability || null,
      ai_pricing_insights: ai_pricing_insights || null,
      raw_payload: raw_payload || null,
      created_by: created_by || null,
      is_saved: is_saved !== undefined ? is_saved : false,
    };

    // Add table-specific fields based on new schema
    if (tableName === 'quotes_mbcb') {
      insertData.quantity_rm = quantity_rm || null;
      insertData.total_weight_per_rm = total_weight_per_rm || null;
      insertData.total_cost_per_rm = total_cost_per_rm || null;
    } else if (tableName === 'quotes_signages' || tableName === 'quotes_paint') {
      // Extract from raw_payload if not provided directly
      insertData.quantity = raw_payload?.quantity || null;
      insertData.area_sq_ft = raw_payload?.areaSqFt || null;
      insertData.cost_per_piece = raw_payload?.costPerPiece || null;
    }

    // Ensure status and history fields are set (from new schema)
    if (!insertData.status) {
      insertData.status = 'draft';
    }
    if (!insertData.status_history) {
      insertData.status_history = [];
    }
    if (!insertData.comments_history) {
      insertData.comments_history = [];
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error(`Error inserting quote into ${tableName}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity and update related products (non-blocking - fire and forget)
    Promise.resolve().then(async () => {
      try {
        const { data: subAccountData } = await supabase
          .from('sub_accounts')
          .select('sub_account_name, accounts:account_id(account_name)')
          .eq('id', finalSubAccountId)
          .single();

        const accountsArray = subAccountData?.accounts as any;
        const accountName = (Array.isArray(accountsArray) ? accountsArray[0]?.account_name : accountsArray?.account_name) || 'Unknown Account';
        const subAccountName = subAccountData?.sub_account_name || 'Unknown Sub-Account';

        // Determine product name from section
        const getProductName = (sectionName: string): string => {
          const sectionLower = sectionName.toLowerCase();
          if (sectionLower.includes('w-beam') || sectionLower.includes('thrie') || sectionLower.includes('double')) {
            return 'MBCB';
          } else if (sectionLower.includes('signages') || sectionLower.includes('reflective')) {
            return 'Signages';
          } else if (sectionLower.includes('paint')) {
            return 'Paint';
          }
          // Return a normalized version of the section name
          return sectionName.split(' ')[0] || sectionName;
        };

        const productName = getProductName(section);

        // Update account's related_products if account_id exists
        if (finalAccountId) {
          try {
            // Get current related_products
            const { data: accountData } = await supabase
              .from('accounts')
              .select('related_products')
              .eq('id', finalAccountId)
              .single();

            if (accountData) {
              // Get current products array (handle both TEXT[] and JSONB)
              let currentProducts: string[] = [];
              if (Array.isArray(accountData.related_products)) {
                currentProducts = accountData.related_products;
              } else if (accountData.related_products && typeof accountData.related_products === 'string') {
                // Handle if it's stored as a string
                try {
                  currentProducts = JSON.parse(accountData.related_products);
                } catch {
                  currentProducts = [accountData.related_products];
                }
              }

              // Add product if not already in the array
              if (!currentProducts.includes(productName)) {
                const updatedProducts = [...currentProducts, productName];

                // Update account with new related_products
                await supabase
                  .from('accounts')
                  .update({ 
                    related_products: updatedProducts,
                    updated_at: getCurrentISTTime(),
                  })
                  .eq('id', finalAccountId);
              }
            }
          } catch (productUpdateError) {
            console.warn('Failed to update related_products:', productUpdateError);
            // Don't fail the quotation creation if product update fails
          }
        }

        // Log quotation save activity
        await logQuotationSaveActivity({
          employee_id: created_by || 'System',
          quotationId: data.id,
          section,
          accountName,
          subAccountName,
          metadata: {
            final_total_cost,
            product_added: productName,
          },
        });
      } catch (activityError) {
        console.warn('Failed to log quotation activity:', activityError);
      }
    }).catch(() => {
      // Silent fail for background operations
    });

    // Trigger AI knowledge sync (fire-and-forget)
    triggerKnowledgeSync({ type: 'quotation', entityId: data.id });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Reduce default limit for free tier performance (50 is reasonable)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200); // Max 200 for free tier
    const productType = searchParams.get('product_type') || searchParams.get('section'); // 'mbcb', 'signages', 'paint', or null for all
    const createdBy = searchParams.get('created_by');

    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (error: any) {
      console.error('Error creating Supabase client:', error);
      return NextResponse.json(
        { data: [], error: 'Database connection error' },
        { status: 500 }
      );
    }

    // If product_type is specified, query only that table
    if (productType) {
      const tableName = productType === 'mbcb' ? 'quotes_mbcb' 
                      : productType === 'signages' ? 'quotes_signages'
                      : productType === 'paint' ? 'quotes_paint'
                      : null;
      
      if (!tableName) {
        return NextResponse.json({ error: 'Invalid product_type' }, { status: 400 });
      }

      let query = supabase
        .from(tableName)
        .select('*');
      
      // Filter by created_by if provided
      if (createdBy) {
        query = query.eq('created_by', createdBy);
      }
      
      query = query.order('created_at', { ascending: false }).limit(limit);
      
      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching quotes from ${tableName}:`, error);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        return NextResponse.json(
          { error: error.message || 'Failed to fetch quotes', code: error.code },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    }

    // If no product_type specified, fetch from all tables and combine
    const buildQuery = async (tableName: string) => {
      try {
        let query = supabase.from(tableName).select('*');
        if (createdBy) {
          query = query.eq('created_by', createdBy);
        }
        const result = await query.order('created_at', { ascending: false }).limit(limit);
        return result;
      } catch (error: any) {
        console.error(`Error building query for ${tableName}:`, error);
        return { data: null, error: { message: error?.message || 'Query failed', code: error?.code } };
      }
    };
    
    // Use Promise.allSettled to handle individual failures gracefully
    const [mbcbResult, signagesResult, paintResult] = await Promise.all([
      buildQuery('quotes_mbcb'),
      buildQuery('quotes_signages'),
      buildQuery('quotes_paint'),
    ]);

    // Log all errors for debugging, but continue with available data
    if (mbcbResult.error) {
      console.error('quotes_mbcb error:', JSON.stringify(mbcbResult.error, null, 2));
    }
    if (signagesResult.error) {
      console.error('quotes_signages error:', JSON.stringify(signagesResult.error, null, 2));
    }
    if (paintResult.error) {
      console.error('quotes_paint error:', JSON.stringify(paintResult.error, null, 2));
    }

    // Continue with available data even if some tables fail
    // This provides graceful degradation
    const hasAnyError = mbcbResult.error || signagesResult.error || paintResult.error;
    const hasAnyData = (mbcbResult.data && mbcbResult.data.length > 0) || 
                       (signagesResult.data && signagesResult.data.length > 0) || 
                       (paintResult.data && paintResult.data.length > 0);
    
    // If all queries failed, return error
    if (hasAnyError && !hasAnyData) {
      const error = mbcbResult.error || signagesResult.error || paintResult.error;
      console.error('Error fetching quotes - Full error object:', JSON.stringify(error, null, 2));
      
      // Check for RLS errors
      if (error?.message?.includes('permission denied') || error?.code === '42501') {
        console.error('RLS ERROR: Row Level Security is blocking access. Run docs/RLS_POLICIES_SETUP.sql');
        return NextResponse.json({ 
          error: 'Database permission error. Please run RLS policies setup script.',
          code: 'RLS_ERROR',
          details: 'Tables may have RLS enabled. Run docs/RLS_POLICIES_SETUP.sql in Supabase SQL Editor.'
        }, { status: 500 });
      }
      
      // Check if tables don't exist
      if (error?.message?.includes('does not exist') || error?.code === '42P01') {
        console.error('TABLE ERROR: Tables do not exist. Run database setup script.');
        return NextResponse.json({ 
          error: 'Database tables not found. Please run database setup script.',
          code: 'TABLE_NOT_FOUND'
        }, { status: 500 });
      }
      
      // Check for fetch/network errors
      if (error?.message?.includes('fetch failed') || error?.message?.includes('TypeError')) {
        console.error('NETWORK ERROR: Failed to connect to database.');
        return NextResponse.json({ 
          error: 'Database connection failed. Please check your network connection and Supabase configuration.',
          code: 'NETWORK_ERROR'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: error?.message || 'Error fetching quotes',
        code: error?.code || 'UNKNOWN_ERROR',
        fullError: process.env.NODE_ENV === 'development' ? error : undefined
      }, { status: 500 });
    }

    // Combine all results and sort by created_at
    // Handle cases where data might be null
    const allQuotes = [
      ...(mbcbResult.data || []),
      ...(signagesResult.data || []),
      ...(paintResult.data || []),
    ].filter(quote => quote !== null && quote !== undefined)
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA; // Descending order
    }).slice(0, limit);

    return NextResponse.json({ data: allQuotes || [] });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

