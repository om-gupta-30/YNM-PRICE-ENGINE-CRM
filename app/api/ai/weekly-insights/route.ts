import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { runGemini } from '@/utils/ai';

interface WeeklyInsights {
  summary: string;
  topOpportunity: string;
  improvementArea: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee = searchParams.get('employee');

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Missing employee query parameter' },
        { status: 400 }
      );
    }

    // Create Supabase client
    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (error: any) {
      console.error('Error creating Supabase client:', error);
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Calculate time range: past 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startTime = sevenDaysAgo.toISOString();
    const endTime = now.toISOString();

    // Fetch activities for the employee in the past 7 days
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, activity_type, description, metadata, created_at, account_id, sub_account_id')
      .eq('employee_id', employee)
      .gte('created_at', startTime)
      .lte('created_at', endTime)
      .order('created_at', { ascending: true });

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json(
        { success: false, error: 'Unable to load activities' },
        { status: 500 }
      );
    }

    const activitiesList = activities || [];

    // Summarize activities
    let numCalls = 0;
    let numFollowups = 0;
    let numQuotations = 0;
    let numTasks = 0;
    let numCreates = 0;
    let numEdits = 0;
    const accountIds = new Set<number>();
    const subAccountIds = new Set<number>();

    for (const activity of activitiesList) {
      const activityType = activity.activity_type;
      const metadata = activity.metadata || {};
      const description = activity.description?.toLowerCase() || '';
      const entityType = metadata.entity_type;

      // Count by type
      if (activityType === 'quotation_saved' || entityType === 'quotation') {
        numQuotations++;
      }
      if (metadata.task_id || entityType === 'task') {
        numTasks++;
      }
      if (activityType === 'create') {
        numCreates++;
      }
      if (activityType === 'edit') {
        numEdits++;
      }

      // Count followups
      const isLeadActivity = metadata.lead_id || entityType === 'lead';
      const hasFollowupKeyword = description.includes('followup') || description.includes('follow-up') || description.includes('follow up');
      if (isLeadActivity || hasFollowupKeyword) {
        numFollowups++;
      }

      // Count calls
      if (
        description.includes('call') ||
        description.includes('phone') ||
        description.includes('contacted') ||
        activityType === 'note' && (description.includes('call') || description.includes('phone'))
      ) {
        numCalls++;
      }

      // Track accounts/subaccounts
      if (activity.account_id) {
        accountIds.add(activity.account_id);
      }
      if (activity.sub_account_id) {
        subAccountIds.add(activity.sub_account_id);
      }
      if (metadata.sub_account_id) {
        const subId = typeof metadata.sub_account_id === 'number' 
          ? metadata.sub_account_id 
          : parseInt(metadata.sub_account_id);
        if (!isNaN(subId)) {
          subAccountIds.add(subId);
        }
      }
    }

    // Fetch engagement scores for sub-accounts worked on
    let engagementScoreChange = null;
    if (subAccountIds.size > 0) {
      const { data: subAccounts } = await supabase
        .from('sub_accounts')
        .select('id, engagement_score, updated_at')
        .in('id', Array.from(subAccountIds))
        .order('updated_at', { ascending: false });

      if (subAccounts && subAccounts.length > 0) {
        // Calculate average engagement score
        const scores = subAccounts
          .map(sa => Number(sa.engagement_score) || 0)
          .filter(s => s > 0);
        
        if (scores.length > 0) {
          const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
          // For comparison, we'd need historical data, but for now we'll just report current average
          engagementScoreChange = {
            currentAverage: avgScore,
            accountsTracked: scores.length,
          };
        }
      }
    }

    // Build summary for AI
    const summary = {
      employee,
      timeWindow: {
        start: startTime,
        end: endTime,
        days: 7,
      },
      metrics: {
        totalActivities: activitiesList.length,
        numCalls,
        numFollowups,
        numQuotations,
        numTasks,
        numCreates,
        numEdits,
      },
      engagement: engagementScoreChange,
      accountsWorked: accountIds.size,
      subAccountsWorked: subAccountIds.size,
    };

    // Prepare AI prompts
    const systemPrompt = `You are a sales performance analyst. Analyze weekly employee activity data and provide concise, actionable insights. Focus on achievements, opportunities, and improvement areas.`;

    const userPrompt = `
Employee: ${summary.employee}
Time Period: Past 7 days (${new Date(summary.timeWindow.start).toLocaleDateString()} to ${new Date(summary.timeWindow.end).toLocaleDateString()})

Activity Summary:
- Total Activities: ${summary.metrics.totalActivities}
- Calls: ${summary.metrics.numCalls}
- Followups: ${summary.metrics.numFollowups}
- Quotations Created/Saved: ${summary.metrics.numQuotations}
- Tasks: ${summary.metrics.numTasks}
- Records Created: ${summary.metrics.numCreates}
- Records Edited: ${summary.metrics.numEdits}
- Accounts Worked On: ${summary.accountsWorked}
- Sub-Accounts Worked On: ${summary.subAccountsWorked}
${summary.engagement ? `- Average Engagement Score: ${summary.engagement.currentAverage.toFixed(1)} (across ${summary.engagement.accountsTracked} accounts)` : ''}

Based on this weekly activity data, provide insights in the following JSON format:
{
  "summary": "A brief one-line summary of the week's performance (e.g., 'Strong week with 15 calls and 8 quotations, showing consistent engagement')",
  "topOpportunity": "The biggest win or opportunity from this week (e.g., 'Closed 3 quotations worth ₹2.5L, highest this month')",
  "improvementArea": "One key area to focus on for next week (e.g., 'Increase follow-up calls to 10+ per week to improve conversion')"
}

Be specific, constructive, and data-driven. If activity is low, provide gentle encouragement. If activity is high, acknowledge achievements and suggest optimization.
    `.trim();

    // Call AI
    const aiResponse = await runGemini<WeeklyInsights>(systemPrompt, userPrompt);

    // Validate and sanitize response
    const insights: WeeklyInsights = {
      summary: typeof aiResponse.summary === 'string' && aiResponse.summary.trim()
        ? aiResponse.summary.trim()
        : 'Good week of activity. Keep up the momentum!',
      topOpportunity: typeof aiResponse.topOpportunity === 'string' && aiResponse.topOpportunity.trim()
        ? aiResponse.topOpportunity.trim()
        : 'Continue building on your strengths',
      improvementArea: typeof aiResponse.improvementArea === 'string' && aiResponse.improvementArea.trim()
        ? aiResponse.improvementArea.trim()
        : 'Focus on consistent daily activity',
    };

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error: any) {
    console.error('Weekly insights API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
