import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { logActivity } from '@/lib/utils/activityLogger';

// POST - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      task_type,
      due_date,
      assigned_to,
      account_id,
      sub_account_id,
      status = 'Pending',
      created_by,
      reminder_enabled,
      reminder_value,
      reminder_unit,
    } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!due_date) {
      return NextResponse.json(
        { error: 'Due date is required' },
        { status: 400 }
      );
    }

    if (!assigned_to || !assigned_to.trim()) {
      return NextResponse.json(
        { error: 'Assigned to is required' },
        { status: 400 }
      );
    }

    if (!created_by || !created_by.trim()) {
      return NextResponse.json(
        { error: 'Created by is required' },
        { status: 400 }
      );
    }

    // Validate task_type
    const validTaskTypes = ['Follow-up', 'Meeting', 'Call'];
    if (task_type && !validTaskTypes.includes(task_type)) {
      return NextResponse.json(
        { error: `Task type must be one of: ${validTaskTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
    if (status && !validStatuses.includes(status)) {
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
    
    const numericAccountId = account_id ? Number(account_id) : null;

    // Initialize status history with initial status
    const initialStatusHistory = [{
      old_status: null,
      new_status: status,
      changed_by: created_by.trim(),
      changed_at: getCurrentISTTime(),
      note: 'Task created',
    }];

    // Build insert data - check if status_history column exists
    const insertData: any = {
      title: title.trim(),
      description: description?.trim() || null,
      task_type: task_type || 'Follow-up',
      due_date: due_date,
      assigned_employee: assigned_to.trim(),
      assigned_to: assigned_to.trim(), // Also set assigned_to for compatibility
      account_id: numericAccountId,
      sub_account_id: sub_account_id || null,
      status: status,
      created_by: created_by.trim(),
    };

    // Try to include status_history, but handle gracefully if column doesn't exist
    // First, try with status_history
    let taskData = { ...insertData, status_history: initialStatusHistory };
    let { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    // If error is about missing status_history column, retry without it
    if (taskError && (
      taskError.code === 'PGRST204' || 
      taskError.message?.includes('status_history') ||
      taskError.message?.includes('Could not find')
    )) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('status_history column not found, creating task without it:', taskError.message);
      }
      // Retry without status_history
      const { data: retryTask, error: retryError } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single();

      if (retryError) {
        console.error('Error creating task (retry without status_history):', retryError);
        return NextResponse.json({ 
          success: false,
          error: retryError.message || 'Failed to create task',
          details: process.env.NODE_ENV === 'development' ? JSON.stringify(retryError) : undefined
        }, { status: 500 });
      }
      task = retryTask;
      taskError = null;
    } else if (taskError) {
      console.error('Error creating task:', taskError);
      return NextResponse.json({ 
        success: false,
        error: taskError.message || 'Failed to create task',
        details: process.env.NODE_ENV === 'development' ? JSON.stringify(taskError) : undefined
      }, { status: 500 });
    }

    // Log activity for task creation
    if (created_by) {
      try {
        await logActivity({
          account_id: numericAccountId,
          employee_id: created_by.trim(),
          activity_type: 'create',
          description: `Task created: ${title.trim()}`,
          metadata: {
            entity_type: 'task',
            task_id: task.id,
            task_type: task.task_type,
            due_date,
            status: task.status,
          },
        });
      } catch (activityError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error logging task activity (non-critical):', activityError);
        }
      }
    }

    // Create notification if reminder is enabled
    if (reminder_enabled && reminder_value && reminder_unit && task) {
      try {
        const dueDate = new Date(due_date);
        let reminderDate = new Date(dueDate);

        // Calculate reminder date based on unit
        switch (reminder_unit) {
          case 'minutes':
            reminderDate.setMinutes(reminderDate.getMinutes() - parseInt(reminder_value));
            break;
          case 'hours':
            reminderDate.setHours(reminderDate.getHours() - parseInt(reminder_value));
            break;
          case 'days':
            reminderDate.setDate(reminderDate.getDate() - parseInt(reminder_value));
            break;
          default:
            reminderDate = dueDate;
        }

        // Create notification
        await supabase.from('notifications').insert({
          user_id: assigned_to.trim(),
          title: `Task Reminder: ${title}`,
          message: `Task "${title}" is due on ${new Date(due_date).toLocaleDateString()}`,
          notification_type: 'task_reminder',
          related_id: task.id,
          related_type: 'task',
          snooze_until: reminderDate.toISOString(),
          is_completed: false,
          created_at: getCurrentISTTime(),
        });
      } catch (notificationError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error creating notification (non-critical):', notificationError);
        }
        // Don't fail the request if notification creation fails
      }
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('Create task API error:', error);
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

