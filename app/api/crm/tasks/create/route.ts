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

    // Build insert data - don't include status_history (column might not exist)
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

    // Insert task directly (no retry logic for speed)
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert(insertData)
      .select()
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
      return NextResponse.json({ 
        success: false,
        error: taskError.message || 'Failed to create task',
        details: process.env.NODE_ENV === 'development' ? JSON.stringify(taskError) : undefined
      }, { status: 500 });
    }

    // Return response immediately for fast UX
    // Do non-critical operations (logging, notifications) asynchronously
    const response = NextResponse.json({ success: true, task });

    // Log activity asynchronously (don't block response)
    if (created_by) {
      logActivity({
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
      }).catch((activityError) => {
        // Silently fail - activity logging is non-critical
        if (process.env.NODE_ENV === 'development') {
          console.error('Error logging task activity (non-critical):', activityError);
        }
      });
    }

    // Create notification asynchronously if reminder is enabled
    if (reminder_enabled && reminder_value && reminder_unit && task) {
      (async () => {
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
          // Silently fail - notification creation is non-critical
          if (process.env.NODE_ENV === 'development') {
            console.error('Error creating notification (non-critical):', notificationError);
          }
        }
      })();
    }

    return response;
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

