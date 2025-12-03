import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { calculateSubaccountAIInsights, runClaude } from '@/utils/ai';
// TODO: will implement new AI-based engagement refresh later (v2).
// import { updateEngagementScoreAI } from '@/utils/ai';

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

    // Build prompt for Claude
    const systemPrompt = `You are a CRM admin performance coach. Analyze this employee's performance and output JSON containing summary, strengths[], weaknesses[], coachingAdvice[], suggestedFocusAccounts[] (array of {accountName, reason}).`;

    const userPrompt = `
Employee: ${employeeUsername}

Sub-Accounts Performance:
- Total sub-accounts: ${totalSubAccounts}
- Average engagement score: ${averageEngagement.toFixed(1)}
- Low engagement (<40): ${lowCount}
- Medium engagement (40-69): ${mediumCount}
- High engagement (≥70): ${highCount}

Sub-Account Details:
${JSON.stringify(
  (subAccounts || []).map(sa => {
    const account = Array.isArray(sa.accounts) ? sa.accounts[0] : sa.accounts;
    return {
      subAccountName: sa.sub_account_name,
      accountName: (account as any)?.account_name || 'Unknown',
      engagementScore: Number(sa.engagement_score) || 0,
    };
  }),
  null,
  2
)}

Recent Activities (${recentActivities?.length || 0}):
${JSON.stringify(
  (recentActivities || []).map(a => ({
    type: a.activity_type,
    description: a.description || null,
    age: Math.floor((new Date().getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24)) + ' days ago',
  })),
  null,
  2
)}

Analyze performance and return JSON:
{
  "summary": "<2-3 sentence overview>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "coachingAdvice": ["<advice 1>", "<advice 2>", "<advice 3>"],
  "suggestedFocusAccounts": [
    { "accountName": "<name>", "reason": "<why focus here>" }
  ]
}
`.trim();

    // Call AI via runClaude
    const raw = await runClaude<AdminAIScoringResult>(systemPrompt, userPrompt);

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

        // 3) Call Claude for suggestions
        const systemPrompt = `You are a CRM Engagement coach. This sub-account seems at risk. Provide 1-2 actionable suggestions in human coaching style.`;

        const userPrompt = `
Sub-account: ${sub.sub_account_name}
Parent Account: ${accountName}
Assigned Employee: ${sub.assigned_employee || 'Not assigned'}
Current Engagement Score: ${sub.engagement_score}

Recent Activities (${recentActivities?.length || 0}):
${JSON.stringify(activitySummary, null, 2)}

This sub-account has low engagement. Provide actionable coaching advice.

Return JSON:
{
  "message": "<1-2 sentence actionable suggestion>",
  "priority": "low | medium | high"
}
`.trim();

        const raw = await runClaude<{ message: string; priority: string }>(systemPrompt, userPrompt);

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

