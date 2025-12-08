import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// GET - Get task analytics for admin (employee performance)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeFilter = searchParams.get('employee');

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

    // Build base query
    let query = supabase.from('tasks').select('*');

    // Filter by employee if provided
    if (employeeFilter) {
      query = query.eq('assigned_employee', employeeFilter);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching tasks for analytics:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allTasks = tasks || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate analytics
    const analytics = {
      total: allTasks.length,
      pending: allTasks.filter(t => t.status === 'Pending').length,
      inProgress: allTasks.filter(t => t.status === 'In Progress').length,
      completed: allTasks.filter(t => t.status === 'Completed').length,
      cancelled: allTasks.filter(t => t.status === 'Cancelled').length,
      overdue: allTasks.filter(t => {
        if (t.status === 'Completed' || t.status === 'Cancelled') return false;
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      }).length,
      dueToday: allTasks.filter(t => {
        if (t.status === 'Completed' || t.status === 'Cancelled') return false;
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      }).length,
      completionRate: allTasks.length > 0
        ? ((allTasks.filter(t => t.status === 'Completed').length / allTasks.length) * 100).toFixed(1)
        : '0.0',
      averageCompletionTime: calculateAverageCompletionTime(allTasks),
      employeeStats: calculateEmployeeStats(allTasks),
    };

    return NextResponse.json({ success: true, analytics });
  } catch (error: any) {
    console.error('Tasks analytics API error:', error);
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

function calculateAverageCompletionTime(tasks: any[]): number | null {
  const completedTasks = tasks.filter(t => t.status === 'Completed' && t.completed_at && t.created_at);
  
  if (completedTasks.length === 0) return null;

  const totalDays = completedTasks.reduce((sum, task) => {
    const created = new Date(task.created_at);
    const completed = new Date(task.completed_at);
    const days = (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);

  return Math.round((totalDays / completedTasks.length) * 10) / 10; // Round to 1 decimal
}

function calculateEmployeeStats(tasks: any[]): Record<string, any> {
  const employeeMap: Record<string, any> = {};

  tasks.forEach(task => {
    const emp = task.assigned_employee || 'Unassigned';
    if (!employeeMap[emp]) {
      employeeMap[emp] = {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0,
      };
    }

    employeeMap[emp].total++;
    if (task.status === 'Pending') employeeMap[emp].pending++;
    if (task.status === 'In Progress') employeeMap[emp].inProgress++;
    if (task.status === 'Completed') employeeMap[emp].completed++;
    if (task.status === 'Cancelled') employeeMap[emp].cancelled++;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);
    if (task.status !== 'Completed' && task.status !== 'Cancelled' && dueDate < today) {
      employeeMap[emp].overdue++;
    }
  });

  // Calculate completion rates
  Object.keys(employeeMap).forEach(emp => {
    const stats = employeeMap[emp];
    stats.completionRate = stats.total > 0
      ? ((stats.completed / stats.total) * 100).toFixed(1)
      : '0.0';
  });

  return employeeMap;
}
