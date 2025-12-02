import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

// GET - Fetch notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const isAdmin = searchParams.get('isAdmin') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Fetch notifications - only incomplete ones, sorted by follow-up date (latest first)
    let query = supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        notification_type,
        title,
        message,
        contact_id,
        account_id,
        is_seen,
        is_completed,
        created_at,
        updated_at,
        contacts:contact_id(name, follow_up_date, call_status),
        accounts:account_id(account_name)
      `)
      .eq('is_completed', false)
      .order('created_at', { ascending: false });

    // Filter by user - admin sees all, employees see only their own
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    } else {
      // Admin sees all notifications
      query = query.not('user_id', 'eq', 'Admin'); // Exclude admin's own notifications
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: `Failed to fetch notifications: ${error.message}` },
        { status: 500 }
      );
    }

    // Format notifications with follow-up date for sorting
    const formattedNotifications = (notifications || []).map((notif: any) => {
      const followUpDate = notif.contacts?.follow_up_date || null;
      return {
        id: notif.id,
        userId: notif.user_id,
        notificationType: notif.notification_type,
        title: notif.title,
        message: notif.message,
        contactId: notif.contact_id,
        accountId: notif.account_id,
        contactName: notif.contacts?.name || null,
        accountName: notif.accounts?.account_name || null,
        followUpDate,
        callStatus: notif.contacts?.call_status || null,
        isSeen: notif.is_seen,
        isCompleted: notif.is_completed,
        createdAt: formatTimestampIST(notif.created_at),
        updatedAt: formatTimestampIST(notif.updated_at),
      };
    });

    // Sort by follow-up date (latest first), then by created_at
    formattedNotifications.sort((a, b) => {
      if (a.followUpDate && b.followUpDate) {
        return new Date(b.followUpDate).getTime() - new Date(a.followUpDate).getTime();
      }
      if (a.followUpDate) return -1;
      if (b.followUpDate) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ success: true, notifications: formattedNotifications });
  } catch (error: any) {
    console.error('API error in /api/notifications GET:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Mark notification as completed or seen
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, isCompleted, isSeen } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const updateData: any = {};
    if (isCompleted !== undefined) updateData.is_completed = isCompleted;
    if (isSeen !== undefined) updateData.is_seen = isSeen;

    const { data, error } = await supabase
      .from('notifications')
      .update(updateData)
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification:', error);
      return NextResponse.json(
        { error: `Failed to update notification: ${error.message}` },
        { status: 500 }
      );
    }

    // Log activity when notification is marked as completed
    if (isCompleted) {
      try {
        const { data: notification } = await supabase
          .from('notifications')
          .select('title, message, user_id, contact_id, account_id')
          .eq('id', notificationId)
          .single();

        if (notification) {
          await supabase.from('activities').insert({
            account_id: notification.account_id || null,
            contact_id: notification.contact_id || null,
            employee_id: notification.user_id || 'System',
            activity_type: 'note',
            description: `Follow-up notification completed: ${notification.title}`,
            metadata: {
              notification_id: notificationId,
              action: 'notification_completed',
            },
          });
        }
      } catch (activityError) {
        console.warn('Failed to log notification completion activity:', activityError);
      }
    }

    return NextResponse.json({ success: true, notification: data });
  } catch (error: any) {
    console.error('API error in /api/notifications PUT:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
