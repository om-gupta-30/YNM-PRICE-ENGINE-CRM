import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// GET - Fetch related data for a sub-account (quotations, leads, tasks)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const subAccountId = parseInt(params.id);

    if (isNaN(subAccountId)) {
      return NextResponse.json(
        { error: 'Invalid sub-account ID' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Fetch quotations from all quote tables
    const [mbcbQuotes, signagesQuotes, paintQuotes] = await Promise.all([
      supabase
        .from('quotes_mbcb')
        .select('id, section, date, final_total_cost, status, created_at, sub_account_id, account_id')
        .eq('sub_account_id', subAccountId)
        .order('created_at', { ascending: false }),
      supabase
        .from('quotes_signages')
        .select('id, section, date, final_total_cost, status, created_at, sub_account_id, account_id')
        .eq('sub_account_id', subAccountId)
        .order('created_at', { ascending: false }),
      supabase
        .from('quotes_paint')
        .select('id, section, date, final_total_cost, status, created_at, sub_account_id, account_id')
        .eq('sub_account_id', subAccountId)
        .order('created_at', { ascending: false }),
    ]);

    // Combine all quotations
    const allQuotations = [
      ...(mbcbQuotes.data || []).map((q: any) => ({ ...q, table: 'quotes_mbcb' })),
      ...(signagesQuotes.data || []).map((q: any) => ({ ...q, table: 'quotes_signages' })),
      ...(paintQuotes.data || []).map((q: any) => ({ ...q, table: 'quotes_paint' })),
    ];

    // Fetch leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, lead_name, status, phone, email, created_at, sub_account_id, account_id')
      .eq('sub_account_id', subAccountId)
      .order('created_at', { ascending: false });

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
    }

    // Fetch tasks - using correct column names: title and task_type (not task_name)
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, task_type, status, due_date, created_at, sub_account_id, account_id')
      .eq('sub_account_id', subAccountId)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
    }

    return NextResponse.json({
      success: true,
      data: {
        quotations: allQuotations || [],
        leads: leads || [],
        tasks: tasks || [],
      },
    });
  } catch (error: any) {
    console.error('Error fetching sub-account related data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
