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
    // Filter to only show dashboard notifications (task, lead, account, sub-account, contact related)
    // Follow-up notifications are shown in the notification bell, not in dashboard
    const { data: notifications, error } = await supabase
      .from('employee_notifications')
      .select('*')
      .eq('employee', employee)
      .order('created_at', { ascending: false })
      .limit(100); // Limit to 100 most recent
    
    // Filter notifications to only show dashboard-specific types
    // Dashboard notifications have metadata.type matching: task_added, task_edited, lead_added, lead_edited,
    // account_added, account_edited, account_assigned, sub_account_added, sub_account_edited,
    // contact_added, contact_edited
    const dashboardNotificationTypes = [
      'task_added', 'task_edited',
      'lead_added', 'lead_edited',
      'account_added', 'account_edited', 'account_assigned',
      'sub_account_added', 'sub_account_edited',
      'contact_added', 'contact_edited'
    ];
    
    const filteredNotifications = (notifications || []).filter((notif: any) => {
      // Check if metadata.type exists and matches dashboard notification types
      const metadata = notif.metadata || {};
      const notificationType = metadata.type;
      return notificationType && dashboardNotificationTypes.includes(notificationType);
    });

    if (error) {
      console.error('Error fetching employee notifications:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notifications: filteredNotifications || [],
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
