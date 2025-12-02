import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, productType } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one quotation ID' },
        { status: 400 }
      );
    }

    if (!productType || !['mbcb', 'signages', 'paint'].includes(productType)) {
      return NextResponse.json(
        { error: 'Invalid product type. Must be mbcb, signages, or paint' },
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
    
    // Determine table name based on product type
    const tableName = `quotes_${productType}`;
    
    // Fetch quotations from Supabase
    const { data: quotes, error } = await supabase
      .from(tableName)
      .select('*')
      .in('id', ids)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching quotes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quotations' },
        { status: 500 }
      );
    }

    if (!quotes || quotes.length === 0) {
      return NextResponse.json(
        { error: 'No quotations found with the provided IDs' },
        { status: 404 }
      );
    }

    // Validate all quotes are from the same product type
    const allSameType = quotes.every(q => {
      // Additional validation can be added here
      return true;
    });

    if (!allSameType) {
      return NextResponse.json(
        { error: 'Cannot merge quotations from different product types' },
        { status: 400 }
      );
    }

    // PDF generation feature is disabled
    return NextResponse.json(
      { error: 'PDF generation feature is currently disabled' },
      { status: 501 }
    );

  } catch (error: any) {
    console.error('Error in merge-quotes API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

