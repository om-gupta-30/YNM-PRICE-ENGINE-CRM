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

    // Delete the task first (fast path)
    const { data: deletedTask, error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .select('id, title, account_id, sub_account_id, assigned_employee, created_by')
      .single();

    if (deleteError) {
      // Check if task exists before reporting error
      const { data: checkTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', taskId)
        .single();
      
      if (!checkTask) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Task not found'
          },
          { status: 404 }
        );
      }
      
      console.error('Error deleting task:', deleteError);
      return NextResponse.json(
        { 
          success: false,
          error: deleteError.message || 'Failed to delete task'
        },
        { status: 500 }
      );
    }

    // Log activity asynchronously (don't block response) - use deleted task data
    if (deletedTask?.created_by) {
      logActivity({
        account_id: deletedTask.account_id || null,
        sub_account_id: deletedTask.sub_account_id || null,
        employee_id: deletedTask.created_by,
        activity_type: 'delete',
        description: `Task deleted: ${deletedTask.title}`,
        metadata: {
          entity_type: 'task',
          task_id: taskId,
          task_title: deletedTask.title,
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
