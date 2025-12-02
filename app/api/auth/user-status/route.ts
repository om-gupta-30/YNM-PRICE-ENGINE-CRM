import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // For now, we'll return a default status
    // In a full implementation, you'd store this in a user_status table
    // For simplicity, we'll check the last activity from activities table
    const supabase = createSupabaseServerClient();

    // Get the most recent status change activity for this user
    const { data: activities } = await supabase
      .from('activities')
      .select('metadata, created_at')
      .eq('employee_id', username)
      .like('description', '%Status changed%')
      .order('created_at', { ascending: false })
      .limit(1);

    let status = 'online'; // Default status

    if (activities && activities.length > 0) {
      const lastActivity = activities[0];
      const metadata = lastActivity.metadata as any;
      if (metadata && metadata.status) {
        status = metadata.status;
        
        // Check if it's been more than 15 minutes since last activity
        const lastActivityTime = new Date(lastActivity.created_at).getTime();
        const now = Date.now();
        const minutesSinceActivity = (now - lastActivityTime) / (1000 * 60);
        
        if (minutesSinceActivity > 15 && status !== 'logged_out') {
          status = 'logged_out';
        } else if (minutesSinceActivity > 5 && status === 'online') {
          status = 'away';
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      status,
      username 
    });
  } catch (error: any) {
    console.error('Get user status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
