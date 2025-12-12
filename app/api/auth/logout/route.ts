import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { logLogoutActivity } from '@/lib/utils/activityLogger';

export async function POST(request: NextRequest) {
  try {
    const { username, reason, otherNote, isAdmin } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Reason is required for employees, not admins
    if (!isAdmin && !reason) {
      return NextResponse.json(
        { error: 'Reason is required for employees' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const logoutTime = getCurrentISTTime();
    
    // Update logout_time in users table
    try {
      await supabase
        .from('users')
        .update({ 
          logout_time: logoutTime,
        })
        .eq('username', username);
    } catch (error) {
      console.error('Error updating logout_time in users table:', error);
    }
    
    // Only log activity and create tasks for employees (not admins)
    if (!isAdmin && reason) {
      // Save to logout_reasons table
      try {
        const reasonTag = reason === 'Meeting / Field Visit' ? 'Meeting' : reason;
        await supabase.from('logout_reasons').insert({
          user_id: username,
          reason_tag: reasonTag,
          reason_text: reason === 'Other' && otherNote ? otherNote : reasonTag,
          created_at: logoutTime,
        });
      } catch (error) {
        console.error('Error saving to logout_reasons table:', error);
      }

      const metadata: Record<string, any> = {
        reason,
        logout_time: logoutTime,
      };

      if (reason === 'Other' && otherNote) {
        metadata.custom_reason = otherNote;
      }

      // Log logout activity with reason
      const logoutReason = reason === 'Other' && otherNote ? otherNote : reason;
      await logLogoutActivity({
        employee_id: username,
        logoutTime: logoutTime,
        reason: logoutReason,
        metadata,
      });

      if (reason === 'Meeting' || reason === 'Meeting / Field Visit') {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);

        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert({
            title: 'Follow-up after Client Meeting',
            description: 'Auto-generated from meeting logout reason',
            task_type: 'Follow-up',
            due_date: dueDate.toISOString().slice(0, 10),
            status: 'Pending',
            assigned_employee: username,
            created_by: username,
          })
          .select()
          .single();

        if (taskError) {
          console.error('Auto task creation error:', taskError.message);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

