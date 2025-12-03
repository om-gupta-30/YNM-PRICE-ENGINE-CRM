import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================
// AI Model Configuration - Google Gemini 2.5
// ============================================

/**
 * DEFAULT_MODEL: Primary model for coaching, admin insights, and complex analysis
 * Use for: /api/ai/coach, /api/ai/weekly-insights, admin performance scoring
 */
const DEFAULT_MODEL = 'models/gemini-2.5-pro';

/**
 * FAST_MODEL: Faster model for bulk inference and real-time scoring
 * Use for: Engagement scoring, activity-triggered AI, batch operations
 * Also used as fallback if DEFAULT_MODEL fails with "model not found"
 */
const FAST_MODEL = 'models/gemini-2.5-flash';

// Export model constants for use in other modules
export { DEFAULT_MODEL, FAST_MODEL };

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient() {
  if (!geminiClient) {
    // Support both GEMINI_API_KEY and GOOGLE_GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[AI] CRITICAL: Missing GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY environment variable');
      throw new Error('Missing GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY env for AI utilities');
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
    console.log('[AI] Gemini client initialized successfully');
  }
  return geminiClient;
}

/**
 * Run Gemini AI with system and user prompts, expecting JSON response
 * @deprecated Use runGemini instead (renamed for clarity)
 */
export async function runClaude<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  return runGemini<T>(systemPrompt, userPrompt);
}

/**
 * Attempt to parse JSON from raw text with multiple fallback strategies
 */
function parseJsonSafely<T>(text: string): T | null {
  // Strategy 1: Direct parse (cleanest case)
  try {
    return JSON.parse(text) as T;
  } catch {
    // Continue to fallback strategies
  }

  // Strategy 2: Extract from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T;
    } catch {
      // Continue
    }
  }

  // Strategy 3: Find JSON object pattern
  const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[0]) as T;
    } catch {
      // Continue
    }
  }

  // Strategy 4: Find JSON array pattern
  const jsonArrayMatch = text.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch) {
    try {
      return JSON.parse(jsonArrayMatch[0]) as T;
    } catch {
      // Continue
    }
  }

  return null;
}

/**
 * Check if error is a "model not found" error
 */
function isModelNotFoundError(error: any): boolean {
  const message = String(error?.message || error).toLowerCase();
  return (
    message.includes('model not found') ||
    message.includes('models/') ||
    message.includes('404') ||
    message.includes('not available') ||
    message.includes('does not exist')
  );
}

/**
 * Run Gemini AI with system and user prompts, expecting JSON response
 * 
 * Features:
 * - Uses DEFAULT_MODEL (gemini-2.5-pro) for primary inference
 * - Falls back to FAST_MODEL (gemini-2.5-flash) if model not found
 * - Robust JSON parsing with multiple fallback strategies
 * - Retry logic for transient failures
 * - Detailed logging for debugging
 */
export async function runGemini<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const client = getGeminiClient();
  const modelsToTry = [DEFAULT_MODEL, FAST_MODEL];
  let lastError: Error | null = null;

  for (const modelName of modelsToTry) {
    console.log(`[AI] Attempting inference with model: ${modelName}`);
    
    try {
      // Configure model with JSON response format
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });

      // Combine system prompt and user prompt with clear JSON instruction
      const fullPrompt = `${systemPrompt}

CRITICAL: You MUST respond with valid JSON only. No markdown, no code blocks, no explanations - just raw JSON.

${userPrompt}`;

      // Retry logic for transient failures (2 attempts per model)
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = await model.generateContent(fullPrompt);
          const response = result?.response;
          
          // Safely extract text from response
          if (!response) {
            throw new Error('Empty response from Gemini API');
          }
          
          const fullText = response.text()?.trim();
          
          if (!fullText) {
            throw new Error('Empty text content in Gemini response');
          }

          // Parse JSON with fallback strategies
          const parsed = parseJsonSafely<T>(fullText);
          if (parsed !== null) {
            console.log(`[AI] Successfully parsed response from ${modelName}`);
            return parsed;
          }

          throw new Error(`Response not valid JSON: ${fullText.substring(0, 200)}...`);
        } catch (innerError: any) {
          lastError = innerError;
          
          // If model not found, break inner retry loop to try next model
          if (isModelNotFoundError(innerError)) {
            console.warn(`[AI] Model ${modelName} not found/available, trying fallback...`);
            break;
          }
          
          console.error(`[AI] ${modelName} attempt ${attempt} failed:`, innerError.message);
          
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          }
        }
      }
    } catch (outerError: any) {
      lastError = outerError;
      console.error(`[AI] Failed with model ${modelName}:`, outerError.message);
      
      // If it's a model not found error, continue to try next model
      if (isModelNotFoundError(outerError)) {
        continue;
      }
    }
  }

  // All models failed
  console.error('[AI] FAILURE: All models exhausted. Last error:', lastError?.message);
  throw lastError || new Error('Gemini API failed after trying all available models');
}

/**
 * Run Gemini AI with FAST_MODEL for bulk/scoring operations
 * Optimized for speed over quality for high-volume inference
 */
export async function runGeminiFast<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const client = getGeminiClient();
  
  console.log(`[AI] Fast inference with model: ${FAST_MODEL}`);
  
  try {
    const model = client.getGenerativeModel({
      model: FAST_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.5, // Lower temperature for more consistent scoring
        maxOutputTokens: 1024, // Smaller output for faster response
      },
    });

    const fullPrompt = `${systemPrompt}

CRITICAL: Respond with valid JSON only. No markdown, no explanations.

${userPrompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = result?.response;
    
    if (!response) {
      throw new Error('Empty response from Gemini API');
    }
    
    const fullText = response.text()?.trim();
    
    if (!fullText) {
      throw new Error('Empty text content in Gemini response');
    }

    const parsed = parseJsonSafely<T>(fullText);
    if (parsed !== null) {
      console.log(`[AI] Fast inference successful`);
      return parsed;
    }

    throw new Error(`Response not valid JSON: ${fullText.substring(0, 200)}...`);
  } catch (error: any) {
    console.error('[AI] Fast inference failed:', error.message);
    throw error;
  }
}

// ============================================
// CRM DATA HELPERS - Reusable Supabase queries
// ============================================

import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export interface EmployeeMetrics {
  totalAccounts: number;
  totalSubAccounts: number;
  totalLeads: number;
  totalActivitiesLast7Days: number;
  totalActivitiesLast30Days: number;
  quotationsLast30Days: number;
  quotationValueLast30Days: number;
  averageEngagementScore: number;
  streak: number;
  activityBreakdown: Record<string, number>;
}

export interface SlippingAccount {
  id: number;
  name: string;
  type: 'account' | 'subaccount';
  engagementScore: number;
  assignedEmployee: string | null;
  daysSinceLastActivity: number | null;
}

export interface EmployeeRanking {
  rank: number;
  totalEmployees: number;
  activityCount: number;
  percentile: number;
}

/**
 * Get comprehensive metrics for an employee
 */
export async function getEmployeeMetrics(employee: string): Promise<EmployeeMetrics> {
  const supabase = createSupabaseServerClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, engagement_score')
    .eq('assigned_employee', employee)
    .eq('is_active', true);

  // Fetch sub-accounts
  const { data: subAccounts } = await supabase
    .from('sub_accounts')
    .select('id, engagement_score')
    .eq('assigned_employee', employee)
    .eq('is_active', true);

  // Fetch leads
  const { data: leads } = await supabase
    .from('leads')
    .select('id')
    .eq('assigned_employee', employee)
    .in('status', ['New', 'In Progress', 'Follow-up', 'Quotation Sent']);

  // Fetch activities last 7 days
  const { data: activities7 } = await supabase
    .from('activities')
    .select('activity_type')
    .eq('employee_id', employee)
    .gte('created_at', sevenDaysAgo);

  // Fetch activities last 30 days
  const { data: activities30 } = await supabase
    .from('activities')
    .select('activity_type')
    .eq('employee_id', employee)
    .gte('created_at', thirtyDaysAgo);

  // Fetch quotations
  const { data: quotations } = await supabase
    .from('quotations')
    .select('final_total_cost')
    .eq('created_by', employee)
    .gte('created_at', thirtyDaysAgo);

  // Fetch streak
  const { data: streakData } = await supabase
    .from('employee_streaks')
    .select('streak_count')
    .eq('employee', employee)
    .single();

  // Calculate activity breakdown
  const activityBreakdown: Record<string, number> = {};
  (activities7 || []).forEach(a => {
    activityBreakdown[a.activity_type] = (activityBreakdown[a.activity_type] || 0) + 1;
  });

  // Calculate average engagement
  const allScores = [
    ...(accounts || []).map(a => a.engagement_score || 0),
    ...(subAccounts || []).map(sa => sa.engagement_score || 0),
  ].filter(s => s > 0);
  const averageEngagementScore = allScores.length > 0 
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
    : 0;

  return {
    totalAccounts: accounts?.length || 0,
    totalSubAccounts: subAccounts?.length || 0,
    totalLeads: leads?.length || 0,
    totalActivitiesLast7Days: activities7?.length || 0,
    totalActivitiesLast30Days: activities30?.length || 0,
    quotationsLast30Days: quotations?.length || 0,
    quotationValueLast30Days: quotations?.reduce((sum, q) => sum + (q.final_total_cost || 0), 0) || 0,
    averageEngagementScore,
    streak: streakData?.streak_count || 0,
    activityBreakdown,
  };
}

/**
 * Get accounts/sub-accounts with slipping engagement (score < threshold)
 */
export async function getSlippingAccounts(employee?: string, threshold: number = 50): Promise<SlippingAccount[]> {
  const supabase = createSupabaseServerClient();
  const results: SlippingAccount[] = [];

  // Query accounts
  let accountsQuery = supabase
    .from('accounts')
    .select('id, account_name, engagement_score, assigned_employee, last_activity_at')
    .eq('is_active', true)
    .lt('engagement_score', threshold)
    .gt('engagement_score', 0)
    .order('engagement_score', { ascending: true })
    .limit(20);

  if (employee) {
    accountsQuery = accountsQuery.eq('assigned_employee', employee);
  }

  const { data: accounts } = await accountsQuery;

  for (const acc of accounts || []) {
    const daysSince = acc.last_activity_at 
      ? Math.floor((Date.now() - new Date(acc.last_activity_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    results.push({
      id: acc.id,
      name: acc.account_name,
      type: 'account',
      engagementScore: acc.engagement_score || 0,
      assignedEmployee: acc.assigned_employee,
      daysSinceLastActivity: daysSince,
    });
  }

  // Query sub-accounts
  let subAccountsQuery = supabase
    .from('sub_accounts')
    .select('id, sub_account_name, engagement_score, assigned_employee')
    .eq('is_active', true)
    .lt('engagement_score', threshold)
    .gt('engagement_score', 0)
    .order('engagement_score', { ascending: true })
    .limit(20);

  if (employee) {
    subAccountsQuery = subAccountsQuery.eq('assigned_employee', employee);
  }

  const { data: subAccounts } = await subAccountsQuery;

  for (const sa of subAccounts || []) {
    results.push({
      id: sa.id,
      name: sa.sub_account_name,
      type: 'subaccount',
      engagementScore: sa.engagement_score || 0,
      assignedEmployee: sa.assigned_employee,
      daysSinceLastActivity: null,
    });
  }

  // Sort by engagement score
  return results.sort((a, b) => a.engagementScore - b.engagementScore).slice(0, 15);
}

/**
 * Get employee ranking based on activity count
 */
export async function getEmployeeRanking(employee: string, days: number = 30): Promise<EmployeeRanking> {
  const supabase = createSupabaseServerClient();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get all activities in time range
  const { data: allActivities } = await supabase
    .from('activities')
    .select('employee_id')
    .gte('created_at', startDate);

  // Count per employee
  const counts: Record<string, number> = {};
  (allActivities || []).forEach(a => {
    if (a.employee_id) {
      counts[a.employee_id] = (counts[a.employee_id] || 0) + 1;
    }
  });

  // Sort by count descending
  const sorted = Object.entries(counts)
    .map(([emp, count]) => ({ emp, count }))
    .sort((a, b) => b.count - a.count);

  const rank = sorted.findIndex(e => e.emp === employee) + 1;
  const totalEmployees = sorted.length;
  const activityCount = counts[employee] || 0;
  const percentile = totalEmployees > 0 ? Math.round(((totalEmployees - rank + 1) / totalEmployees) * 100) : 0;

  return {
    rank: rank || totalEmployees + 1,
    totalEmployees,
    activityCount,
    percentile,
  };
}

/**
 * Get insights summary for admin view
 */
export async function getAdminInsightsSummary(): Promise<{
  totalAccounts: number;
  totalSubAccounts: number;
  totalLeads: number;
  lowEngagementCount: number;
  topPerformers: Array<{ employee: string; activities: number }>;
  slippingAccounts: SlippingAccount[];
}> {
  const supabase = createSupabaseServerClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Counts
  const { count: accountCount } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: subAccountCount } = await supabase
    .from('sub_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: leadCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .in('status', ['New', 'In Progress', 'Follow-up', 'Quotation Sent']);

  const { count: lowEngagement } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .lt('engagement_score', 40);

  // Top performers
  const { data: activities } = await supabase
    .from('activities')
    .select('employee_id')
    .gte('created_at', thirtyDaysAgo);

  const counts: Record<string, number> = {};
  (activities || []).forEach(a => {
    if (a.employee_id) {
      counts[a.employee_id] = (counts[a.employee_id] || 0) + 1;
    }
  });

  const topPerformers = Object.entries(counts)
    .map(([employee, activities]) => ({ employee, activities }))
    .sort((a, b) => b.activities - a.activities)
    .slice(0, 5);

  // Slipping accounts
  const slippingAccounts = await getSlippingAccounts(undefined, 50);

  return {
    totalAccounts: accountCount || 0,
    totalSubAccounts: subAccountCount || 0,
    totalLeads: leadCount || 0,
    lowEngagementCount: lowEngagement || 0,
    topPerformers,
    slippingAccounts: slippingAccounts.slice(0, 10),
  };
}

// ============================================
// V2 AI: Sub-account Engagement Scoring
// ============================================

export type SubaccountAIInsights = {
  score: number;     // 0–100
  tips: string[];    // improvement suggestions
  comment: string;   // short explanation
};

/**
 * Calculate AI-powered engagement insights for a sub-account
 * Uses FAST_MODEL (gemini-2.5-flash) for bulk inference operations
 */
export async function calculateSubaccountAIInsights(input: {
  subaccountName: string;
  accountName: string;
  assignedEmployee?: string | null;
  currentScore: number;
  activities: {
    activity_type: string;
    created_at: string;
    description?: string | null;
  }[];
}): Promise<SubaccountAIInsights> {
  // Default fallback values
  const defaultResult: SubaccountAIInsights = {
    score: Math.max(0, Math.min(100, input.currentScore)),
    tips: ['Increase followups', 'Schedule calls'],
    comment: 'Moderate engagement',
  };

  try {
    console.log(`[AI Scoring] Processing sub-account: ${input.subaccountName}`);

    // Build system prompt
    const systemPrompt = `You are a CRM engagement analyst. Given a sub-account name, parent account, existing score, and recent activities, output a JSON object with score (0-100), tips array (2-3 actionable suggestions), and comment (short explanation of the score).`;

    // Summarize activities with age
    const now = new Date();
    const activitySummary = input.activities.map(activity => {
      const activityDate = new Date(activity.created_at);
      const daysAgo = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        type: activity.activity_type,
        age: daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`,
        description: activity.description || null,
      };
    });

    // Build user prompt
    const userPrompt = `
Sub-account: ${input.subaccountName}
Parent Account: ${input.accountName}
Assigned Employee: ${input.assignedEmployee || 'Not assigned'}
Current Engagement Score: ${input.currentScore}

Recent Activities (${input.activities.length} total):
${JSON.stringify(activitySummary, null, 2)}

Analyze the engagement level and return JSON:
{
  "score": <number 0-100>,
  "tips": ["<actionable suggestion 1>", "<actionable suggestion 2>", "<optional suggestion 3>"],
  "comment": "<short explanation of why this score>"
}
  `.trim();

    // Use FAST_MODEL for bulk scoring operations
    const raw = await runGeminiFast<SubaccountAIInsights>(systemPrompt, userPrompt);

    // Validate and sanitize response with fallbacks
    const score = typeof raw?.score === 'number' 
      ? Math.max(0, Math.min(100, raw.score))
      : defaultResult.score;
    
    const tips = Array.isArray(raw?.tips) && raw.tips.length > 0
      ? raw.tips.filter((tip): tip is string => typeof tip === 'string' && tip.trim().length > 0).slice(0, 3)
      : defaultResult.tips;
    
    const comment = typeof raw?.comment === 'string' && raw.comment.trim()
      ? raw.comment.trim()
      : defaultResult.comment;

    console.log(`[AI Scoring] Completed for ${input.subaccountName}: score=${score}`);

    return { score, tips, comment };
  } catch (error: any) {
    // Fallback on any error - never crash the scoring pipeline
    console.error(`[AI Scoring] Error for ${input.subaccountName}:`, error?.message || error);
    console.warn(`[AI Scoring] Using fallback values for ${input.subaccountName}`);
    return defaultResult;
  }
}
