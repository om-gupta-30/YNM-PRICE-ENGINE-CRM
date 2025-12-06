/**
 * Query Suggestions Engine
 * 
 * Generates personalized query suggestions based on:
 * - User's current data and context
 * - User's role and permissions
 * - Recent query patterns
 * - Unanswered insights (low engagement, pending tasks, etc.)
 */

import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { UserContext } from './dynamicQueryBuilder';

/**
 * Suggestion category for grouping
 */
export type SuggestionCategory = 
  | 'personal_insights'
  | 'common_queries'
  | 'trending'
  | 'action_items'
  | 'analytics';

/**
 * Query suggestion with metadata
 */
export interface QuerySuggestion {
  question: string;
  category: SuggestionCategory;
  priority: number; // 1-10, higher = more relevant
  reason?: string; // Why this suggestion is relevant
}

/**
 * Get personalized query suggestions for a user
 * 
 * @param userContext - User context with role, stats, etc.
 * @param recentQueries - Array of recent queries from the user
 * @returns Array of suggested questions (5-10 suggestions)
 */
export async function getSuggestions(
  userContext: any,
  recentQueries: string[] = []
): Promise<string[]> {
  try {
    const suggestions: QuerySuggestion[] = [];

    // 1. Personal insights based on user's data
    const personalInsights = await getPersonalInsights(userContext);
    suggestions.push(...personalInsights);

    // 2. Common queries for user's role
    const roleBasedQueries = getRoleBasedQueries(userContext?.role || 'employee');
    suggestions.push(...roleBasedQueries);

    // 3. Trending queries (anonymized from other users)
    const trendingQueries = await getTrendingQueries(userContext?.role);
    suggestions.push(...trendingQueries);

    // 4. Action items and unanswered insights
    const actionItems = await getActionItems(userContext);
    suggestions.push(...actionItems);

    // 5. Analytics suggestions
    const analyticsQueries = getAnalyticsQueries(userContext?.role);
    suggestions.push(...analyticsQueries);

    // Filter out duplicates and recent queries
    const uniqueSuggestions = filterDuplicates(suggestions, recentQueries);

    // Sort by priority and return top 5-10
    const sorted = uniqueSuggestions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);

    return sorted.map(s => s.question);
  } catch (error: any) {
    console.error('[Query Suggestions] Error generating suggestions:', error.message);
    // Return fallback suggestions
    return getFallbackSuggestions(userContext?.role || 'employee');
  }
}

/**
 * Get personal insights based on user's current data
 */
async function getPersonalInsights(userContext: any): Promise<QuerySuggestion[]> {
  const suggestions: QuerySuggestion[] = [];

  try {
    const supabase = createSupabaseServerClient();
    const userId = userContext?.userId || userContext?.employeeId;

    if (!userId) {
      return suggestions;
    }

    // Check for follow-ups due today (using activities table)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Try to find activities that need follow-up
    const { count: followUpsDue } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId)
      .in('activity_type', ['Follow-up', 'Call', 'Meeting'])
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    if (followUpsDue && followUpsDue > 0) {
      suggestions.push({
        question: `I have ${followUpsDue} follow-up${followUpsDue > 1 ? 's' : ''} due today. What should I prioritize?`,
        category: 'action_items',
        priority: 9,
        reason: `${followUpsDue} tasks due today`,
      });
    }

    // Check for low engagement accounts
    const { count: lowEngagement } = await supabase
      .from('sub_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_employee_id', userId)
      .eq('is_active', true)
      .lt('engagement_score', 50)
      .gt('engagement_score', 0);

    if (lowEngagement && lowEngagement > 0) {
      suggestions.push({
        question: `I have ${lowEngagement} account${lowEngagement > 1 ? 's' : ''} with low engagement. How can I improve them?`,
        category: 'action_items',
        priority: 8,
        reason: `${lowEngagement} accounts need attention`,
      });
    }

    // Check recent activities
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: recentActivities } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (recentActivities && recentActivities > 0) {
      suggestions.push({
        question: `I've had ${recentActivities} activit${recentActivities > 1 ? 'ies' : 'y'} in the last week. What's my performance?`,
        category: 'personal_insights',
        priority: 7,
        reason: 'Recent activity summary',
      });
    }

    // Check for new leads
    const { count: newLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_employee', userId)
      .eq('status', 'New');

    if (newLeads && newLeads > 0) {
      suggestions.push({
        question: `I have ${newLeads} new lead${newLeads > 1 ? 's' : ''}. What should I do next?`,
        category: 'action_items',
        priority: 8,
        reason: `${newLeads} new leads to follow up`,
      });
    }

    // Check quotations pending (try multiple quote tables)
    let pendingQuotes = 0;
    const quoteTables = ['quotes_mbcb', 'quotes_signages', 'quotes_paint'];
    
    for (const table of quoteTables) {
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('created_by', userId);
        pendingQuotes += count || 0;
      } catch {
        // Table might not exist, continue
      }
    }

    if (pendingQuotes > 0) {
      suggestions.push({
        question: `I have ${pendingQuotes} pending quotation${pendingQuotes > 1 ? 's' : ''}. What's their status?`,
        category: 'personal_insights',
        priority: 7,
        reason: `${pendingQuotes} quotations to track`,
      });
    }

  } catch (error: any) {
    console.error('[Query Suggestions] Error getting personal insights:', error.message);
  }

  return suggestions;
}

/**
 * Get role-based common queries
 */
function getRoleBasedQueries(role: string): QuerySuggestion[] {
  const roleLower = role.toLowerCase();
  const suggestions: QuerySuggestion[] = [];

  if (roleLower === 'admin') {
    suggestions.push(
      {
        question: 'What are the top performing employees this month?',
        category: 'analytics',
        priority: 7,
      },
      {
        question: 'Show me accounts with declining engagement',
        category: 'analytics',
        priority: 7,
      },
      {
        question: 'What is the overall conversion rate?',
        category: 'analytics',
        priority: 6,
      },
      {
        question: 'Which products have the highest win rate?',
        category: 'analytics',
        priority: 6,
      }
    );
  } else if (roleLower === 'employee') {
    suggestions.push(
      {
        question: 'What are my top accounts by value?',
        category: 'common_queries',
        priority: 7,
      },
      {
        question: 'Show me my activities for this week',
        category: 'common_queries',
        priority: 7,
      },
      {
        question: 'What leads need follow-up?',
        category: 'action_items',
        priority: 8,
      },
      {
        question: 'How can I improve my performance?',
        category: 'personal_insights',
        priority: 7,
      },
      {
        question: 'What are my pending quotations?',
        category: 'common_queries',
        priority: 6,
      }
    );
  } else {
    // Default queries for any role
    suggestions.push(
      {
        question: 'How many contacts do I have?',
        category: 'common_queries',
        priority: 6,
      },
      {
        question: 'Show me my recent activities',
        category: 'common_queries',
        priority: 6,
      },
      {
        question: 'What accounts are assigned to me?',
        category: 'common_queries',
        priority: 6,
      }
    );
  }

  return suggestions;
}

/**
 * Get trending queries from other users (anonymized)
 */
async function getTrendingQueries(userRole?: string): Promise<QuerySuggestion[]> {
  const suggestions: QuerySuggestion[] = [];

  try {
    const supabase = createSupabaseServerClient();
    
    // Get recent queries from ai_operation_logs (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentQueries } = await supabase
      .from('ai_operation_logs')
      .select('question, operation_type')
      .not('question', 'is', null)
      .gte('created_at', sevenDaysAgo.toISOString())
      .eq('operation_type', 'AI_RESPONSE')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!recentQueries || recentQueries.length === 0) {
      return suggestions;
    }

    // Count question frequency
    const questionCounts = new Map<string, number>();
    recentQueries.forEach((entry: any) => {
      if (entry.question) {
        const question = entry.question.trim();
        if (question.length > 10 && question.length < 200) {
          questionCounts.set(question, (questionCounts.get(question) || 0) + 1);
        }
      }
    });

    // Get top 3 trending questions
    const trending = Array.from(questionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([question]) => ({
        question,
        category: 'trending' as SuggestionCategory,
        priority: 5,
        reason: 'Popular among users',
      }));

    suggestions.push(...trending);
  } catch (error: any) {
    console.error('[Query Suggestions] Error getting trending queries:', error.message);
  }

  return suggestions;
}

/**
 * Get action items and unanswered insights
 */
async function getActionItems(userContext: any): Promise<QuerySuggestion[]> {
  const suggestions: QuerySuggestion[] = [];
  const userId = userContext?.userId || userContext?.employeeId;

  if (!userId) {
    return suggestions;
  }

  try {
    const supabase = createSupabaseServerClient();

    // Check for overdue activities (using activities table as proxy)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find accounts with no recent activity (potential overdue follow-ups)
    const { count: overdueTasks } = await supabase
      .from('sub_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_employee_id', userId)
      .eq('is_active', true)
      .or(`last_activity_at.is.null,last_activity_at.lt.${sevenDaysAgo.toISOString()}`);

    if (overdueTasks && overdueTasks > 0) {
      suggestions.push({
        question: `I have ${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}. What should I do?`,
        category: 'action_items',
        priority: 10,
        reason: 'Urgent: overdue tasks',
      });
    }

    // Check for accounts without recent activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: inactiveAccounts } = await supabase
      .from('sub_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_employee_id', userId)
      .eq('is_active', true)
      .or(`last_activity_at.is.null,last_activity_at.lt.${thirtyDaysAgo.toISOString()}`);

    if (inactiveAccounts && inactiveAccounts > 0) {
      suggestions.push({
        question: `I have ${inactiveAccounts} account${inactiveAccounts > 1 ? 's' : ''} with no recent activity. Should I reach out?`,
        category: 'action_items',
        priority: 7,
        reason: 'Accounts need re-engagement',
      });
    }

    // Check for high-value opportunities (using engagement score as proxy)
    const { count: highValueAccounts } = await supabase
      .from('sub_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_employee_id', userId)
      .eq('is_active', true)
      .gt('engagement_score', 70);

    if (highValueAccounts && highValueAccounts > 0) {
      suggestions.push({
        question: `I have ${highValueAccounts} high-value account${highValueAccounts > 1 ? 's' : ''}. What's their status?`,
        category: 'personal_insights',
        priority: 8,
        reason: 'High-value opportunities',
      });
    }

  } catch (error: any) {
    console.error('[Query Suggestions] Error getting action items:', error.message);
  }

  return suggestions;
}

/**
 * Get analytics queries based on role
 */
function getAnalyticsQueries(role?: string): QuerySuggestion[] {
  const suggestions: QuerySuggestion[] = [];
  const roleLower = role?.toLowerCase() || 'employee';

  if (roleLower === 'admin' || roleLower === 'manager') {
    suggestions.push(
      {
        question: 'What is the team\'s win rate this month?',
        category: 'analytics',
        priority: 6,
      },
      {
        question: 'Show me the sales pipeline value',
        category: 'analytics',
        priority: 6,
      },
      {
        question: 'Which employees have the most activities?',
        category: 'analytics',
        priority: 5,
      }
    );
  } else {
    suggestions.push(
      {
        question: 'What is my win rate?',
        category: 'analytics',
        priority: 6,
      },
      {
        question: 'Show me my sales pipeline',
        category: 'analytics',
        priority: 6,
      },
      {
        question: 'How am I performing compared to last month?',
        category: 'analytics',
        priority: 5,
      }
    );
  }

  return suggestions;
}

/**
 * Filter out duplicates and recent queries
 */
function filterDuplicates(
  suggestions: QuerySuggestion[],
  recentQueries: string[]
): QuerySuggestion[] {
  const seen = new Set<string>();
  const recentSet = new Set(recentQueries.map(q => q.toLowerCase().trim()));

  return suggestions.filter(suggestion => {
    const normalized = suggestion.question.toLowerCase().trim();
    
    // Skip if already seen
    if (seen.has(normalized)) {
      return false;
    }
    
    // Skip if in recent queries
    if (recentSet.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

/**
 * Fallback suggestions if all else fails
 */
function getFallbackSuggestions(role: string): string[] {
  const roleLower = role.toLowerCase();

  if (roleLower === 'admin') {
    return [
      'What are the top performing employees?',
      'Show me accounts with low engagement',
      'What is the overall conversion rate?',
      'Which products have the highest win rate?',
      'Show me recent activities across the team',
    ];
  } else {
    return [
      'How many contacts do I have?',
      'Show me my activities for this week',
      'What leads need follow-up?',
      'How can I improve my performance?',
      'What are my pending quotations?',
    ];
  }
}

