export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { detectSlippingEngagementAndSuggestActions } from '@/lib/ai/engagement';
import { runGemini } from '@/utils/ai';

/**
 * MASTER CRON ENDPOINT - Runs all daily scheduled tasks
 * 
 * This endpoint combines three previously separate cron jobs:
 * 1. AI Engagement Monitoring (detectSlippingEngagementAndSuggestActions)
 * 2. Follow-up Notification Generation
 * 3. Daily Coaching Generation for Employees
 * 
 * All tasks run sequentially with independent error handling,
 * so if one fails, others still execute.
 */

interface CoachingInsights {
  motivation: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  priorityAccounts: string[];
}

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

/**
 * Generate coaching insights for a single employee
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

/**
 * TASK 1: AI Engagement Monitoring
 * Detects slipping engagement and suggests actions
 */
async function runAIMonitoring(): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    console.log('[DAILY TASKS] Starting AI engagement monitoring...');
    const result = await detectSlippingEngagementAndSuggestActions();
    console.log(`[DAILY TASKS] ✅ AI monitoring completed - updated ${result.updated} accounts`);
    return { success: true, updated: result.updated || 0 };
  } catch (error: any) {
    console.error('[DAILY TASKS] ❌ AI monitoring failed:', error?.message || error);
    return { success: false, updated: 0, error: error?.message || 'Unknown error' };
  }
}

/**
 * TASK 2: Generate Follow-up Notifications
 * Creates notifications for contacts with due follow-up dates
 */
async function generateFollowUpNotifications(): Promise<{ success: boolean; created: number; error?: string }> {
  try {
    console.log('[DAILY TASKS] Starting follow-up notification generation...');
    const supabase = createSupabaseServerClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all contacts with follow-up dates (today or in the past, not completed)
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select(`
        id,
        name,
        follow_up_date,
        sub_account_id
      `)
      .not('follow_up_date', 'is', null)
      .lte('follow_up_date', today.toISOString().split('T')[0]);

    if (contactsError) {
      console.error('[DAILY TASKS] Error fetching contacts:', contactsError);
      return { success: false, created: 0, error: contactsError.message };
    }

    if (!contacts || contacts.length === 0) {
      console.log('[DAILY TASKS] ✅ No contacts with follow-up dates found');
      return { success: true, created: 0 };
    }

    // Get existing notifications to avoid duplicates
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('contact_id')
      .eq('notification_type', 'followup_due')
      .eq('is_completed', false);

    const existingContactIds = new Set(
      (existingNotifications || []).map((n: any) => n.contact_id).filter(Boolean)
    );

    // Get sub-account IDs
    const subAccountIds = [...new Set(contacts.map((c: any) => c.sub_account_id).filter(Boolean))];
    
    // Fetch sub-accounts with their account info
    let subAccountsMap = new Map();
    if (subAccountIds.length > 0) {
      const { data: subAccountsData } = await supabase
        .from('sub_accounts')
        .select('id, account_id')
        .in('id', subAccountIds);
      
      (subAccountsData || []).forEach((sa: any) => {
        subAccountsMap.set(sa.id, sa.account_id);
      });
    }

    // Get account IDs
    const accountIds = [...new Set(Array.from(subAccountsMap.values()).filter(Boolean))];
    
    // Fetch accounts with assigned employees
    let accountsMap = new Map();
    if (accountIds.length > 0) {
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, assigned_employee')
        .in('id', accountIds);
      
      (accountsData || []).forEach((acc: any) => {
        accountsMap.set(acc.id, acc.assigned_employee);
      });
    }

    // Create notifications for contacts that don't have one yet
    const notificationsToCreate = [];
    
    for (const contact of contacts) {
      // Skip if notification already exists
      if (existingContactIds.has(contact.id)) {
        continue;
      }

      // Get account ID from sub-account
      const accountId = contact.sub_account_id ? subAccountsMap.get(contact.sub_account_id) : null;
      
      // Get assigned employee from account
      const assignedEmployee = accountId ? accountsMap.get(accountId) : null;

      // Skip if no assigned employee
      if (!assignedEmployee) {
        continue;
      }

      const followUpDate = new Date(contact.follow_up_date);
      const isDueToday = followUpDate.toDateString() === today.toDateString();
      const isOverdue = followUpDate < today;

      notificationsToCreate.push({
        user_id: assignedEmployee,
        notification_type: 'followup_due',
        title: isOverdue 
          ? `Overdue Follow-up: ${contact.name}`
          : `Follow-up Due: ${contact.name}`,
        message: isOverdue
          ? `Follow-up with ${contact.name} was due on ${followUpDate.toLocaleDateString('en-IN')}. Please follow up.`
          : `Follow-up with ${contact.name} is due today.`,
        contact_id: contact.id,
        sub_account_id: contact.sub_account_id,
        account_id: accountId,
        is_seen: false,
        is_completed: false,
        is_snoozed: false,
        created_at: getCurrentISTTime(),
      });
    }

    if (notificationsToCreate.length === 0) {
      console.log('[DAILY TASKS] ✅ All contacts already have notifications');
      return { success: true, created: 0 };
    }

    // Insert notifications in batch
    const { data: createdNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notificationsToCreate)
      .select();

    if (insertError) {
      console.error('[DAILY TASKS] Error creating notifications:', insertError);
      return { success: false, created: 0, error: insertError.message };
    }

    console.log(`[DAILY TASKS] ✅ Created ${createdNotifications?.length || 0} follow-up notifications`);
    return { success: true, created: createdNotifications?.length || 0 };
  } catch (error: any) {
    console.error('[DAILY TASKS] ❌ Follow-up notification generation failed:', error);
    return { success: false, created: 0, error: error?.message || 'Unknown error' };
  }
}

/**
 * TASK 3: Generate Daily Coaching for Employees
 * Creates AI-powered coaching insights for each employee
 */
async function generateDailyCoaching(): Promise<{ success: boolean; processed: number; total: number; errors?: string[] }> {
  try {
    console.log('[DAILY TASKS] Starting daily coaching generation...');
    const supabase = createSupabaseServerClient();

    // Get unique employee usernames from accounts.assigned_employee OR activities.employee_id
    const employeesSet = new Set<string>();

    // Get employees from accounts table
    const { data: accountsData, error: accountsError } = await supabase
      .from('accounts')
      .select('assigned_employee')
      .not('assigned_employee', 'is', null);

    if (accountsError) {
      console.error('[DAILY TASKS] Error fetching employees from accounts:', accountsError);
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
      console.error('[DAILY TASKS] Error fetching employees from activities:', activitiesError);
    } else if (activitiesData) {
      activitiesData.forEach((act: any) => {
        if (act.employee_id && typeof act.employee_id === 'string') {
          employeesSet.add(act.employee_id);
        }
      });
    }

    const employees = Array.from(employeesSet).filter(Boolean);
    
    if (employees.length === 0) {
      console.log('[DAILY TASKS] ✅ No employees found for coaching');
      return { success: true, processed: 0, total: 0 };
    }

    console.log(`[DAILY TASKS] Processing ${employees.length} employees for coaching`);

    // Generate coaching for each employee and store results
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
            errors.push(errorMsg);
            // Don't return early - continue processing other employees
            continue;
          } else {
            console.error(`[DAILY TASKS] Error inserting coaching for ${employee}:`, insertError);
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
            console.error(`[DAILY TASKS] Error inserting notification for coaching for ${employee}:`, notifError.message);
          }
        }

        processed++;
        console.log(`[DAILY TASKS] ✅ Processed coaching for ${employee}`);
      } catch (error: any) {
        console.error(`[DAILY TASKS] Error processing ${employee}:`, error);
        errors.push(`${employee}: ${error.message || 'Unknown error'}`);
      }
    }

    console.log(`[DAILY TASKS] ✅ Daily coaching completed - processed ${processed}/${employees.length} employees`);
    return {
      success: true,
      processed,
      total: employees.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('[DAILY TASKS] ❌ Daily coaching generation failed:', error);
    return {
      success: false,
      processed: 0,
      total: 0,
      errors: [error?.message || 'Unknown error'],
    };
  }
}

/**
 * MAIN ENDPOINT - Runs all daily tasks
 */
export async function GET(request: NextRequest) {
  // Verify the request is from a cron job (optional security check)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is set, require it for security
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  console.log('[DAILY TASKS] ========================================');
  console.log('[DAILY TASKS] Starting daily cron tasks...');
  console.log('[DAILY TASKS] ========================================');

  // Run all three tasks independently
  // Each task has its own error handling, so failures don't cascade
  const [aiMonitoring, notifications, coaching] = await Promise.all([
    runAIMonitoring(),
    generateFollowUpNotifications(),
    generateDailyCoaching(),
  ]);

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  const result = {
    success: true,
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    tasks: {
      aiMonitoring: {
        success: aiMonitoring.success,
        updated: aiMonitoring.updated,
        error: aiMonitoring.error,
      },
      notifications: {
        success: notifications.success,
        created: notifications.created,
        error: notifications.error,
      },
      coaching: {
        success: coaching.success,
        processed: coaching.processed,
        total: coaching.total,
        errors: coaching.errors,
      },
    },
    summary: {
      allSuccessful: aiMonitoring.success && notifications.success && coaching.success,
      totalAccountsUpdated: aiMonitoring.updated,
      totalNotificationsCreated: notifications.created,
      totalEmployeesCoached: coaching.processed,
    },
  };

  console.log('[DAILY TASKS] ========================================');
  console.log('[DAILY TASKS] Daily tasks completed in', duration, 'seconds');
  console.log('[DAILY TASKS] Summary:', JSON.stringify(result.summary, null, 2));
  console.log('[DAILY TASKS] ========================================');

  return NextResponse.json(result);
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
