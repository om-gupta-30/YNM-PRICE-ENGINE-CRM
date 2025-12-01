import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';

// POST - Update task status with history tracking
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const taskId = parseInt(params.id);
    const body = await request.json();
    const { status, status_note, updated_by } = body;

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get current task to check old status and get status_history
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('status, status_history')
      .eq('id', taskId)
      .single();

    if (fetchError || !currentTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Only update if status changed
    if (currentTask.status === status) {
      return NextResponse.json({
        success: true,
        message: 'Status unchanged',
        task: currentTask,
      });
    }

    // Build status history entry
    const statusHistoryEntry = {
      old_status: currentTask.status,
      new_status: status,
      changed_by: updated_by || 'System',
      changed_at: getCurrentISTTime(),
      note: status_note || null,
    };

    // Get existing history or initialize empty array
    const existingHistory = Array.isArray(currentTask.status_history)
      ? currentTask.status_history
      : [];

    // Add new history entry
    const updatedHistory = [...existingHistory, statusHistoryEntry];

    // Build update data
    const updateData: any = {
      status,
      status_history: updatedHistory,
      updated_at: getCurrentISTTime(),
    };

    // Set completed_at if status is Completed
    if (status === 'Completed') {
      updateData.completed_at = getCurrentISTTime();
    } else if (currentTask.status === 'Completed' && status !== 'Completed') {
      // If changing from Completed to something else, clear completed_at
      updateData.completed_at = null;
    }

    // Update task
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task status:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Create activity log for status change
    try {
      await supabase.from('activities').insert({
        account_id: updatedTask.account_id || null,
        sub_account_id: updatedTask.sub_account_id || null,
        employee_id: updated_by || updatedTask.assigned_employee,
        activity_type: 'task',
        description: `Task status changed: ${currentTask.status} → ${status}${status_note ? ` (${status_note})` : ''}`,
        metadata: {
          task_id: taskId,
          old_status: currentTask.status,
          new_status: status,
          status_note: status_note || null,
        },
      });
    } catch (activityError) {
      console.error('Error creating activity (non-critical):', activityError);
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      statusHistory: updatedHistory,
    });
  } catch (error: any) {
    console.error('Update task status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
