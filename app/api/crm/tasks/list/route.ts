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

    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (error: any) {
      console.error('Error creating Supabase client:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Database connection error. Please check environment variables.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    // Build query - select only needed fields (removed status_history as it might not exist)
    let query = supabase
      .from('tasks')
      .select('id, title, description, task_type, due_date, assigned_employee, assigned_to, account_id, sub_account_id, status, created_by, created_at, updated_at, completed_at', { count: 'exact' })
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false });

    // Apply filters - use assigned_employee as primary filter (it's what gets set in create)
    if (assignedTo) {
      // Filter by assigned_employee first (primary column)
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
      console.error('Query details:', { assignedTo, status, accountId, dueDateFrom, dueDateTo, errorCode: error.code, errorMessage: error.message });
      return NextResponse.json({ 
        success: false,
        error: error.message || 'Failed to fetch tasks',
        details: error.details || null,
        hint: error.hint || null,
        code: error.code || null
      }, { status: 500 });
    }

    // Log for debugging
    console.log(`[Tasks List] Fetched ${tasks?.length || 0} tasks (total: ${count || 0}), filter: assignedTo=${assignedTo || 'none'}`);

    // Fetch account and sub-account names for tasks that have them
    const accountIds = [...new Set((tasks || []).filter(t => t.account_id).map(t => t.account_id))];
    const subAccountIds = [...new Set((tasks || []).filter(t => t.sub_account_id).map(t => t.sub_account_id))];
    
    const accountMap: Record<number, string> = {};
    const subAccountMap: Record<number, string> = {};

    // Fetch account names
    if (accountIds.length > 0) {
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id, account_name')
        .in('id', accountIds);
      
      if (accountsError) {
        console.warn('Error fetching accounts:', accountsError);
      } else if (accounts) {
        accounts.forEach((acc: any) => {
          accountMap[acc.id] = acc.account_name;
        });
      }
    }

    // Fetch sub-account names
    if (subAccountIds.length > 0) {
      const { data: subAccounts, error: subAccountsError } = await supabase
        .from('sub_accounts')
        .select('id, sub_account_name')
        .in('id', subAccountIds);
      
      if (subAccountsError) {
        console.warn('Error fetching sub-accounts:', subAccountsError);
      } else if (subAccounts) {
        subAccounts.forEach((sub: any) => {
          subAccountMap[sub.id] = sub.sub_account_name;
        });
      }
    }

    // Fetch latest notes for each task from activities (optimized)
    const taskIds = (tasks || []).map(t => t.id);
    const latestNotesMap: Record<number, string> = {};
    
    if (taskIds.length > 0 && taskIds.length <= 50) {
      try {
        const { data: allActivities, error: activitiesError } = await supabase
          .from('activities')
          .select('metadata, created_at')
          .eq('activity_type', 'task')
          .order('created_at', { ascending: false })
          .limit(200);

        if (activitiesError) {
          console.warn('Error fetching activities:', activitiesError);
        } else if (allActivities) {
          const taskNotes: Record<number, { note: string; created_at: string }> = {};
          const taskIdSet = new Set(taskIds);
          
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
      } catch (notesError) {
        console.warn('Error processing task notes:', notesError);
      }
    }

    // Normalize tasks - ensure all required fields are present
    const normalizedTasks = (tasks || []).map((task: any) => {
      return {
        id: task.id,
        title: task.title || '',
        description: task.description || null,
        task_type: task.task_type || 'Follow-up',
        due_date: task.due_date,
        assigned_to: task.assigned_employee || task.assigned_to || 'Unassigned',
        account_id: task.account_id || null,
        sub_account_id: task.sub_account_id || null,
        status: task.status || 'Pending',
        created_by: task.created_by || 'System',
        account_name: task.account_id ? accountMap[task.account_id] || null : null,
        sub_account_name: task.sub_account_id ? subAccountMap[task.sub_account_id] || null : null,
        latest_note: latestNotesMap[task.id] || null,
        created_at: formatTimestampIST(task.created_at),
        updated_at: formatTimestampIST(task.updated_at),
        completed_at: task.completed_at ? formatTimestampIST(task.completed_at) : null,
        status_history: [], // Always empty array since column might not exist
      };
    });

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
    console.error('Tasks list API error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
