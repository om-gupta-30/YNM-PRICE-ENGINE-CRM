export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { runGemini } from '@/utils/ai';

/**
 * Check if employee has 5+ AI coaching/alert messages in past 10 days
 * If so, insert escalation notification
 */
async function checkEmployeeEscalation(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  employee: string
): Promise<void> {
  try {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const startTime = tenDaysAgo.toISOString();

    // Count notifications for this employee in past 10 days
    const { data: recentNotifications, error: notifError } = await supabase
      .from('employee_notifications')
      .select('id')
      .eq('employee', employee)
      .gte('created_at', startTime)
      .order('created_at', { ascending: false });

    if (notifError) {
      console.error(`Error checking escalation for employee ${employee}:`, notifError);
      return;
    }

    // If 5+ notifications in past 10 days, escalate
    if (recentNotifications && recentNotifications.length >= 5) {
      // Check if escalation already sent recently (avoid duplicates)
      const { data: recentEscalations } = await supabase
        .from('employee_notifications')
        .select('id')
        .eq('employee', employee)
        .eq('target_role', 'admin')
        .like('message', '%needs attention — engagement risk increasing%')
        .gte('created_at', startTime)
        .limit(1);

      if (!recentEscalations || recentEscalations.length === 0) {
        try {
          await supabase
            .from('employee_notifications')
            .insert({
              employee: employee,
              message: `${employee} needs attention — engagement risk increasing`,
              priority: 'critical',
              target_role: 'admin',
              is_read: false,
              created_at: new Date().toISOString(),
            });
          console.log(`[ESCALATION] Employee ${employee} escalated (${recentNotifications.length} notifications in 10 days)`);
        } catch (escalationError: any) {
          console.error('Error inserting employee escalation notification:', escalationError.message);
        }
      }
    }
  } catch (error: any) {
    console.error('Error checking employee escalation:', error);
    // Don't throw - escalation check should not break main flow
  }
}

interface CoachingInsights {
  motivation: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  priorityAccounts: string[];
}

/**
 * Generate coaching insights for a single employee
 * Reuses the logic from /api/ai/daily-coaching
 */
async function generateCoachingForEmployee(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  employee: string
): Promise<CoachingInsights | null> {
  try {
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
      console.error(`Error fetching activities for ${employee}:`, activitiesError);
      return null;
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

    // Prepare AI prompts
    const systemPrompt = `You are a sales coaching assistant. Analyze employee activity data and provide constructive, actionable coaching feedback. Focus on motivation, strengths, areas for improvement, and specific recommendations.`;

    const userPrompt = `
Employee: ${summary.employee}
Time Period: Last 24 hours (${new Date(summary.timeWindow.start).toLocaleDateString()} to ${new Date(summary.timeWindow.end).toLocaleDateString()})

Activity Summary:
- Total Activities: ${summary.totalActivities}
- Calls: ${summary.metrics.numCalls}
- Followups: ${summary.metrics.numFollowups}
- Quotations: ${summary.metrics.numQuotations}
- Tasks: ${summary.metrics.numTasks}
${summary.engagementChanges ? `- Engagement Changes: ${summary.engagementChanges.length} noted` : ''}
${summary.accountNames.length > 0 ? `- Accounts Worked On: ${summary.accountNames.join(', ')}` : ''}

Based on this activity data, provide coaching insights in the following JSON format:
{
  "motivation": "A brief motivational message (1-2 sentences) acknowledging their effort and encouraging continued engagement",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["area for improvement 1", "area for improvement 2"],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3"],
  "priorityAccounts": ["account name 1", "account name 2", "account name 3"]
}

Be specific and constructive. If activity levels are low, provide gentle encouragement. If activity is high, acknowledge the effort and suggest optimization strategies.
    `.trim();

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

    return coaching;
  } catch (error: any) {
    console.error(`Error generating coaching for ${employee}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  // Optional: Verify the request is from a cron job (security check)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is set, require it for security
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const supabase = createSupabaseServerClient();

    // Step 1: Get unique employee usernames from accounts.assigned_employee OR activities.employee_id
    const employeesSet = new Set<string>();

    // Get employees from accounts table
    const { data: accountsData, error: accountsError } = await supabase
      .from('accounts')
      .select('assigned_employee')
      .not('assigned_employee', 'is', null);

    if (accountsError) {
      console.error('Error fetching employees from accounts:', accountsError);
    } else if (accountsData) {
      accountsData.forEach((acc: any) => {
        if (acc.assigned_employee && typeof acc.assigned_employee === 'string') {
          employeesSet.add(acc.assigned_employee);
        }
      });
    }

    // Get employees from activities table
    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select('employee_id')
      .not('employee_id', 'is', null);

    if (activitiesError) {
      console.error('Error fetching employees from activities:', activitiesError);
    } else if (activitiesData) {
      activitiesData.forEach((act: any) => {
        if (act.employee_id && typeof act.employee_id === 'string') {
          employeesSet.add(act.employee_id);
        }
      });
    }

    const employees = Array.from(employeesSet).filter(Boolean);
    
    if (employees.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No employees found',
      });
    }

    console.log(`[DAILY COACHING] Processing ${employees.length} employees`);

    // Step 2: Note - employee_ai_coaching table should be created manually
    // If table doesn't exist, the insert will fail with a clear error message

    // Step 3: Generate coaching for each employee and store results
    let processed = 0;
    const errors: string[] = [];

    for (const employee of employees) {
      try {
        const coaching = await generateCoachingForEmployee(supabase, employee);
        
        if (!coaching) {
          errors.push(`${employee}: Failed to generate coaching`);
          continue;
        }

        // Insert coaching result into database
        const { error: insertError } = await supabase
          .from('employee_ai_coaching')
          .insert({
            employee,
            coaching: coaching as any, // JSONB accepts the object
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          // If table doesn't exist, provide clear instructions
          if (insertError.message?.includes('does not exist') || insertError.code === '42P01') {
            const errorMsg = `Table 'employee_ai_coaching' does not exist. Please create it in Supabase SQL Editor:
CREATE TABLE employee_ai_coaching (
  id SERIAL PRIMARY KEY,
  employee TEXT NOT NULL,
  coaching JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_employee_ai_coaching_employee ON employee_ai_coaching(employee);
CREATE INDEX idx_employee_ai_coaching_created_at ON employee_ai_coaching(created_at DESC);`;
            console.error(errorMsg);
            return NextResponse.json({
              success: false,
              error: errorMsg,
              processed: 0,
            }, { status: 500 });
          } else {
            console.error(`Error inserting coaching for ${employee}:`, insertError);
            errors.push(`${employee}: ${insertError.message}`);
          }
          continue;
        }

        // Insert notification for the coaching (using motivation or summary, target_role = 'employee')
        if (coaching.motivation && coaching.motivation.trim()) {
          try {
            await supabase
              .from('employee_notifications')
              .insert({
                employee,
                message: coaching.motivation,
                priority: 'low',
                target_role: 'employee',
                is_read: false,
                created_at: new Date().toISOString(),
              });

            // Escalation check: If employee has 5+ notifications in past 10 days, escalate to admin
            await checkEmployeeEscalation(supabase, employee);
          } catch (notifError: any) {
            // Don't break the flow if notification insert fails
            console.error(`Error inserting notification for coaching for ${employee}:`, notifError.message);
          }
        }

        processed++;
        console.log(`[DAILY COACHING] ✅ Processed ${employee}`);
      } catch (error: any) {
        console.error(`Error processing ${employee}:`, error);
        errors.push(`${employee}: ${error.message || 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      total: employees.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Daily coaching executor error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
