import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { logActivity } from '@/lib/utils/activityLogger';

// GET - Fetch a single task by ID
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

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      console.error('Error fetching task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('Get task API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a task
export async function DELETE(
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

    // Get task data before deletion for activity logging
    const { data: taskData } = await supabase
      .from('tasks')
      .select('account_id, title, created_by')
      .eq('id', taskId)
      .single();

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity for task deletion
    if (taskData) {
      try {
        await logActivity({
          account_id: taskData.account_id,
          employee_id: taskData.created_by || 'System',
          activity_type: 'delete',
          description: `Task deleted: ${taskData.title}`,
          metadata: {
            entity_type: 'task',
            task_id: taskId,
            deleted_data: taskData,
          },
        });
      } catch (activityError) {
        console.warn('Failed to log task deletion activity:', activityError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete task API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
