import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// GET - Fetch employee notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee = searchParams.get('employee');

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Missing employee parameter' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Fetch notifications for the employee, newest first
    const { data: notifications, error } = await supabase
      .from('employee_notifications')
      .select('*')
      .eq('employee', employee)
      .order('created_at', { ascending: false })
      .limit(100); // Limit to 100 most recent

    if (error) {
      console.error('Error fetching employee notifications:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
    });
  } catch (error: any) {
    console.error('Get employee notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, is_read } = body;

    if (!id || typeof is_read !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Missing id or is_read parameter' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Update notification
    const { error } = await supabase
      .from('employee_notifications')
      .update({ is_read })
      .eq('id', id);

    if (error) {
      console.error('Error updating notification:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification updated',
    });
  } catch (error: any) {
    console.error('Patch notification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
