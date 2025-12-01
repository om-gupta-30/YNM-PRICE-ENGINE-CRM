import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

// GET - Fetch related data for an account (quotations, leads, tasks)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const accountId = parseInt(params.id);

    if (isNaN(accountId)) {
      return NextResponse.json(
        { error: 'Invalid account ID' },
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

    // First, get all sub-accounts for this account
    const { data: subAccounts, error: subAccountsError } = await supabase
      .from('sub_accounts')
      .select('id')
      .eq('account_id', accountId)
      .eq('is_active', true);

    const subAccountIds = subAccounts?.map(sa => sa.id) || [];

    // Fetch all related data in parallel
    const [
      { data: quotationsMbcb },
      { data: quotationsSignages },
      { data: quotationsPaint },
      { data: leads },
      { data: tasks },
    ] = await Promise.all([
      // Fetch quotations via sub-accounts
      subAccountIds.length > 0
        ? supabase.from('quotes_mbcb').select('*').in('sub_account_id', subAccountIds)
        : Promise.resolve({ data: [], error: null }),
      subAccountIds.length > 0
        ? supabase.from('quotes_signages').select('*').in('sub_account_id', subAccountIds)
        : Promise.resolve({ data: [], error: null }),
      subAccountIds.length > 0
        ? supabase.from('quotes_paint').select('*').in('sub_account_id', subAccountIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('leads').select('*').eq('account_id', accountId),
      supabase.from('tasks').select('*').eq('account_id', accountId),
    ]);

    const allQuotations = [
      ...(quotationsMbcb || []).map((q: any) => ({ 
        ...q, 
        section: 'MBCB',
        created_at: formatTimestampIST(q.created_at),
        updated_at: q.updated_at ? formatTimestampIST(q.updated_at) : null,
      })),
      ...(quotationsSignages || []).map((q: any) => ({ 
        ...q, 
        section: 'Signages',
        created_at: formatTimestampIST(q.created_at),
        updated_at: q.updated_at ? formatTimestampIST(q.updated_at) : null,
      })),
      ...(quotationsPaint || []).map((q: any) => ({ 
        ...q, 
        section: 'Paint',
        created_at: formatTimestampIST(q.created_at),
        updated_at: q.updated_at ? formatTimestampIST(q.updated_at) : null,
      })),
    ];

    // Format timestamps for leads and tasks
    const formattedLeads = (leads || []).map((lead: any) => ({
      ...lead,
      created_at: formatTimestampIST(lead.created_at),
      updated_at: formatTimestampIST(lead.updated_at),
    }));

    const formattedTasks = (tasks || []).map((task: any) => ({
      ...task,
      created_at: formatTimestampIST(task.created_at),
      updated_at: formatTimestampIST(task.updated_at),
      completed_at: task.completed_at ? formatTimestampIST(task.completed_at) : null,
      status_history: (task.status_history || []).map((entry: any) => ({
        ...entry,
        changed_at: entry.changed_at ? formatTimestampIST(entry.changed_at) : null,
      })),
    }));

    return NextResponse.json({
      data: {
        quotations: allQuotations,
        leads: formattedLeads,
        tasks: formattedTasks,
      },
    });
  } catch (error: any) {
    console.error('Get account related data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

