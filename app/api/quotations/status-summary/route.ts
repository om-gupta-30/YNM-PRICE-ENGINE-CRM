import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// GET - Get quotation status summary for pie chart
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';
    const accountId = searchParams.get('accountId');

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

    // Build queries for all quotation tables
    let mbcbQuery = supabase.from('quotes_mbcb').select('status');
    let signagesQuery = supabase.from('quotes_signages').select('status');
    let paintQuery = supabase.from('quotes_paint').select('status');

    // Apply filters
    if (!isAdmin && employeeUsername) {
      mbcbQuery = mbcbQuery.eq('created_by', employeeUsername);
      signagesQuery = signagesQuery.eq('created_by', employeeUsername);
      paintQuery = paintQuery.eq('created_by', employeeUsername);
    }

    if (accountId) {
      mbcbQuery = mbcbQuery.eq('account_id', parseInt(accountId));
      signagesQuery = signagesQuery.eq('account_id', parseInt(accountId));
      paintQuery = paintQuery.eq('account_id', parseInt(accountId));
    }

    const [mbcbResult, signagesResult, paintResult] = await Promise.all([
      mbcbQuery,
      signagesQuery,
      paintQuery,
    ]);

    // Combine all quotations
    const allQuotes = [
      ...(mbcbResult.data || []),
      ...(signagesResult.data || []),
      ...(paintResult.data || []),
    ];

    // Count by status
    const statusCounts: Record<string, number> = {
      'Drafted': 0,
      'Sent': 0,
      'On Hold': 0,
      'In Negotiations': 0,
      'Closed Won': 0,
      'Closed Lost': 0,
    };

    allQuotes.forEach((quote: any) => {
      const status = quote.status || 'draft';
      let statusKey = 'Drafted';

      switch (status.toLowerCase()) {
        case 'draft':
          statusKey = 'Drafted';
          break;
        case 'sent':
          statusKey = 'Sent';
          break;
        case 'on_hold':
          statusKey = 'On Hold';
          break;
        case 'negotiation':
          statusKey = 'In Negotiations';
          break;
        case 'closed_won':
          statusKey = 'Closed Won';
          break;
        case 'closed_lost':
          statusKey = 'Closed Lost';
          break;
      }

      statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
    });

    // Convert to array format for chart
    const data = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Status summary API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

