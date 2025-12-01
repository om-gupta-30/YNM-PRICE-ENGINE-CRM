import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

// GET - Fetch all tasks with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignedTo = searchParams.get('assigned_to');
    const status = searchParams.get('status');
    const accountId = searchParams.get('account_id');
    const dueDateFrom = searchParams.get('due_date_from');
    const dueDateTo = searchParams.get('due_date_to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const supabase = createSupabaseServerClient();

    // Build query
    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false });

    // Apply filters
    if (assignedTo) {
      query = query.eq('assigned_employee', assignedTo);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (accountId) {
      query = query.eq('account_id', parseInt(accountId));
    }

    if (dueDateFrom) {
      query = query.gte('due_date', dueDateFrom);
    }

    if (dueDateTo) {
      query = query.lte('due_date', dueDateTo);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Normalize tasks - ensure assigned_to is set from assigned_employee and format timestamps
    const normalizedTasks = (tasks || []).map((task: any) => ({
      ...task,
      assigned_to: task.assigned_employee || task.assigned_to || 'Unassigned',
      created_at: formatTimestampIST(task.created_at),
      updated_at: formatTimestampIST(task.updated_at),
      completed_at: task.completed_at ? formatTimestampIST(task.completed_at) : null,
      // Format status_history timestamps
      status_history: (task.status_history || []).map((entry: any) => {
        const { changed_at, ...rest } = entry;
        return {
          ...rest,
          changed_at: changed_at ? formatTimestampIST(changed_at) : null,
        };
      }),
    }));

    return NextResponse.json({
      success: true,
      tasks: normalizedTasks,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Tasks list API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

