import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';

type UserStatus = 'online' | 'away' | 'logged_out';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, status, reason } = body;

    if (!username || !status) {
      return NextResponse.json(
        { error: 'Username and status are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get user ID from username
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user status in users table (add status column if it doesn't exist)
    // We'll use a separate user_status table or add column to users table
    // For now, we'll log it in activities table
    
    // Log activity for status change
    try {
      // Find all accounts assigned to this user to log activity
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('assigned_employee', username)
        .limit(1);

      const accountId = accounts && accounts.length > 0 ? accounts[0].id : null;

      // Log status change activity
      await supabase.from('activities').insert({
        account_id: accountId, // May be null if user has no accounts
        employee_id: username,
        activity_type: 'note',
        description: `Status changed to ${status}${reason ? `: ${reason}` : ''}`,
        metadata: {
          status,
          reason: reason || null,
          timestamp: getCurrentISTTime(),
        },
      });
    } catch (activityError) {
      console.warn('Failed to log status change activity:', activityError);
      // Don't fail the request if activity logging fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Status updated successfully' 
    });
  } catch (error: any) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
