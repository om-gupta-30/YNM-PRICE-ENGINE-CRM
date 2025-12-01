'use server';

import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { updateEngagementScoreAI } from '@/utils/ai';

export async function refreshAccountEngagementScore(accountId?: number | null) {
  if (!accountId) return null;

  try {
    const supabase = createSupabaseServerClient();

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, account_name, company_stage, company_tag, assigned_employee, engagement_score, ai_engagement_tips')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('Unable to fetch account for AI scoring:', accountError?.message);
      return null;
    }

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data: recentActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, activity_type, description, metadata, created_at, employee_id')
      .eq('account_id', accountId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (activitiesError) {
      console.error('Unable to fetch activities for AI scoring:', activitiesError.message);
      return null;
    }

    const aiResult = await updateEngagementScoreAI(account, recentActivities || []);

    const nextScore = Math.max(0, Math.min(100, Number(aiResult.engagementScore ?? 0)));
    const tipsPayload = Array.isArray(aiResult.tips) ? JSON.stringify(aiResult.tips) : null;

    await supabase
      .from('accounts')
      .update({
        engagement_score: nextScore,
        ai_engagement_tips: tipsPayload,
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    return {
      engagement_score: nextScore,
      tips: aiResult.tips || [],
    };
  } catch (error) {
    console.error('refreshAccountEngagementScore error:', error);
    return null;
  }
}

