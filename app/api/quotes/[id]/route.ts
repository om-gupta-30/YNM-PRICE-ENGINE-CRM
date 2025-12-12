import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const productType = searchParams.get('product_type'); // 'mbcb', 'signages', 'paint'

    if (!id) {
      return NextResponse.json(
        { error: 'Quotation ID is required' },
        { status: 400 }
      );
    }

    const quotationId = parseInt(id, 10);
    if (isNaN(quotationId)) {
      return NextResponse.json(
        { error: 'Invalid quotation ID' },
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

    // Determine table name
    let tableName: string | null;
    if (productType) {
      tableName = productType === 'mbcb' ? 'quotes_mbcb' 
                  : productType === 'signages' ? 'quotes_signages'
                  : productType === 'paint' ? 'quotes_paint'
                  : null;
      
      if (!tableName) {
        return NextResponse.json({ error: 'Invalid product_type' }, { status: 400 });
      }
    } else {
      // If product_type not provided, try to find in all tables
      const [mbcbResult, signagesResult, paintResult] = await Promise.all([
        supabase.from('quotes_mbcb').select('*').eq('id', quotationId).single(),
        supabase.from('quotes_signages').select('*').eq('id', quotationId).single(),
        supabase.from('quotes_paint').select('*').eq('id', quotationId).single(),
      ]);

      if (mbcbResult.data) {
        return NextResponse.json({ data: mbcbResult.data }, { status: 200 });
      } else if (signagesResult.data) {
        return NextResponse.json({ data: signagesResult.data }, { status: 200 });
      } else if (paintResult.data) {
        return NextResponse.json({ data: paintResult.data }, { status: 200 });
      } else {
        return NextResponse.json(
          { error: 'Quotation not found' },
          { status: 404 }
        );
      }
    }

    // Query the specific table
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', quotationId)
      .single();

    if (error) {
      console.error(`Error fetching quote from ${tableName}:`, error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Quotation not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Failed to fetch quotation' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const productType = searchParams.get('product_type'); // 'mbcb', 'signages', 'paint'

    if (!id) {
      return NextResponse.json(
        { error: 'Quotation ID is required' },
        { status: 400 }
      );
    }

    const quotationId = parseInt(id, 10);
    if (isNaN(quotationId)) {
      return NextResponse.json(
        { error: 'Invalid quotation ID' },
        { status: 400 }
      );
    }

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
      pdf_estimate_number,
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

    // Determine table name
    let tableName: string | null;
    if (productType) {
      tableName = productType === 'mbcb' ? 'quotes_mbcb' 
                  : productType === 'signages' ? 'quotes_signages'
                  : productType === 'paint' ? 'quotes_paint'
                  : null;
      
      if (!tableName) {
        return NextResponse.json({ error: 'Invalid product_type' }, { status: 400 });
      }
    } else {
      // Use section to determine table
      tableName = getTableName(section);
    }

    // Handle sub-account lookup if sub_account_name is provided
    let finalSubAccountId = sub_account_id || null;
    let finalAccountId = account_id || null;
    
    if (!finalSubAccountId && sub_account_name) {
      let subAccountQuery = supabase
        .from('sub_accounts')
        .select('id, sub_account_name, account_id, accounts:account_id(account_name)')
        .eq('sub_account_name', sub_account_name)
        .eq('is_active', true);
      
      if (finalAccountId) {
        subAccountQuery = subAccountQuery.eq('account_id', finalAccountId);
      }
      
      const { data: subAccountData } = await subAccountQuery
        .limit(1)
        .single();
      
      if (subAccountData) {
        finalSubAccountId = subAccountData.id;
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

    // Prepare update data
    let updateData: any = {
      section,
      state_id,
      city_id,
      sub_account_id: finalSubAccountId,
      contact_id: contact_id || null,
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
      pdf_estimate_number: pdf_estimate_number || null, // Preserve estimate number
      raw_payload: raw_payload || null,
      is_saved: is_saved !== undefined ? is_saved : false,
    };

    // Add table-specific fields
    if (tableName === 'quotes_mbcb') {
      updateData.quantity_rm = quantity_rm || null;
      updateData.total_weight_per_rm = total_weight_per_rm || null;
      updateData.total_cost_per_rm = total_cost_per_rm || null;
    } else if (tableName === 'quotes_signages' || tableName === 'quotes_paint') {
      updateData.quantity = raw_payload?.quantity || null;
      updateData.area_sq_ft = raw_payload?.areaSqFt || null;
      updateData.cost_per_piece = raw_payload?.costPerPiece || null;
    }

    const { data, error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', quotationId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating quote in ${tableName}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

