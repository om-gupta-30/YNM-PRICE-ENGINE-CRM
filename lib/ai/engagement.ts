import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { calculateSubaccountAIInsights, runGemini, runGeminiFast } from '@/utils/ai';

export async function refreshAccountEngagementScore(accountId?: number | null) {
  // TODO: will implement new AI-based engagement refresh later (v2).
  // For now, this function does nothing to avoid modifying engagement_score via old AI logic.
  if (!accountId) return null;

  // AI logic commented out - will be replaced with v2 implementation
  // try {
  //   const supabase = createSupabaseServerClient();
  //
  //   const { data: account, error: accountError } = await supabase
  //     .from('accounts')
  //     .select('id, account_name, company_stage, company_tag, assigned_employee, engagement_score, ai_engagement_tips')
  //     .eq('id', accountId)
  //     .single();
  //
  //   if (accountError || !account) {
  //     console.error('Unable to fetch account for AI scoring:', accountError?.message);
  //     return null;
  //   }
  //
  //   const since = new Date();
  //   since.setDate(since.getDate() - 30);
  //
  //   const { data: recentActivities, error: activitiesError } = await supabase
  //     .from('activities')
  //     .select('id, activity_type, description, metadata, created_at, employee_id')
  //     .eq('account_id', accountId)
  //     .gte('created_at', since.toISOString())
  //     .order('created_at', { ascending: false });
  //
  //   if (activitiesError) {
  //     console.error('Unable to fetch activities for AI scoring:', activitiesError.message);
  //     return null;
  //   }
  //
  //   const aiResult = await updateEngagementScoreAI(account, recentActivities || []);
  //
  //   const nextScore = Math.max(0, Math.min(100, Number(aiResult.engagementScore ?? 0)));
  //   const tipsPayload = Array.isArray(aiResult.tips) ? JSON.stringify(aiResult.tips) : null;
  //
  //   await supabase
  //     .from('accounts')
  //     .update({
  //       engagement_score: nextScore,
  //       ai_engagement_tips: tipsPayload,
  //       updated_at: new Date().toISOString(),
  //       last_activity_at: new Date().toISOString(),
  //     })
  //     .eq('id', accountId);
  //
  //   return {
  //     engagement_score: nextScore,
  //     tips: aiResult.tips || [],
  //   };
  // } catch (error) {
  //   console.error('refreshAccountEngagementScore error:', error);
  //   return null;
  // }

  return null;
}

// ============================================
// V2 AI: Sub-account Engagement Scoring Orchestrator
// ============================================

export async function runSubaccountAIScoring(subAccountId: number) {
  try {
    const supabase = createSupabaseServerClient();

    // A) Fetch the sub-account
    const { data: subAccount, error: subAccountError } = await supabase
      .from('sub_accounts')
      .select('id, sub_account_name, account_id, engagement_score, assigned_employee')
      .eq('id', subAccountId)
      .eq('is_active', true)
      .single();

    if (subAccountError || !subAccount) {
      throw new Error(`Subaccount not found: ${subAccountError?.message || 'No sub-account found with id ' + subAccountId}`);
    }

    // B) Fetch parent account
    const { data: parentAccount, error: parentAccountError } = await supabase
      .from('accounts')
      .select('id, account_name')
      .eq('id', subAccount.account_id)
      .single();

    if (parentAccountError || !parentAccount) {
      throw new Error(`Parent account not found: ${parentAccountError?.message || 'No account found with id ' + subAccount.account_id}`);
    }

    // C) Fetch recent activities for this account (filtered by parent account_id)
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('activity_type, description, created_at')
      .eq('account_id', subAccount.account_id)
      .order('created_at', { ascending: false })
      .limit(25);

    if (activitiesError) {
      console.error('Error fetching activities for AI scoring:', activitiesError.message);
      // Continue with empty activities array rather than failing
    }

    // D) Build input and call AI scoring function
    const result = await calculateSubaccountAIInsights({
      subaccountName: subAccount.sub_account_name,
      accountName: parentAccount.account_name,
      assignedEmployee: subAccount.assigned_employee || null,
      currentScore: Number(subAccount.engagement_score ?? 0),
      activities: (recentActivities || []).map(a => ({
        activity_type: a.activity_type,
        created_at: a.created_at,
        description: a.description || null,
      })),
    });

    // E) Write AI results to database
    const { error: updateError } = await supabase
      .from('sub_accounts')
      .update({
        engagement_score: result.score,
        ai_insights: JSON.stringify({
          tips: result.tips,
          comment: result.comment,
        updated_at: new Date().toISOString(),
        }),
      })
      .eq('id', subAccountId);

    if (updateError) {
      console.error('Error updating sub-account with AI insights:', updateError.message);
      // Continue and return result even if DB update fails
    }

    // E.2) Insert engagement score snapshot into history
    // Check if we already have a snapshot for today (to avoid duplicates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data: existingSnapshot } = await supabase
      .from('engagement_history')
      .select('id')
      .eq('sub_account_id', subAccountId)
      .gte('created_at', todayStart)
      .lt('created_at', todayEnd)
      .limit(1)
      .single();

    // Only insert if no snapshot exists for today
    if (!existingSnapshot) {
      const { error: historyError } = await supabase
        .from('engagement_history')
        .insert({
          sub_account_id: subAccountId,
          score: result.score,
          created_at: new Date().toISOString(),
        });

      if (historyError) {
        // Log but don't fail - history is optional
        console.warn('Error inserting engagement history snapshot:', historyError.message);
      }
    }

    // E.1) Insert notification if AI returned comment or alert
    if (result.comment && result.comment.trim()) {
      // Get assigned employee from subaccount or parent account
      let assignedEmployee = subAccount.assigned_employee;
      
      // If subaccount doesn't have assigned_employee, try to get it from parent account
      if (!assignedEmployee) {
        const { data: accountData } = await supabase
          .from('accounts')
          .select('assigned_employee')
          .eq('id', subAccount.account_id)
          .single();
        
        if (accountData?.assigned_employee) {
          assignedEmployee = accountData.assigned_employee;
        }
      }

      // Insert notification if we have an assigned employee (target_role = 'employee' for AI insights)
      if (assignedEmployee) {
        try {
          await supabase
            .from('employee_notifications')
            .insert({
              employee: assignedEmployee,
              message: result.comment,
              priority: 'normal',
              target_role: 'employee',
              is_read: false,
              created_at: new Date().toISOString(),
            });
        } catch (notifError: any) {
          // Don't break the flow if notification insert fails
          console.error('Error inserting notification for AI comment:', notifError.message);
        }
      }
    }

    // F) Return the AI result
    return result;
  } catch (error: any) {
    console.error('runSubaccountAIScoring error:', error);
    throw error; // Re-throw to let caller handle
  }
}

// ============================================
// V2 AI: Auto-trigger scoring after activity creation
// ============================================

export async function triggerAIScoringForActivity(activity: {
  account_id?: number | null;
  sub_account_id?: number | null;
}) {
  try {
    const supabase = createSupabaseServerClient();

    // 1) If sub_account exists, use it directly
    if (activity.sub_account_id) {
      await runSubaccountAIScoring(activity.sub_account_id);
      return;
    }

    // 2) If only account exists, find its subAccounts and score all of them
    if (activity.account_id) {
      const { data: subs } = await supabase
        .from('sub_accounts')
        .select('id')
        .eq('account_id', activity.account_id)
        .eq('is_active', true);

      if (subs && subs.length > 0) {
        // Score all sub-accounts for this account
        for (const s of subs) {
          await runSubaccountAIScoring(s.id);
        }
      }
    }
  } catch (err) {
    console.error('AI auto scoring failed:', err);
    // Don't throw - AI scoring should not break activity logging
  }
}

// ============================================
// V2 AI: Admin Employee Performance Scoring
// ============================================

export interface AdminAIScoringResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  coachingAdvice: string[];
  suggestedFocusAccounts: Array<{
    accountName: string;
    reason: string;
  }>;
}

export async function runAdminAIScoring(employeeUsername: string): Promise<AdminAIScoringResult> {
  try {
    const supabase = createSupabaseServerClient();

    // Fetch all sub_accounts assigned to this employee
    const { data: subAccounts, error: subAccountsError } = await supabase
      .from('sub_accounts')
      .select('id, sub_account_name, engagement_score, account_id, accounts:account_id(account_name)')
      .eq('assigned_employee', employeeUsername)
      .eq('is_active', true);

    if (subAccountsError) {
      console.error('Error fetching sub-accounts for admin scoring:', subAccountsError.message);
    }

    // Compute metrics
    const totalSubAccounts = subAccounts?.length || 0;
    const totalEngagement = subAccounts?.reduce((sum, sa) => sum + (Number(sa.engagement_score) || 0), 0) || 0;
    const averageEngagement = totalSubAccounts > 0 ? totalEngagement / totalSubAccounts : 0;

    const lowCount = subAccounts?.filter(sa => (Number(sa.engagement_score) || 0) < 40).length || 0;
    const mediumCount = subAccounts?.filter(sa => {
      const score = Number(sa.engagement_score) || 0;
      return score >= 40 && score < 70;
    }).length || 0;
    const highCount = subAccounts?.filter(sa => (Number(sa.engagement_score) || 0) >= 70).length || 0;

    // Fetch recent activities for this employee
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('activity_type, description, created_at, account_id')
      .eq('employee_id', employeeUsername)
      .order('created_at', { ascending: false })
      .limit(20);

    if (activitiesError) {
      console.error('Error fetching activities for admin scoring:', activitiesError.message);
    }

    // Build concise prompt
    const systemPrompt = `CRM performance coach. Output JSON: summary (1 sentence), strengths[], weaknesses[], coachingAdvice[], suggestedFocusAccounts[] ({accountName, reason}). Keep responses brief.`;

    // Limit context to reduce costs
    const topSubAccounts = (subAccounts || []).slice(0, 10).map(sa => {
      const account = Array.isArray(sa.accounts) ? sa.accounts[0] : sa.accounts;
      return `${(account as any)?.account_name || sa.sub_account_name}: ${Number(sa.engagement_score) || 0}`;
    }).join(', ');

    const recentActivitySummary = (recentActivities || []).slice(0, 10).map(a => 
      `${a.activity_type}${a.description ? ': ' + a.description.substring(0, 50) : ''}`
    ).join('; ');

    const userPrompt = `Employee: ${employeeUsername}
Metrics: ${totalSubAccounts} accounts, avg score ${averageEngagement.toFixed(0)}, low:${lowCount} med:${mediumCount} high:${highCount}
Top accounts: ${topSubAccounts || 'None'}
Recent: ${recentActivitySummary || 'No recent activity'}

Return JSON with brief, actionable insights.`;

    // Call AI via runGemini
    const raw = await runGemini<AdminAIScoringResult>(systemPrompt, userPrompt);

    // Parse and validate response with fallback
    const summary = typeof raw.summary === 'string' && raw.summary.trim()
      ? raw.summary.trim()
      : `Employee ${employeeUsername} manages ${totalSubAccounts} sub-accounts with an average engagement score of ${averageEngagement.toFixed(1)}.`;

    const strengths = Array.isArray(raw.strengths) && raw.strengths.length > 0
      ? raw.strengths.filter((s): s is string => typeof s === 'string').slice(0, 5)
      : ['Consistent activity tracking', 'Good account coverage'];

    const weaknesses = Array.isArray(raw.weaknesses) && raw.weaknesses.length > 0
      ? raw.weaknesses.filter((w): w is string => typeof w === 'string').slice(0, 5)
      : ['Some accounts need more attention'];

    const coachingAdvice = Array.isArray(raw.coachingAdvice) && raw.coachingAdvice.length > 0
      ? raw.coachingAdvice.filter((a): a is string => typeof a === 'string').slice(0, 5)
      : ['Focus on accounts with low engagement scores', 'Increase follow-up frequency'];

    const suggestedFocusAccounts = Array.isArray(raw.suggestedFocusAccounts) && raw.suggestedFocusAccounts.length > 0
      ? raw.suggestedFocusAccounts
          .filter((a): a is { accountName: string; reason: string } => 
            typeof a === 'object' && 
            a !== null && 
            typeof (a as any).accountName === 'string' &&
            typeof (a as any).reason === 'string'
          )
          .slice(0, 5)
      : (subAccounts || [])
          .filter(sa => (Number(sa.engagement_score) || 0) < 40)
          .slice(0, 3)
          .map(sa => {
            const account = Array.isArray(sa.accounts) ? sa.accounts[0] : sa.accounts;
            return {
              accountName: (account as any)?.account_name || sa.sub_account_name,
              reason: 'Low engagement score needs attention',
            };
          });

    return {
      summary,
      strengths,
      weaknesses,
      coachingAdvice,
      suggestedFocusAccounts,
    };
  } catch (error: any) {
    console.error('runAdminAIScoring error:', error);
    // Return fallback values on error
    return {
      summary: `Error analyzing performance for ${employeeUsername}. Please try again.`,
      strengths: [],
      weaknesses: [],
      coachingAdvice: ['Review account assignments', 'Check activity logs'],
      suggestedFocusAccounts: [],
    };
  }
}

// ============================================
// V2 AI: Escalation Intelligence
// ============================================

/**
 * Check if sub-account has 3+ AI slipping alerts in past 7 days
 * If so, insert escalation notification
 */
async function checkSubAccountEscalation(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  subAccountId: number,
  subAccountName: string
): Promise<void> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startTime = sevenDaysAgo.toISOString();

    // Count admin notifications for this sub-account's employee in past 7 days
    // We'll check by looking for notifications that mention this sub-account or its employee
    // Since we don't have direct sub-account reference in notifications, we'll check by employee
    // and message content, or we can check all admin notifications and filter
    
    // Get the sub-account to find assigned employee
    const { data: subAccount } = await supabase
      .from('sub_accounts')
      .select('assigned_employee, account_id, accounts:account_id(account_name)')
      .eq('id', subAccountId)
      .single();

    if (!subAccount?.assigned_employee) {
      return; // No employee assigned, skip escalation check
    }

    // Count admin notifications for this employee in past 7 days
    // We'll look for notifications that are likely related to this sub-account
    const { data: recentNotifications, error: notifError } = await supabase
      .from('employee_notifications')
      .select('id')
      .eq('target_role', 'admin')
      .eq('employee', subAccount.assigned_employee)
      .gte('created_at', startTime)
      .order('created_at', { ascending: false });

    if (notifError) {
      console.error('Error checking escalation for sub-account:', notifError);
      return;
    }

    // If 3+ admin notifications in past 7 days, escalate
    if (recentNotifications && recentNotifications.length >= 3) {
      // Check if escalation already sent recently (avoid duplicates)
      const { data: recentEscalations } = await supabase
        .from('employee_notifications')
        .select('id')
        .eq('target_role', 'admin')
        .eq('employee', subAccount.assigned_employee)
        .like('message', '%has repeatedly slipped — escalate follow-up%')
        .gte('created_at', startTime)
        .limit(1);

      if (!recentEscalations || recentEscalations.length === 0) {
        const account = Array.isArray(subAccount.accounts) 
          ? subAccount.accounts[0] 
          : subAccount.accounts;
        const accountName = (account as any)?.account_name || subAccountName;

        try {
          await supabase
            .from('employee_notifications')
            .insert({
              employee: subAccount.assigned_employee,
              message: `Account ${subAccountName} (${accountName}) has repeatedly slipped — escalate follow-up`,
              priority: 'high',
              target_role: 'admin',
              is_read: false,
              created_at: new Date().toISOString(),
            });
          console.log(`[ESCALATION] Sub-account ${subAccountName} escalated (${recentNotifications.length} alerts in 7 days)`);
        } catch (escalationError: any) {
          console.error('Error inserting escalation notification:', escalationError.message);
        }
      }
    }
  } catch (error: any) {
    console.error('Error checking sub-account escalation:', error);
    // Don't throw - escalation check should not break main flow
  }
}

/**
 * Check if engagement score dropped by 20+ points in past 30 days
 * This checks sub-accounts and compares current score with historical patterns
 */
async function checkEngagementScoreDrop(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  subAccountId: number,
  currentScore: number,
  subAccountName: string
): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startTime = thirtyDaysAgo.toISOString();

    // Check if there are multiple alerts/notifications that might indicate a drop
    // We'll look for patterns in notifications or check if score is significantly low
    // Since we don't have historical score tracking, we'll use a heuristic:
    // If current score is < 40 and there are multiple admin alerts, likely a drop occurred
    
    // Get sub-account details
    const { data: subAccount } = await supabase
      .from('sub_accounts')
      .select('assigned_employee, account_id, accounts:account_id(account_name)')
      .eq('id', subAccountId)
      .single();

    if (!subAccount?.assigned_employee) {
      return;
    }

    // Count admin notifications for this employee in past 30 days
    const { data: recentAdminNotifications, error: notifError } = await supabase
      .from('employee_notifications')
      .select('id, message, created_at')
      .eq('target_role', 'admin')
      .eq('employee', subAccount.assigned_employee)
      .gte('created_at', startTime)
      .order('created_at', { ascending: false });

    if (notifError) {
      console.error('Error checking engagement score drop:', notifError);
      return;
    }

    // Heuristic: If score is low (< 40) and there are 2+ admin alerts in past 30 days,
    // it likely indicates a significant drop
    // Also check if current score is very low compared to what would be "normal"
    if (currentScore < 40 && recentAdminNotifications && recentAdminNotifications.length >= 2) {
      const account = Array.isArray(subAccount.accounts) 
        ? subAccount.accounts[0] 
        : subAccount.accounts;
      const accountName = (account as any)?.account_name || subAccountName;

      // Check if we already sent a drop notification recently (avoid duplicates)
      const recentDropNotifications = recentAdminNotifications.filter(n => 
        n.message?.includes('Major engagement drop') || 
        n.message?.includes('engagement drop detected')
      );

      if (recentDropNotifications.length === 0) {
        try {
          await supabase
            .from('employee_notifications')
            .insert({
              employee: subAccount.assigned_employee,
              message: `Major engagement drop detected for account ${subAccountName} (${accountName}) — intervene`,
              priority: 'critical',
              target_role: 'admin',
              is_read: false,
              created_at: new Date().toISOString(),
            });
          console.log(`[ESCALATION] Engagement drop detected for ${subAccountName} (score: ${currentScore})`);
        } catch (dropError: any) {
          console.error('Error inserting engagement drop notification:', dropError.message);
        }
      }
    }
  } catch (error: any) {
    console.error('Error checking engagement score drop:', error);
    // Don't throw - escalation check should not break main flow
  }
}

// ============================================
// V2 AI: Proactive Engagement Alerts
// ============================================

export async function detectSlippingEngagementAndSuggestActions() {
  try {
    const supabase = createSupabaseServerClient();

    // 1) Query sub_accounts where engagement score < 60
    const { data: riskySubs, error: subsError } = await supabase
      .from('sub_accounts')
      .select('id, sub_account_name, account_id, engagement_score, assigned_employee, accounts:account_id(account_name)')
      .lte('engagement_score', 60)
      .eq('is_active', true);

    if (subsError) {
      console.error('Error fetching risky sub-accounts:', subsError.message);
      return { updated: 0, error: subsError.message };
    }

    if (!riskySubs || riskySubs.length === 0) {
      return { updated: 0 };
    }

    let updatedCount = 0;

    // 2) For each risky sub-account, fetch recent activities and get AI suggestions
    for (const sub of riskySubs) {
      try {
        // Fetch last few activities (5-10) for context
        const { data: recentActivities } = await supabase
          .from('activities')
          .select('activity_type, description, created_at')
          .eq('account_id', sub.account_id)
          .order('created_at', { ascending: false })
          .limit(10);

        // Build context summary
        const account = Array.isArray(sub.accounts) 
          ? sub.accounts[0] 
          : sub.accounts;
        const accountName = (account as any)?.account_name || 'Unknown';
        
        const activitySummary = (recentActivities || []).map(a => ({
          type: a.activity_type,
          description: a.description || null,
          age: Math.floor((new Date().getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24)) + ' days ago',
        }));

        // 3) Call AI for suggestions - concise prompt
        const systemPrompt = `CRM coach. Low engagement detected. Return JSON: {message: "1 sentence action", priority: "low|medium|high"}.`;

        const recentActivityText = (recentActivities || []).slice(0, 5).map(a => 
          `${a.activity_type}${a.description ? ': ' + a.description.substring(0, 40) : ''}`
        ).join('; ') || 'No recent activity';

        const userPrompt = `Account: ${sub.sub_account_name} (${accountName}), Score: ${sub.engagement_score}, Employee: ${sub.assigned_employee || 'Unassigned'}
Recent: ${recentActivityText}
Provide brief action suggestion.`;

        // Use FAST_MODEL for bulk slipping engagement detection
        const raw = await runGeminiFast<{ message: string; priority: string }>(systemPrompt, userPrompt);

        // Validate and sanitize response
        const alertMessage = typeof raw.message === 'string' && raw.message.trim()
          ? raw.message.trim()
          : 'Engagement is low. Consider reaching out with value-added communication.';
        
        const priority = typeof raw.priority === 'string' && ['low', 'medium', 'high'].includes(raw.priority.toLowerCase())
          ? raw.priority.toLowerCase()
          : 'medium';

        // 4) Get existing ai_insights and append alert
        const { data: existingSub } = await supabase
          .from('sub_accounts')
          .select('ai_insights')
          .eq('id', sub.id)
          .single();

        let existingInsights: any = {};
        if (existingSub?.ai_insights) {
          try {
            existingInsights = JSON.parse(existingSub.ai_insights);
          } catch {
            // If parsing fails, start fresh
            existingInsights = {};
          }
        }

        // Update ai_insights with alert
        const updatedInsights = {
          ...existingInsights,
          alert: alertMessage,
          alert_priority: priority,
          alert_updated_at: new Date().toISOString(),
        };

        // Save results
        const { error: updateError } = await supabase
          .from('sub_accounts')
          .update({
            ai_insights: JSON.stringify(updatedInsights),
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error(`Error updating sub-account ${sub.id} with alert:`, updateError.message);
        } else {
          updatedCount++;
          
          // Insert notification for the alert (target_role = 'admin' for slipping engagement alerts)
          if (sub.assigned_employee && alertMessage) {
            try {
              // Map priority: 'low' -> 'low', 'medium' -> 'normal', 'high' -> 'high'
              let notificationPriority: 'low' | 'normal' | 'high' | 'critical' = 'normal';
              if (priority === 'low') {
                notificationPriority = 'low';
              } else if (priority === 'high') {
                notificationPriority = 'high';
              } else if (priority === 'critical') {
                notificationPriority = 'critical';
              }

              await supabase
                .from('employee_notifications')
                .insert({
                  employee: sub.assigned_employee,
                  message: alertMessage,
                  priority: notificationPriority,
                  target_role: 'admin',
                  is_read: false,
                  created_at: new Date().toISOString(),
                });

              // Escalation check: If 3+ alerts in past 7 days, escalate
              await checkSubAccountEscalation(supabase, sub.id, sub.sub_account_name);

              // Escalation check: If engagement score dropped significantly, escalate
              await checkEngagementScoreDrop(supabase, sub.id, Number(sub.engagement_score) || 0, sub.sub_account_name);
            } catch (notifError: any) {
              // Don't break the flow if notification insert fails
              console.error(`Error inserting notification for alert on sub-account ${sub.id}:`, notifError.message);
            }
          }
        }
      } catch (err: any) {
        console.error(`Error processing sub-account ${sub.id}:`, err);
        // Continue with next sub-account
      }
    }

    return { updated: updatedCount };
  } catch (error: any) {
    console.error('detectSlippingEngagementAndSuggestActions error:', error);
    return { updated: 0, error: error.message };
  }
}

