import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

// GET - Fetch complete task history including creation and all activities
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const taskId = parseInt(params.id);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Fetch task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, created_by, created_at, status, account_id, sub_account_id')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Fetch all activities related to this task
    // First, get all task activities, then filter by task_id in metadata
    const { data: allActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, employee_id, activity_type, description, metadata, created_at')
      .eq('activity_type', 'task')
      .order('created_at', { ascending: true });

    // Filter activities that match this task_id
    const activities = (allActivities || []).filter((activity: any) => {
      const metadata = activity.metadata || {};
      const taskIdFromMeta = metadata.task_id || metadata.taskId;
      return taskIdFromMeta === taskId || taskIdFromMeta === taskId.toString() || parseInt(taskIdFromMeta) === taskId;
    });

    // Build history array
    const history: any[] = [];

    // Add task creation as first entry
    history.push({
      type: 'created',
      action: 'Task created',
      description: `Task "${task.title}" was created`,
      changed_by: task.created_by || 'System',
      changed_at: task.created_at,
      metadata: {
        title: task.title,
        status: task.status,
        account_id: task.account_id,
        sub_account_id: task.sub_account_id,
      },
    });

    // Add activities (status changes and other edits)
    if (activities && !activitiesError) {
      activities.forEach((activity: any) => {
        const metadata = activity.metadata || {};
        const taskIdFromMeta = metadata.task_id || metadata.taskId;

        // Only include activities for this task
        if (taskIdFromMeta === taskId || taskIdFromMeta === taskId.toString() || parseInt(taskIdFromMeta) === taskId) {
          // Status change
          if (metadata.old_status && metadata.new_status) {
            history.push({
              type: 'status_change',
              action: 'Status updated',
              description: activity.description || `Status changed: ${metadata.old_status} → ${metadata.new_status}`,
              changed_by: activity.employee_id || 'System',
              changed_at: activity.created_at,
              metadata: {
                old_status: metadata.old_status,
                new_status: metadata.new_status,
                status_note: metadata.status_note || null,
              },
            });
          } else {
            // Other task-related activity
            history.push({
              type: 'edit',
              action: 'Task updated',
              description: activity.description || 'Task was updated',
              changed_by: activity.employee_id || 'System',
              changed_at: activity.created_at,
              metadata: metadata,
            });
          }
        }
      });
    }

    // Sort by timestamp (newest first - reverse chronological)
    history.sort((a, b) => {
      const timeA = new Date(a.changed_at).getTime();
      const timeB = new Date(b.changed_at).getTime();
      return timeB - timeA; // Reverse order - newest first
    });

    const response = NextResponse.json({
      success: true,
      history: history.map(entry => ({
        ...entry,
        changed_at: formatTimestampIST(entry.changed_at),
      })),
    });

    // Add caching headers (cache for 60 seconds)
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    return response;
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Task history API error:', error);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

