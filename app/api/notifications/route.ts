import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// GET - Fetch notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Handle undefined userId gracefully
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.warn('Notifications API: userId is missing or undefined');
      return NextResponse.json(
        { data: [], error: 'User ID is required' },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (error: any) {
      console.error('Error creating Supabase client:', error);
      return NextResponse.json(
        { data: [], error: 'Database connection error' },
        { status: 500 }
      );
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_seen', false).eq('is_completed', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      // Return empty array instead of error to prevent crashes
      return NextResponse.json({ data: [], error: error.message }, { status: 500 });
    }

    // Filter out snoozed notifications that haven't passed their snooze time
    const now = new Date();
    const filteredData = (data || []).filter((notif: any) => {
      if (notif.is_snoozed && notif.snooze_until) {
        return new Date(notif.snooze_until) <= now;
      }
      return !notif.is_snoozed;
    });

    return NextResponse.json({ data: filteredData });
  } catch (error: any) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      notification_type,
      title,
      message,
      account_id,
      contact_id,
      task_id,
      quotation_id,
    } = body;

    if (!user_id || !notification_type || !title || !message) {
      return NextResponse.json(
        { error: 'User ID, notification type, title, and message are required' },
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
      .from('notifications')
      .insert({
        user_id,
        notification_type,
        title,
        message,
        account_id: account_id || null,
        contact_id: contact_id || null,
        task_id: task_id || null,
        quotation_id: quotation_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('Create notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

