import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// GET - Fetch status for all employees (for admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get all employees and data analysts (excluding full admin)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('username')
      .neq('username', 'Admin')
      .order('username', { ascending: true });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, statuses: [] });
    }

    // Get status for each employee
    const statusPromises = users.map(async (user: any) => {
      const { data: activities } = await supabase
        .from('activities')
        .select('metadata, created_at')
        .eq('employee_id', user.username)
        .like('description', '%Status changed%')
        .order('created_at', { ascending: false })
        .limit(1);

      let status = 'online'; // Default status
      if (activities && activities.length > 0) {
        const lastActivity = activities[0];
        const metadata = lastActivity.metadata as any;
        if (metadata && metadata.status) {
          status = metadata.status;
          const lastActivityTime = new Date(lastActivity.created_at).getTime();
          const now = Date.now();
          const minutesSinceActivity = (now - lastActivityTime) / (1000 * 60);
          
          // Update status based on time since last activity
          if (minutesSinceActivity > 15 && status !== 'logged_out') {
            status = 'logged_out';
          } else if (minutesSinceActivity > 10 && status === 'online') {
            status = 'inactive';
          } else if (minutesSinceActivity > 5 && status === 'online') {
            status = 'away';
          }
        }
      }

      return {
        username: user.username,
        status,
      };
    });

    const statuses = await Promise.all(statusPromises);

    return NextResponse.json({ success: true, statuses });
  } catch (error: any) {
    console.error('Get all users status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
