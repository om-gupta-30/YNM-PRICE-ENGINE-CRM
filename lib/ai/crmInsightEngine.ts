/**
 * CRM Insight Engine
 * 
 * Detects intelligent insights about CRM entities:
 * - Silent accounts (no recent activity)
 * - Slipping engagement (low engagement scores)
 * - Other business intelligence patterns
 */

import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export interface SilentAccount {
  id: number;
  name?: string;
  engagement_score?: number;
  account_id?: number;
  last_activity_at?: string | null;
}

export interface SlippingAccount {
  id: number;
  name?: string;
  engagement_score?: number;
}

/**
 * Detect silent accounts (no recent activity)
 * 
 * First tries to use RPC function if available, otherwise falls back to direct query.
 * 
 * @param days - Number of days to look back (default: 30)
 * @returns Array of silent accounts
 */
export async function detectSilentAccounts(days = 30): Promise<SilentAccount[]> {
  console.log('[CRM AI] Detecting silent accounts (last', days, 'days)');

  try {
    const supabase = createSupabaseServerClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Try RPC function first (if available)
    const { data, error } = await supabase.rpc('find_silent_accounts', {
      since: cutoff.toISOString(),
    });

    if (!error && data) {
      console.log('[CRM AI] Found', data.length, 'silent accounts via RPC');
      return data;
    }

    // Fallback to direct query if RPC not available
    console.log('[CRM AI] RPC not available, using fallback query');
    return await detectSilentAccountsFallback(days);
  } catch (error: any) {
    console.warn('[CRM AI] Error in detectSilentAccounts, using fallback:', error.message);
    return await detectSilentAccountsFallback(days);
  }
}

/**
 * Fallback method to detect silent accounts based on activities
 * 
 * Finds sub-accounts with no recent activity or null last_activity_at
 * 
 * @param days - Number of days to look back (default: 30)
 * @returns Array of silent accounts
 */
export async function detectSilentAccountsFallback(days = 30): Promise<SilentAccount[]> {
  console.log('[CRM AI] Using fallback method to detect silent accounts');

  try {
    const supabase = createSupabaseServerClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Query sub-accounts with no recent activity
    // Check for null last_activity_at or last_activity_at older than cutoff
    const { data, error } = await supabase
      .from('sub_accounts')
      .select(`
        id,
        sub_account_name,
        engagement_score,
        account_id,
        last_activity_at,
        accounts!inner(
          id,
          account_name
        )
      `)
      .or(`last_activity_at.is.null,last_activity_at.lt.${cutoff.toISOString()}`)
      .eq('is_active', true)
      .order('last_activity_at', { ascending: true, nullsFirst: true })
      .limit(50);

    if (error) {
      console.error('[CRM AI] Error fetching silent accounts:', error.message);
      return [];
    }

    // Format results
    const silentAccounts: SilentAccount[] = (data || []).map((sa: any) => ({
      id: sa.id,
      name: sa.sub_account_name || sa.accounts?.account_name,
      engagement_score: sa.engagement_score,
      account_id: sa.account_id,
      last_activity_at: sa.last_activity_at,
    }));

    console.log('[CRM AI] Found', silentAccounts.length, 'silent accounts via fallback');
    return silentAccounts;
  } catch (error: any) {
    console.error('[CRM AI] Error in detectSilentAccountsFallback:', error.message);
    return [];
  }
}

/**
 * Detect accounts with slipping engagement (low engagement scores)
 * 
 * @param threshold - Engagement score threshold (default: 40)
 * @returns Array of accounts with engagement below threshold
 */
export async function detectSlippingEngagement(threshold = 40): Promise<SlippingAccount[]> {
  console.log('[CRM AI] Detecting slipping engagement (threshold:', threshold, ')');

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('sub_accounts')
      .select(`
        id,
        sub_account_name,
        engagement_score,
        account_id,
        accounts!inner(
          id,
          account_name
        )
      `)
      .lt('engagement_score', threshold)
      .eq('is_active', true)
      .order('engagement_score', { ascending: true })
      .limit(50);

    if (error) {
      console.error('[CRM AI] Error fetching slipping accounts:', error.message);
      return [];
    }

    // Format results
    const slippingAccounts: SlippingAccount[] = (data || []).map((sa: any) => ({
      id: sa.id,
      name: sa.sub_account_name || sa.accounts?.account_name,
      engagement_score: sa.engagement_score,
    }));

    console.log('[CRM AI] Found', slippingAccounts.length, 'accounts with slipping engagement');
    return slippingAccounts;
  } catch (error: any) {
    console.error('[CRM AI] Error in detectSlippingEngagement:', error.message);
    return [];
  }
}

