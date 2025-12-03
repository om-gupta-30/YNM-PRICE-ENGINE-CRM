import { NextRequest, NextResponse } from 'next/server';
import { 
  runGemini,
  runGeminiFast,
  getEmployeeMetrics, 
  getSlippingAccounts, 
  getEmployeeRanking,
  getAdminInsightsSummary,
  type EmployeeMetrics,
  type SlippingAccount,
  type EmployeeRanking
} from '@/utils/ai';
import { routeAIRequest, type AIMode, getModeDescription } from '@/lib/ai/router';
import { executeCRMQuery, type CRMQueryResult } from '@/lib/ai/queryEngine';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

interface CoachRequest {
  user: string;
  role: 'employee' | 'admin';
  question: string;
  mode?: 'coach' | 'assistant'; // User-selected mode override
  context?: {
    subAccountId?: number;
    accountId?: number;
  };
}

interface CoachResponse {
  reply: string;
  suggestedActions?: string[];
  tone: 'encouraging' | 'strategic' | 'warning' | 'informational';
  mode?: AIMode;
  queryResult?: CRMQueryResult;
}

// Domain restriction keywords - questions must relate to CRM/sales
const CRM_KEYWORDS = [
  'account', 'lead', 'sale', 'customer', 'client', 'engagement', 'score', 'performance',
  'activity', 'call', 'follow', 'quotation', 'quote', 'target', 'goal', 'improve',
  'better', 'help', 'tip', 'advice', 'strategy', 'increase', 'boost', 'team',
  'employee', 'rank', 'leaderboard', 'streak', 'metric', 'insight', 'summary',
  'week', 'day', 'month', 'progress', 'pipeline', 'deal', 'close', 'win', 'convert',
  'sub-account', 'subaccount', 'contact', 'task', 'note', 'action', 'priority',
  'hi', 'hello', 'hey', 'what', 'how', 'why', 'when', 'who', 'can', 'should', 'tell',
  'show', 'give', 'explain', 'company', 'business', 'work', 'today', 'status',
  'list', 'count', 'many', 'total', 'number', 'due', 'pending', 'overdue'
];

const BLOCKED_TOPICS = [
  'weather', 'movie', 'music', 'game', 'sports', 'politics', 'religion',
  'recipe', 'cook', 'travel', 'vacation', 'joke', 'story', 'poem', 'song',
  'code', 'program', 'javascript', 'python', 'react', 'database', 'api',
  'write me', 'generate code', 'create app', 'build website'
];

function isQuestionInDomain(question: string): boolean {
  const lowerQ = question.toLowerCase();
  
  // Check for blocked topics first
  for (const blocked of BLOCKED_TOPICS) {
    if (lowerQ.includes(blocked)) {
      return false;
    }
  }
  
  // Allow short greetings
  if (lowerQ.length < 20) {
    return true;
  }
  
  // Check if any CRM keyword is present
  for (const keyword of CRM_KEYWORDS) {
    if (lowerQ.includes(keyword)) {
      return true;
    }
  }
  
  // Default: allow ambiguous questions (let AI handle context)
  return true;
}

const DOMAIN_FALLBACK_RESPONSE: CoachResponse = {
  reply: "My guidance is limited to CRM performance, accounts, engagement and sales strategy. Please ask me about your accounts, leads, performance metrics, or how to improve your sales results.",
  suggestedActions: [
    "Ask about your slipping accounts",
    "Ask how to improve your engagement scores",
    "Ask about your team's performance"
  ],
  tone: 'strategic'
};

// ============================================
// Logging Function
// ============================================

async function logAIQuery(
  userId: string,
  mode: string,
  question: string,
  result: any
): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    
    await supabase
      .from('ai_queries')
      .insert({
        user_id: userId,
        mode: mode.toLowerCase(),
        question: question,
        result: result,
        created_at: new Date().toISOString(),
      });
    
    console.log(`[AI Coach] Logged query for user ${userId} (mode: ${mode})`);
  } catch (error: any) {
    // Don't fail the request if logging fails
    console.error('[AI Coach] Failed to log query:', error.message);
  }
}

// ============================================
// QUERY Mode Handler
// ============================================

async function handleQueryMode(
  question: string,
  user: string,
  role: 'employee' | 'admin'
): Promise<CoachResponse> {
  console.log(`[AI Coach] Processing QUERY mode for: "${question.substring(0, 50)}..."`);
  
  // Execute CRM query
  const queryResult = await executeCRMQuery(question, role, user);
  
  if (!queryResult.success) {
    return {
      reply: queryResult.formatted || 'No matching records found in CRM.',
      tone: 'informational',
      mode: 'QUERY',
      queryResult,
    };
  }
  
  // If we have results, optionally beautify with Gemini
  let beautifiedReply = queryResult.formatted;
  
  try {
    // Use Gemini to format the response nicely (but NEVER fabricate facts)
    const systemPrompt = `You are a CRM assistant that formats database query results into readable text.

CRITICAL RULES:
1. ONLY use the data provided - DO NOT invent or fabricate any information
2. If data is empty, say "No matching records found in CRM"
3. Format numbers and lists clearly
4. Keep the response concise and professional
5. Do NOT add information that isn't in the data
6. Do NOT speculate or make assumptions about missing data`;

    const userPrompt = `Format this CRM query result into a readable response.

User Question: ${question}

Database Result:
${JSON.stringify(queryResult.raw, null, 2)}

Result Summary: ${queryResult.formatted}

Provide a clear, readable response that summarizes the data. Do NOT invent any facts not in the data.`;

    const formatted = await runGeminiFast<{ response: string }>(`${systemPrompt}

Return JSON: { "response": "<your formatted response>" }`, userPrompt);

    if (formatted?.response) {
      beautifiedReply = formatted.response;
    }
  } catch (error: any) {
    console.error('[AI Coach] Gemini beautification failed:', error.message);
    // Use the raw formatted result
  }
  
  // Generate suggested actions based on query result
  const suggestedActions = generateQuerySuggestedActions(queryResult);
  
  return {
    reply: beautifiedReply,
    suggestedActions,
    tone: 'informational',
    mode: 'QUERY',
    queryResult,
  };
}

function generateQuerySuggestedActions(result: CRMQueryResult): string[] {
  const actions: string[] = [];
  
  switch (result.entity) {
    case 'contacts':
      if (result.count === 0) {
        actions.push('Add new contacts to your sub-accounts');
      } else {
        actions.push('Set follow-up dates for contacts');
        actions.push('Update contact call status');
      }
      break;
    case 'followups':
      if (result.raw?.overdue?.length > 0) {
        actions.push('Call overdue contacts immediately');
      }
      if (result.raw?.dueToday?.length > 0) {
        actions.push(`Complete ${result.raw.dueToday.length} follow-ups due today`);
      }
      actions.push('Schedule new follow-ups');
      break;
    case 'quotations':
      actions.push('Follow up on pending quotations');
      actions.push('Create new quotations');
      break;
    case 'leads':
      actions.push('Follow up on active leads');
      actions.push('Convert qualified leads');
      break;
    case 'activities':
      actions.push('Log new activities');
      actions.push('Review activity patterns');
      break;
    default:
      actions.push('Ask me about your accounts');
      actions.push('Check your follow-ups');
  }
  
  return actions.slice(0, 3);
}

// ============================================
// COACH Mode Handler (Existing Logic)
// ============================================

async function handleCoachMode(
  question: string,
  user: string,
  role: 'employee' | 'admin',
  context?: CoachRequest['context']
): Promise<CoachResponse> {
  console.log(`[AI Coach] Processing COACH mode for: "${question.substring(0, 50)}..."`);
  
  // Fetch CRM data using helper services
  let metrics: EmployeeMetrics | null = null;
  let slippingAccounts: SlippingAccount[] = [];
  let ranking: EmployeeRanking | null = null;
  let adminSummary: Awaited<ReturnType<typeof getAdminInsightsSummary>> | null = null;

  try {
    if (role === 'admin') {
      // Admin gets company-wide insights
      adminSummary = await getAdminInsightsSummary();
      slippingAccounts = adminSummary.slippingAccounts;
    } else {
      // Employee gets personal metrics
      metrics = await getEmployeeMetrics(user);
      slippingAccounts = await getSlippingAccounts(user, 50);
      ranking = await getEmployeeRanking(user, 30);
    }
  } catch (dbError: any) {
    console.error('Error fetching CRM context:', dbError);
    // Continue with empty data rather than failing
  }

  // Build context string
  let contextDetails = '';

  if (role === 'admin' && adminSummary) {
    contextDetails = `
COMPANY OVERVIEW (Admin View):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ACCOUNTS: ${adminSummary.totalAccounts} total, ${adminSummary.lowEngagementCount} low engagement
📋 SUB-ACCOUNTS: ${adminSummary.totalSubAccounts} total
🎯 LEADS: ${adminSummary.totalLeads} active

🏆 TOP PERFORMERS (Last 30 Days):
${adminSummary.topPerformers.map((p, i) => `${i + 1}. ${p.employee}: ${p.activities} activities`).join('\n') || '- No data'}

⚠️ SLIPPING ACCOUNTS (Need Attention):
${slippingAccounts.slice(0, 5).map(a => `- ${a.name} (${a.engagementScore}% engagement)`).join('\n') || '- None'}
`;
  } else if (metrics && ranking) {
    contextDetails = `
YOUR PERFORMANCE (${user}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 RANKING: #${ranking.rank} of ${ranking.totalEmployees} (Top ${ranking.percentile}%)
🔥 STREAK: ${metrics.streak} days

📊 YOUR PORTFOLIO:
- Accounts: ${metrics.totalAccounts}
- Sub-Accounts: ${metrics.totalSubAccounts}
- Active Leads: ${metrics.totalLeads}
- Avg Engagement: ${metrics.averageEngagementScore.toFixed(1)}%

📈 ACTIVITY (Last 7 Days): ${metrics.totalActivitiesLast7Days} activities
${Object.entries(metrics.activityBreakdown).map(([type, count]) => `- ${type}: ${count}`).join('\n') || '- No activities'}

💰 QUOTATIONS (Last 30 Days): ${metrics.quotationsLast30Days} worth ₹${metrics.quotationValueLast30Days.toLocaleString('en-IN')}

⚠️ SLIPPING ACCOUNTS:
${slippingAccounts.slice(0, 5).map(a => `- ${a.name} (${a.engagementScore}%)`).join('\n') || '- None'}
`;
  }

  // Build AI prompt with domain rules
  const systemPrompt = `You are an AI Sales Coach for YSM Safety CRM (road safety equipment company).

STRICT RULES:
1. ONLY answer questions about CRM, sales, accounts, leads, engagement, and performance
2. If asked about anything outside CRM/business domain, respond: "My guidance is limited to CRM performance, accounts, engagement and sales strategy."
3. ALWAYS reference specific data from the context (account names, numbers, rankings)
4. Give ACTIONABLE advice with specific next steps
5. NO generic filler text - be specific to their data
6. Keep replies concise (2-4 sentences)
7. ALWAYS include 2-3 specific suggested actions

TONE SELECTION:
- "encouraging": Use for achievements, good metrics, motivation
- "strategic": Use for planning, optimization, general advice  
- "warning": Use for low engagement, urgent issues, declining metrics`;

  const userPrompt = `
CRM DATA:
${contextDetails || 'No data available - provide general CRM coaching advice.'}

USER QUESTION: ${question}

Based on the CRM data above, provide personalized, actionable coaching.
Reference specific numbers and account names from the data.

Respond in this exact JSON format:
{
  "reply": "Your personalized answer (2-4 sentences, reference specific data)",
  "suggestedActions": ["Specific action 1", "Specific action 2", "Specific action 3"],
  "tone": "encouraging" | "strategic" | "warning"
}
`.trim();

  // Call Gemini AI
  let coachResponse: CoachResponse;
  try {
    console.log(`[AI Coach] Calling Gemini for coaching response`);
    const rawResponse = await runGemini<{
      reply: string;
      suggestedActions: string[];
      tone: 'encouraging' | 'strategic' | 'warning';
    }>(systemPrompt, userPrompt);
    
    coachResponse = {
      ...rawResponse,
      mode: 'COACH',
    };
    console.log(`[AI Coach] Response received: ${coachResponse.reply.substring(0, 80)}...`);
  } catch (aiError: any) {
    console.error('[AI Coach] Gemini error:', aiError.message);
    
    // Generate contextual fallback
    if (role === 'admin' && adminSummary) {
      coachResponse = {
        reply: `Your company has ${adminSummary.totalAccounts} accounts with ${adminSummary.lowEngagementCount} needing attention. Focus on re-engaging low-score accounts and monitoring team activity.`,
        suggestedActions: [
          slippingAccounts[0] ? `Review ${slippingAccounts[0].name} (${slippingAccounts[0].engagementScore}%)` : 'Check low-engagement accounts',
          'Monitor team activity levels',
          'Schedule team check-ins',
        ],
        tone: 'strategic',
        mode: 'COACH',
      };
    } else if (metrics) {
      coachResponse = {
        reply: `You're ranked #${ranking?.rank || 'N/A'} with ${metrics.totalActivitiesLast7Days} activities this week. ${slippingAccounts.length > 0 ? `Focus on ${slippingAccounts[0]?.name} which needs attention.` : 'Keep up the momentum!'}`,
        suggestedActions: [
          slippingAccounts[0] ? `Re-engage ${slippingAccounts[0].name}` : 'Log your daily activities',
          `Follow up on ${metrics.totalLeads} active leads`,
          'Maintain your activity streak',
        ],
        tone: 'strategic',
        mode: 'COACH',
      };
    } else {
      coachResponse = {
        reply: 'Focus on logging your daily activities and following up with your accounts. Consistent engagement is key to success!',
        suggestedActions: ['Log a new activity', 'Review your accounts', 'Check your leads pipeline'],
        tone: 'encouraging',
        mode: 'COACH',
      };
    }
  }

  return coachResponse;
}

// ============================================
// Main API Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: CoachRequest = await request.json();
    const { user, role, question, mode: userSelectedMode, context } = body;

    if (!user || !role || !question) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: user, role, question' },
        { status: 400 }
      );
    }

    // Domain restriction check
    if (!isQuestionInDomain(question)) {
      console.log(`[AI Coach] Blocked off-topic question from ${user}: ${question.substring(0, 50)}...`);
      return NextResponse.json({
        success: true,
        ...DOMAIN_FALLBACK_RESPONSE,
      });
    }

    // ============================================
    // DETERMINE MODE (Router or User Override)
    // ============================================
    
    let mode: AIMode;
    
    if (userSelectedMode === 'assistant') {
      // User explicitly selected assistant/query mode
      mode = 'QUERY';
      console.log(`[AI Coach] User-selected mode: QUERY (assistant)`);
    } else if (userSelectedMode === 'coach') {
      // User explicitly selected coach mode
      mode = 'COACH';
      console.log(`[AI Coach] User-selected mode: COACH`);
    } else {
      // Auto-detect mode based on question
      mode = routeAIRequest(question);
      console.log(`[AI Coach] Auto-detected mode: ${mode}`);
    }

    console.log(`[AI Coach] ${getModeDescription(mode, question)}`);

    // ============================================
    // PROCESS REQUEST BASED ON MODE
    // ============================================

    let response: CoachResponse;

    if (mode === 'QUERY') {
      response = await handleQueryMode(question, user, role);
    } else {
      response = await handleCoachMode(question, user, role, context);
    }

    // ============================================
    // VALIDATE AND RETURN RESPONSE
    // ============================================

    const validatedResponse: CoachResponse = {
      reply: typeof response.reply === 'string' && response.reply.trim()
        ? response.reply.trim()
        : 'Focus on your highest-priority accounts and maintain consistent engagement.',
      suggestedActions: Array.isArray(response.suggestedActions)
        ? response.suggestedActions
            .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
            .slice(0, 5)
        : ['Review slipping accounts', 'Follow up on leads', 'Log daily activities'],
      tone: ['encouraging', 'strategic', 'warning', 'informational'].includes(response.tone)
        ? response.tone
        : 'strategic',
      mode: response.mode || mode,
      queryResult: response.queryResult,
    };

    // ============================================
    // LOG QUERY (async, don't wait)
    // ============================================
    
    logAIQuery(user, mode, question, {
      reply: validatedResponse.reply,
      queryResult: validatedResponse.queryResult?.raw || null,
    }).catch(err => console.error('[AI Coach] Logging error:', err));

    return NextResponse.json({
      success: true,
      ...validatedResponse,
    });
  } catch (error: any) {
    console.error('[AI Coach] API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
