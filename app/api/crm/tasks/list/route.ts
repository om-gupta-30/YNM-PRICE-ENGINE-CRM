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

    // Build query - select only needed fields for better performance
    let query = supabase
      .from('tasks')
      .select('id, title, description, task_type, due_date, assigned_employee, assigned_to, account_id, sub_account_id, status, created_by, created_at, updated_at, completed_at, status_history', { count: 'exact' })
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false });

    // Apply filters
    if (assignedTo) {
      // Check both assigned_employee and assigned_to columns
      query = query.or(`assigned_employee.eq.${assignedTo},assigned_to.eq.${assignedTo}`);
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
      console.error('Query details:', { assignedTo, status, accountId, dueDateFrom, dueDateTo });
      return NextResponse.json({ 
        error: error.message,
        details: error.details || null,
        hint: error.hint || null,
        code: error.code || null
      }, { status: 500 });
    }

    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Fetched ${tasks?.length || 0} tasks (total: ${count || 0})`);
    }

    // Fetch account and sub-account names for tasks that have them
    const accountIds = [...new Set((tasks || []).filter(t => t.account_id).map(t => t.account_id))];
    const subAccountIds = [...new Set((tasks || []).filter(t => t.sub_account_id).map(t => t.sub_account_id))];
    
    const accountMap: Record<number, string> = {};
    const subAccountMap: Record<number, string> = {};

    // Fetch account names
    if (accountIds.length > 0) {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, account_name')
        .in('id', accountIds);
      
      if (accounts) {
        accounts.forEach((acc: any) => {
          accountMap[acc.id] = acc.account_name;
        });
      }
    }

    // Fetch sub-account names
    if (subAccountIds.length > 0) {
      const { data: subAccounts } = await supabase
        .from('sub_accounts')
        .select('id, sub_account_name')
        .in('id', subAccountIds);
      
      if (subAccounts) {
        subAccounts.forEach((sub: any) => {
          subAccountMap[sub.id] = sub.sub_account_name;
        });
      }
    }

    // Fetch latest notes for each task from activities (optimized - only fetch for tasks we have)
    const taskIds = (tasks || []).map(t => t.id);
    const latestNotesMap: Record<number, string> = {};
    
    if (taskIds.length > 0 && taskIds.length <= 50) { // Only fetch notes if reasonable number of tasks
      // Fetch activities for these specific tasks only (more efficient)
      // Note: We fetch recent activities and filter, as Supabase doesn't support JSONB filtering well
      const { data: allActivities } = await supabase
        .from('activities')
        .select('metadata, created_at')
        .eq('activity_type', 'task')
        .order('created_at', { ascending: false })
        .limit(200); // Reduced from 1000 - only get recent activities

      if (allActivities) {
        // Group by task_id and get the most recent note for each task
        const taskNotes: Record<number, { note: string; created_at: string }> = {};
        const taskIdSet = new Set(taskIds); // Use Set for O(1) lookup
        
        allActivities.forEach((activity: any) => {
          const metadata = activity.metadata || {};
          const taskIdFromMeta = metadata.task_id || metadata.taskId;
          if (taskIdFromMeta && metadata.status_note) {
            const taskIdNum = parseInt(taskIdFromMeta.toString());
            if (taskIdSet.has(taskIdNum)) {
              if (!taskNotes[taskIdNum] || new Date(activity.created_at) > new Date(taskNotes[taskIdNum].created_at)) {
                taskNotes[taskIdNum] = {
                  note: metadata.status_note,
                  created_at: activity.created_at,
                };
              }
            }
          }
        });
        
        Object.keys(taskNotes).forEach(taskId => {
          latestNotesMap[parseInt(taskId)] = taskNotes[parseInt(taskId)].note;
        });
      }
    }

    // Normalize tasks - ensure assigned_to is set from assigned_employee and format timestamps
    // Also ensure account_id and sub_account_id are preserved, and add account/sub-account names
    const normalizedTasks = (tasks || []).map((task: any) => ({
      ...task,
      assigned_to: task.assigned_employee || task.assigned_to || 'Unassigned',
      account_id: task.account_id || null, // Explicitly preserve account_id
      sub_account_id: task.sub_account_id || null, // Explicitly preserve sub_account_id
      account_name: task.account_id ? accountMap[task.account_id] || null : null,
      sub_account_name: task.sub_account_id ? subAccountMap[task.sub_account_id] || null : null,
      latest_note: latestNotesMap[task.id] || null,
      created_at: formatTimestampIST(task.created_at),
      updated_at: formatTimestampIST(task.updated_at),
      completed_at: task.completed_at ? formatTimestampIST(task.completed_at) : null,
      // Format status_history timestamps (only if column exists)
      status_history: task.status_history && Array.isArray(task.status_history)
        ? task.status_history.map((entry: any) => {
            const { changed_at, ...rest } = entry;
            return {
              ...rest,
              changed_at: changed_at ? formatTimestampIST(changed_at) : null,
            };
          })
        : [],
    }));

    const response = NextResponse.json({
      success: true,
      tasks: normalizedTasks,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

    // Add caching headers for better performance (cache for 30 seconds)
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    
    return response;
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Tasks list API error:', error);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

