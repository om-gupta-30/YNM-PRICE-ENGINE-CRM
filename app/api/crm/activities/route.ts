import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

// GET - Fetch all activities for an employee (for employees to see their own activities)
// or all activities (for admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';
    const filterEmployee = searchParams.get('filterEmployee'); // For admin to filter by employee
    const filterDate = searchParams.get('filterDate'); // Filter by date (YYYY-MM-DD format)

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
      .from('activities')
      .select('*');

    // Filter by employee
    if (isAdmin && filterEmployee) {
      // Admin filtering by specific employee
      query = query.eq('employee_id', filterEmployee);
    } else if (!isAdmin && employeeUsername) {
      // Employee sees only their own activities
      query = query.eq('employee_id', employeeUsername);
    }

    // Filter by date if provided
    if (filterDate) {
      const startDate = new Date(filterDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filterDate);
      endDate.setHours(23, 59, 59, 999);
      
      query = query
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }

    // Include all activity types including status changes and inactivity reasons
    // (account_id can be null for status-only activities)
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(500); // Increased limit to show comprehensive daily activities

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format timestamps in IST
    const formattedData = (data || []).map((activity: any) => ({
      ...activity,
      created_at: formatTimestampIST(activity.created_at),
    }));

    return NextResponse.json({ data: formattedData, success: true });
  } catch (error: any) {
    console.error('Get activities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
