import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, reason } = body;

    if (!username || !reason) {
      return NextResponse.json(
        { error: 'Username and reason are required' },
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

    // Find accounts assigned to this user to log activity
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('assigned_employee', username)
      .limit(1);

    const accountId = accounts && accounts.length > 0 ? accounts[0].id : null;

    // Log inactivity reason activity
    try {
      await supabase.from('activities').insert({
        account_id: accountId, // May be null if user has no accounts
        employee_id: username,
        activity_type: 'note',
        description: `Logged back in after auto-logout. Inactivity reason: ${reason}`,
        metadata: {
          type: 'inactivity_reason',
          reason: reason,
          timestamp: getCurrentISTTime(),
          auto_logout: true,
        },
      });
    } catch (activityError) {
      console.warn('Failed to log inactivity reason activity:', activityError);
      // Don't fail the request if activity logging fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Inactivity reason logged successfully' 
    });
  } catch (error: any) {
    console.error('Log inactivity reason error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
