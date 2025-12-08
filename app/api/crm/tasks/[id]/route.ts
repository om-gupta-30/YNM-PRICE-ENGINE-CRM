import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { logActivity } from '@/lib/utils/activityLogger';

// DELETE - Delete a task (admin only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const taskId = parseInt(params.id);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task ID' },
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

    // Get task details before deletion (for activity logging)
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, account_id, sub_account_id, assigned_employee, created_by')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json(
        { 
          success: false, 
          error: fetchError?.message || 'Task not found'
        },
        { status: 404 }
      );
    }

    // Delete the task
    const { error: deleteError, data: deleteData } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .select();

    if (deleteError) {
      console.error('Error deleting task:', deleteError);
      return NextResponse.json(
        { 
          success: false,
          error: deleteError.message || 'Failed to delete task'
        },
        { status: 500 }
      );
    }

    // Log activity asynchronously (don't block response)
    if (task.created_by) {
      logActivity({
        account_id: task.account_id || null,
        sub_account_id: task.sub_account_id || null,
        employee_id: task.created_by,
        activity_type: 'delete',
        description: `Task deleted: ${task.title}`,
        metadata: {
          entity_type: 'task',
          task_id: taskId,
          task_title: task.title,
        },
      }).catch((activityError) => {
        // Silently fail - activity logging is non-critical
        if (process.env.NODE_ENV === 'development') {
          console.error('Error logging task deletion activity (non-critical):', activityError);
        }
      });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete task API error:', error);
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
