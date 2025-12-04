import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

interface LeaderboardEntry {
  employee: string;
  score: number;
  calls: number;
  followups: number;
  closedWon: number;
  streak: number;
  totalActivities: number;
  quotations: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get time range - default to last 30 days, or use query param
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const now = new Date();
    const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all activities in the time period
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('employee_id, activity_type, description, metadata, created_at')
      .gte('created_at', startTime)
      .not('employee_id', 'is', null);

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json(
        { success: false, error: 'Unable to load activities' },
        { status: 500 }
      );
    }

    // Group activities by employee
    const employeeStats: Record<string, {
      calls: number;
      followups: number;
      quotations: number;
      closedWon: number;
      totalActivities: number;
    }> = {};

    for (const activity of activities || []) {
      const employee = activity.employee_id;
      if (!employee) continue;

      if (!employeeStats[employee]) {
        employeeStats[employee] = {
          calls: 0,
          followups: 0,
          quotations: 0,
          closedWon: 0,
          totalActivities: 0,
        };
      }

      employeeStats[employee].totalActivities++;

      const activityType = activity.activity_type;
      const metadata = activity.metadata || {};
      const description = activity.description?.toLowerCase() || '';
      const entityType = metadata.entity_type;

      // Count quotations
      if (activityType === 'quotation_saved' || entityType === 'quotation') {
        employeeStats[employee].quotations++;
      }

      // Count closed_won (from quotation status updates)
      if (
        metadata.quotation_status === 'closed_won' ||
        (metadata.status === 'closed_won') ||
        (description.includes('closed') && description.includes('won'))
      ) {
        employeeStats[employee].closedWon++;
      }

      // Count followups
      const isLeadActivity = metadata.lead_id || entityType === 'lead';
      const hasFollowupKeyword = description.includes('followup') || 
                                  description.includes('follow-up') || 
                                  description.includes('follow up');
      if (isLeadActivity || hasFollowupKeyword) {
        employeeStats[employee].followups++;
      }

      // Count calls
      if (
        description.includes('call') ||
        description.includes('phone') ||
        description.includes('contacted') ||
        (activityType === 'note' && (description.includes('call') || description.includes('phone')))
      ) {
        employeeStats[employee].calls++;
      }
    }

    // Also query quotations tables directly for closed_won count
    const allQuotesTables = ['quotes_mbcb', 'quotes_signages', 'quotes_paint'];
    const employeeClosedWon: Record<string, number> = {};

    for (const tableName of allQuotesTables) {
      const { data: quotes } = await supabase
        .from(tableName)
        .select('created_by, status')
        .eq('status', 'closed_won')
        .gte('created_at', startTime);

      if (quotes) {
        for (const quote of quotes) {
          if (quote.created_by) {
            employeeClosedWon[quote.created_by] = (employeeClosedWon[quote.created_by] || 0) + 1;
          }
        }
      }
    }

    // Merge closed_won counts
    for (const employee in employeeClosedWon) {
      if (!employeeStats[employee]) {
        employeeStats[employee] = {
          calls: 0,
          followups: 0,
          quotations: 0,
          closedWon: 0,
          totalActivities: 0,
        };
      }
      employeeStats[employee].closedWon += employeeClosedWon[employee];
    }

    // Fetch streak data for all employees
    const { data: streaks } = await supabase
      .from('employee_streaks')
      .select('employee, streak_count');

    const streakMap: Record<string, number> = {};
    if (streaks) {
      for (const streak of streaks) {
        streakMap[streak.employee] = streak.streak_count || 0;
      }
    }

    // Helper function to check if an employee is an admin
    const isAdminUser = (employeeName: string): boolean => {
      const lowerName = employeeName.toLowerCase().trim();
      return lowerName === 'admin' || 
             lowerName.startsWith('admin_') || 
             lowerName.endsWith('_admin') ||
             lowerName.includes('administrator');
    };

    // Calculate scores and build leaderboard entries (excluding admin users)
    const leaderboard: LeaderboardEntry[] = [];

    for (const employee in employeeStats) {
      // Skip admin users - they should not be part of gamification/leaderboard
      if (isAdminUser(employee)) {
        continue;
      }
      
      const stats = employeeStats[employee];
      const streak = streakMap[employee] || 0;

      // Calculate weighted score: (calls*1) + (followups*2) + (closed_won*5) + (streak*1.5)
      const score = 
        (stats.calls * 1) +
        (stats.followups * 2) +
        (stats.closedWon * 5) +
        (streak * 1.5);

      leaderboard.push({
        employee,
        score: Math.round(score * 100) / 100, // Round to 2 decimal places
        calls: stats.calls,
        followups: stats.followups,
        closedWon: stats.closedWon,
        streak,
        totalActivities: stats.totalActivities,
        quotations: stats.quotations,
      });
    }

    // Sort by score (descending)
    leaderboard.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      data: leaderboard,
      period: days,
    });
  } catch (error: any) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
