import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';

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

    if (isAdmin) {
      const [
        { data: accounts, error: accountsError },
        { data: leads, error: leadsError },
        { data: tasks, error: tasksError },
        { data: quotesMbcb, error: quotesMbcbError },
        { data: quotesSignages, error: quotesSignagesError },
        { data: quotesPaint, error: quotesPaintError },
      ] = await Promise.all([
        supabase.from('accounts').select('id'),
        supabase.from('leads').select('id, status'),
        supabase.from('tasks').select('id, status, due_date, task_type'),
        supabase.from('quotes_mbcb').select('id, final_total_cost, status, created_by'),
        supabase.from('quotes_signages').select('id, final_total_cost, status, created_by'),
        supabase.from('quotes_paint').select('id, final_total_cost, status, created_by'),
      ]);

      if (accountsError) console.error('Error fetching accounts:', accountsError);
      if (leadsError) console.error('Error fetching leads:', leadsError);
      if (tasksError) console.error('Error fetching tasks:', tasksError);
      if (quotesMbcbError) console.error('Error fetching quotes_mbcb:', quotesMbcbError);
      if (quotesSignagesError) console.error('Error fetching quotes_signages:', quotesSignagesError);
      if (quotesPaintError) console.error('Error fetching quotes_paint:', quotesPaintError);

      const allQuotes = [
        ...(quotesMbcb || []),
        ...(quotesSignages || []),
        ...(quotesPaint || []),
      ];

      const totalCustomers = accounts?.length || 0;
      const totalLeads = leads?.length || 0;
      const totalQuotations = allQuotes.length;
      const totalQuotationValue = allQuotes.reduce((sum, q) => sum + (q.final_total_cost || 0), 0);
      const sentQuotations = allQuotes.filter(q => q.status === 'sent' || q.status === 'negotiation').length;
      const closedWonQuotations = allQuotes.filter(q => q.status === 'closed_won').length;
      const conversionRate = totalQuotations > 0 ? (closedWonQuotations / totalQuotations) * 100 : 0;

      const employeeStats: Record<string, { count: number; value: number }> = {};
      allQuotes.forEach((q: any) => {
        const emp = q.created_by || 'Unknown';
        if (!employeeStats[emp]) {
          employeeStats[emp] = { count: 0, value: 0 };
        }
        employeeStats[emp].count++;
        employeeStats[emp].value += q.final_total_cost || 0;
      });

      const topEmployees = Object.entries(employeeStats)
        .map(([employee, stats]) => ({
          employee,
          ...stats,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const today = new Date().toISOString().split('T')[0];
      const tasksDueToday = tasks?.filter(t => t.due_date === today && t.status !== 'Completed').length || 0;

      // Calculate product breakdown
      const mbcbQuotes = quotesMbcb || [];
      const signagesQuotes = quotesSignages || [];
      const paintQuotes = quotesPaint || [];

      const productBreakdown = {
        mbcb: {
          count: mbcbQuotes.length,
          value: mbcbQuotes.reduce((sum: number, q: any) => sum + (q.final_total_cost || 0), 0),
        },
        signages: {
          count: signagesQuotes.length,
          value: signagesQuotes.reduce((sum: number, q: any) => sum + (q.final_total_cost || 0), 0),
        },
        paint: {
          count: paintQuotes.length,
          value: paintQuotes.reduce((sum: number, q: any) => sum + (q.final_total_cost || 0), 0),
        },
      };

      return NextResponse.json({
        data: {
          totalCustomers,
          totalLeads,
          totalQuotations,
          totalQuotationValue,
          sentQuotations,
          closedWonQuotations,
          conversionRate: conversionRate.toFixed(2),
          topEmployees,
          tasksDueToday,
          productBreakdown,
        },
      });
    } else {
      if (!employeeUsername) {
        return NextResponse.json(
          { error: 'Employee username required' },
          { status: 400 }
        );
      }

      const [
        { data: accounts, error: accountsError },
        { data: leads, error: leadsError },
        { data: tasks, error: tasksError },
        { data: quotesMbcb, error: quotesMbcbError },
        { data: quotesSignages, error: quotesSignagesError },
        { data: quotesPaint, error: quotesPaintError },
      ] = await Promise.all([
        supabase.from('accounts').select('id').eq('assigned_employee', employeeUsername),
        supabase.from('leads').select('id, status').eq('assigned_employee', employeeUsername),
        supabase.from('tasks').select('id, status, due_date, task_type').eq('assigned_to', employeeUsername),
        supabase.from('quotes_mbcb').select('id, final_total_cost').eq('created_by', employeeUsername),
        supabase.from('quotes_signages').select('id, final_total_cost').eq('created_by', employeeUsername),
        supabase.from('quotes_paint').select('id, final_total_cost').eq('created_by', employeeUsername),
      ]);

      if (accountsError) console.error('Error fetching accounts:', accountsError);
      if (leadsError) console.error('Error fetching leads:', leadsError);
      if (tasksError) console.error('Error fetching tasks:', tasksError);
      if (quotesMbcbError) console.error('Error fetching quotes_mbcb:', quotesMbcbError);
      if (quotesSignagesError) console.error('Error fetching quotes_signages:', quotesSignagesError);
      if (quotesPaintError) console.error('Error fetching quotes_paint:', quotesPaintError);

      const allQuotes = [
        ...(quotesMbcb || []),
        ...(quotesSignages || []),
        ...(quotesPaint || []),
      ];

      const assignedCustomers = accounts?.length || 0;
      const assignedLeads = leads?.length || 0;
      const quotationsCreated = allQuotes.length;
      const totalQuotationValue = allQuotes.reduce((sum, q) => sum + (q.final_total_cost || 0), 0);

      const today = new Date().toISOString().split('T')[0];
      const tasksDueToday = tasks?.filter(t => t.due_date === today && t.status !== 'Completed').length || 0;
      const pendingFollowUps = tasks?.filter(t => t.task_type === 'Follow-up' && t.status === 'Pending').length || 0;

      return NextResponse.json({
        data: {
          assignedCustomers,
          assignedLeads,
          quotationsCreated,
          totalQuotationValue,
          tasksDueToday,
          pendingFollowUps,
        },
      });
    }
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

