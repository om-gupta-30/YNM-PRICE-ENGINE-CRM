import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// GET - Fetch customers (mapped to accounts table)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';
    const filterAssignedTo = searchParams.get('assignedTo');

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

    // Use accounts table instead of customers
    let query = supabase
      .from('accounts')
      .select('id, account_name, assigned_employee, website, gst_number, notes, engagement_score, created_at, updated_at');

    // Filter by employee assignment if not admin
    if (!isAdmin && employeeUsername) {
      query = query.eq('assigned_employee', employeeUsername);
    }

    if (filterAssignedTo) {
      query = query.eq('assigned_employee', filterAssignedTo);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts as customers:', error);
      return NextResponse.json({ data: [] }); // Return empty array for graceful degradation
    }

    // Map accounts to customer-like structure for backwards compatibility
    const mappedData = (data || []).map(account => ({
      id: account.id,
      name: account.account_name,
      sales_employee: account.assigned_employee,
      gst_number: account.gst_number,
      notes: account.notes,
      is_active: true,
      created_at: account.created_at,
      updated_at: account.updated_at,
    }));

    return NextResponse.json({ data: mappedData });
  } catch (error: any) {
    console.error('Customers API error:', error);
    return NextResponse.json({ data: [] }); // Return empty array for graceful degradation
  }
}

// POST - Create new customer (redirects to accounts)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, sales_employee, created_by } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Customer name is required' },
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

    // Create in accounts table instead
    const assignedEmployee = sales_employee || created_by || null;

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        account_name: name.trim(),
        assigned_employee: assignedEmployee,
        engagement_score: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating account as customer:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity for customer creation
    try {
      await supabase.from('activities').insert({
        account_id: data.id,
        employee_id: created_by || assignedEmployee || 'System',
        activity_type: 'note',
        description: `Customer created: ${name.trim()}`,
        metadata: {
          account_name: name.trim(),
          assigned_employee: assignedEmployee,
        },
      });
    } catch (activityError) {
      console.warn('Failed to log customer creation activity:', activityError);
    }

    // Return customer-like structure
    return NextResponse.json({ 
      data: {
        id: data.id,
        name: data.account_name,
        sales_employee: data.assigned_employee,
        is_active: true,
        created_at: data.created_at,
      }, 
      success: true 
    });
  } catch (error: any) {
    console.error('Create customer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

