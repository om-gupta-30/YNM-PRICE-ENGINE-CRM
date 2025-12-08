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

    // Get current task to check old status
    // Don't select status_history - column doesn't exist in database
    // Select all necessary columns including assigned_employee, account_id, and sub_account_id
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, status, assigned_employee, assigned_to, created_by, account_id, sub_account_id')
      .eq('id', taskId)
      .single();

    if (fetchError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching task:', fetchError);
      }
      return NextResponse.json(
        { error: fetchError.message || 'Task not found' },
        { status: 404 }
      );
    }

    if (!currentTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Permission check: Only allow employees to update their own tasks
    // Admin cannot update status (they can only view, assign, and delete)
    const assignedEmployee = currentTask.assigned_employee || currentTask.assigned_to;
    
    // Block admin from updating status
    if (updated_by && updated_by.toLowerCase() === 'admin') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Admin cannot update task status. Only assigned employees can update status.' 
        },
        { status: 403 }
      );
    }

    // Only allow employees to update their own tasks
    if (updated_by && updated_by !== assignedEmployee) {
      return NextResponse.json(
        { 
          success: false,
          error: 'You can only update tasks assigned to you' 
        },
        { status: 403 }
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

    // Validate that the user updating is the assigned employee
    if (!updated_by || updated_by !== assignedEmployee) {
      return NextResponse.json(
        { 
          success: false,
          error: 'You can only update tasks assigned to you' 
        },
        { status: 403 }
      );
    }

    // Build status history entry (only if column exists)
    const statusHistoryEntry = {
      old_status: currentTask.status,
      new_status: status,
      changed_by: updated_by || 'System',
      changed_at: getCurrentISTTime(),
      note: status_note || null,
    };

    // Initialize empty history array (status_history column doesn't exist in database)
    // We'll track history in memory but not save to database
    const existingHistory: any[] = [];
    const updatedHistory = [...existingHistory, statusHistoryEntry];

    // Build update data
    const updateData: any = {
      status,
      updated_at: getCurrentISTTime(),
    };

    // Only include status_history if the column exists (we'll try and handle error if it doesn't)
    // We'll add it conditionally after checking if update works

    // Set completed_at if status is Completed
    if (status === 'Completed') {
      updateData.completed_at = getCurrentISTTime();
    } else if (currentTask.status === 'Completed' && status !== 'Completed') {
      // If changing from Completed to something else, clear completed_at
      updateData.completed_at = null;
    }

    // Update task without status_history (column doesn't exist in database)
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating task status:', updateError);
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating activity (non-critical):', activityError);
      }
    }

    const response = NextResponse.json({
      success: true,
      task: updatedTask,
      statusHistory: updatedHistory, // Return computed history (not stored in DB)
    });

    // Add caching headers
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    
    return response;
  } catch (error: any) {
    console.error('Update task status API error:', error);
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
