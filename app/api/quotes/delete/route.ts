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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
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
    let tableName: string;
    if (productType) {
      tableName = productType === 'mbcb' ? 'quotes_mbcb' 
                : productType === 'signages' ? 'quotes_signages'
                : productType === 'paint' ? 'quotes_paint'
                : 'quotes_mbcb';
    } else {
      // If product_type not provided, try to find the quote in all tables
      // First, try to get the quote to determine its section
      const [mbcbResult, signagesResult, paintResult] = await Promise.all([
        supabase.from('quotes_mbcb').select('section').eq('id', quotationId).single(),
        supabase.from('quotes_signages').select('section').eq('id', quotationId).single(),
        supabase.from('quotes_paint').select('section').eq('id', quotationId).single(),
      ]);

      if (mbcbResult.data) {
        tableName = 'quotes_mbcb';
      } else if (signagesResult.data) {
        tableName = 'quotes_signages';
      } else if (paintResult.data) {
        tableName = 'quotes_paint';
      } else {
        return NextResponse.json(
          { error: 'Quotation not found' },
          { status: 404 }
        );
      }
    }

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', quotationId);

    if (error) {
      console.error(`Error deleting quote from ${tableName}:`, error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete quotation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

