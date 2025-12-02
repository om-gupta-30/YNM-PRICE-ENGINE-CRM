import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// GET - Fetch tasks with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';
    const filterStatus = searchParams.get('status');
    const filterType = searchParams.get('type');
    const filterDueDate = searchParams.get('dueDate'); // 'today', 'overdue', 'upcoming'

    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (error: any) {
      console.error('Error creating Supabase client:', error);
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    let query = supabase
      .from('tasks')
      .select('*');

    // Filter by employee if not admin
    if (!isAdmin && employeeUsername) {
      query = query.eq('assigned_to', employeeUsername);
    }

    // Filter by status
    if (filterStatus) {
      query = query.eq('status', filterStatus);
    }

    // Filter by type
    if (filterType) {
      query = query.eq('task_type', filterType);
    }

    // Filter by due date
    if (filterDueDate === 'today') {
      const today = new Date().toISOString().split('T')[0];
      query = query.eq('due_date', today);
    } else if (filterDueDate === 'overdue') {
      const today = new Date().toISOString().split('T')[0];
      query = query.lt('due_date', today).eq('status', 'Pending');
    } else if (filterDueDate === 'upcoming') {
      const today = new Date().toISOString().split('T')[0];
      query = query.gt('due_date', today);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Tasks API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      task_type,
      due_date,
      status,
      description,
      assigned_to,
      created_by,
    } = body;

    if (!title || !task_type || !due_date || !assigned_to) {
      return NextResponse.json(
        { error: 'Title, task type, due date, and assigned to are required' },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (error: any) {
      console.error('Error creating Supabase client:', error);
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        task_type,
        due_date,
        status: status || 'Pending',
        description: description?.trim() || null,
        assigned_to,
        assigned_employee: assigned_to,
        created_by: created_by || assigned_to,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

