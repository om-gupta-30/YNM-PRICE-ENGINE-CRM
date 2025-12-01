import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';

// POST - Update an existing task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      task_type,
      due_date,
      assigned_to,
      customer_id,
      customer_name,
      account_id,
      sub_account_id,
      status,
      reminder_enabled,
      reminder_value,
      reminder_unit,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Build update object
    const updateData: any = {
      updated_at: getCurrentISTTime(),
    };

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return NextResponse.json(
          { error: 'Title cannot be empty' },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (task_type !== undefined) {
      const validTaskTypes = ['Follow-up', 'Meeting', 'Call'];
      if (!validTaskTypes.includes(task_type)) {
        return NextResponse.json(
          { error: `Task type must be one of: ${validTaskTypes.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.task_type = task_type;
    }

    if (due_date !== undefined) {
      updateData.due_date = due_date;
    }

    if (assigned_to !== undefined) {
      if (!assigned_to || !assigned_to.trim()) {
        return NextResponse.json(
          { error: 'Assigned to cannot be empty' },
          { status: 400 }
        );
      }
      updateData.assigned_employee = assigned_to.trim();
    }

    if (customer_id !== undefined) {
      updateData.customer_id = customer_id || null;
    }

    if (customer_name !== undefined) {
      updateData.customer_name = customer_name?.trim() || null;
    }

    if (account_id !== undefined) {
      updateData.account_id = account_id || null;
    }

    if (sub_account_id !== undefined) {
      updateData.sub_account_id = sub_account_id || null;
    }

    if (status !== undefined) {
      const validStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Status must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = status;

      // Set completed_at if status is Completed
      if (status === 'Completed' && !updateData.completed_at) {
        updateData.completed_at = getCurrentISTTime();
      } else if (status !== 'Completed') {
        updateData.completed_at = null;
      }
    }

    // Update task
    const { data: task, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update notification if reminder is enabled
    if (reminder_enabled && reminder_value && reminder_unit && task) {
      try {
        const dueDate = new Date(task.due_date);
        let reminderDate = new Date(dueDate);

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
        }

        // Update or create notification
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('related_id', task.id)
          .eq('related_type', 'task')
          .eq('notification_type', 'task_reminder')
          .single();

        if (existingNotification) {
          await supabase
            .from('notifications')
            .update({
              snooze_until: reminderDate.toISOString(),
              updated_at: getCurrentISTTime(),
            })
            .eq('id', existingNotification.id);
        } else {
          await supabase.from('notifications').insert({
            user_id: task.assigned_employee,
            title: `Task Reminder: ${task.title}`,
            message: `Task "${task.title}" is due on ${new Date(task.due_date).toLocaleDateString()}`,
            notification_type: 'task_reminder',
            related_id: task.id,
            related_type: 'task',
            snooze_until: reminderDate.toISOString(),
            is_completed: false,
            created_at: getCurrentISTTime(),
          });
        }
      } catch (notificationError) {
        console.error('Error updating notification (non-critical):', notificationError);
      }
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('Update task API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

