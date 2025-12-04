import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { runGemini } from '@/utils/ai';

interface CoachingInsights {
  motivation: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  priorityAccounts: string[];
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

    // Calculate time range: last 24 hours
    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const endTime = now.toISOString();

    // Fetch activities for the employee in the last 24 hours
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, activity_type, description, metadata, created_at, account_id')
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
    const engagementChanges: string[] = [];

    // Get account names for engagement changes
    const accountIds = new Set<number>();
    
    for (const activity of activitiesList) {
      const activityType = activity.activity_type;
      const metadata = activity.metadata || {};
      const description = activity.description?.toLowerCase() || '';
      const entityType = metadata.entity_type;

      // Count quotations
      if (activityType === 'quotation_saved' || entityType === 'quotation') {
        numQuotations++;
      }

      // Count tasks
      if (metadata.task_id || entityType === 'task') {
        numTasks++;
      }

      // Count followups (any lead-related activity, or activities with followup keywords)
      const isLeadActivity = metadata.lead_id || entityType === 'lead';
      const hasFollowupKeyword = description.includes('followup') || description.includes('follow-up') || description.includes('follow up');
      
      if (isLeadActivity || hasFollowupKeyword) {
        numFollowups++;
      }

      // Count calls (check description for call-related keywords)
      if (
        description.includes('call') ||
        description.includes('phone') ||
        description.includes('contacted') ||
        activityType === 'note' && (description.includes('call') || description.includes('phone'))
      ) {
        numCalls++;
      }

      // Track engagement changes (account/subaccount activities that might indicate engagement changes)
      if (activity.account_id) {
        accountIds.add(activity.account_id);
      }
      if (metadata.sub_account_id) {
        // Engagement changes might be tracked in account/subaccount activities
        if (description.includes('engagement') || description.includes('score')) {
          engagementChanges.push(activity.description || '');
        }
      }
    }

    // Fetch account names for priority accounts
    let accountNames: string[] = [];
    if (accountIds.size > 0) {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, account_name')
        .in('id', Array.from(accountIds));
      
      accountNames = (accounts || []).map(acc => acc.account_name).filter(Boolean);
    }

    // Build summary for AI
    const summary = {
      employee,
      timeWindow: {
        start: startTime,
        end: endTime,
      },
      metrics: {
        numCalls,
        numFollowups,
        numQuotations,
        numTasks,
      },
      engagementChanges: engagementChanges.length > 0 ? engagementChanges : null,
      totalActivities: activitiesList.length,
      accountNames: accountNames.slice(0, 10), // Limit to top 10 for context
    };

    // Prepare concise AI prompts
    const systemPrompt = `Sales coach. Return JSON: motivation (1 sentence), strengths[], weaknesses[], recommendations[], priorityAccounts[]. Keep brief.`;

    const accountList = summary.accountNames.slice(0, 5).join(', ') || 'None';
    const userPrompt = `Employee: ${summary.employee} | Last 24h: ${summary.totalActivities} activities (Calls:${summary.metrics.numCalls} Followups:${summary.metrics.numFollowups} Quotes:${summary.metrics.numQuotations} Tasks:${summary.metrics.numTasks}) | Accounts: ${accountList}
Provide brief, actionable coaching.`;

    // Call AI
    const aiResponse = await runGemini<CoachingInsights>(systemPrompt, userPrompt);

    // Validate and sanitize response
    const coaching: CoachingInsights = {
      motivation: typeof aiResponse.motivation === 'string' ? aiResponse.motivation.trim() : 'Keep up the great work!',
      strengths: Array.isArray(aiResponse.strengths) 
        ? aiResponse.strengths.filter((s): s is string => typeof s === 'string').slice(0, 5)
        : [],
      weaknesses: Array.isArray(aiResponse.weaknesses)
        ? aiResponse.weaknesses.filter((w): w is string => typeof w === 'string').slice(0, 5)
        : [],
      recommendations: Array.isArray(aiResponse.recommendations)
        ? aiResponse.recommendations.filter((r): r is string => typeof r === 'string').slice(0, 5)
        : [],
      priorityAccounts: Array.isArray(aiResponse.priorityAccounts)
        ? aiResponse.priorityAccounts.filter((a): a is string => typeof a === 'string').slice(0, 5)
        : [],
    };

    return NextResponse.json({
      success: true,
      coaching,
    });
  } catch (error: any) {
    console.error('Daily coaching API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
