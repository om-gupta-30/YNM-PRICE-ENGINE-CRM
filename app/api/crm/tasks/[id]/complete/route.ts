import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';

// POST - Mark task as completed
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const taskId = parseInt(params.id);
    const body = await request.json();
    const { completed_by } = body;

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get task first
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Update task to completed
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'Completed',
        completed_at: getCurrentISTTime(),
        updated_at: getCurrentISTTime(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error completing task:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create activity record
    try {
      await supabase.from('activities').insert({
        account_id: task.account_id || null,
        customer_id: task.customer_id || null,
        activity_type: 'task_completed',
        description: `Task "${task.title}" marked as completed`,
        created_by: completed_by || task.assigned_to,
        created_at: getCurrentISTTime(),
      });
    } catch (activityError) {
      console.error('Error creating activity (non-critical):', activityError);
    }

    // Mark related notifications as completed
    try {
      await supabase
        .from('notifications')
        .update({
          is_completed: true,
          updated_at: getCurrentISTTime(),
        })
        .eq('related_id', taskId)
        .eq('related_type', 'task')
        .eq('notification_type', 'task_reminder');
    } catch (notificationError) {
      console.error('Error updating notifications (non-critical):', notificationError);
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    console.error('Complete task API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

