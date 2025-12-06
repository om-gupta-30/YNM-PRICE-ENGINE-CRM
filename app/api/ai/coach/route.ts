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
import { loadBusinessKnowledge } from '@/lib/ai/knowledgeLoader';
import { 
  addToConversationMemory, 
  formatMemoryContext,
  saveConversationTurn,
  loadConversationHistory
} from '@/lib/ai/conversationMemory';
import { getUserProfile, getProfileContext } from '@/lib/ai/userProfileEngine';
import { routeConversation } from '@/lib/ai/conversationRouterV2';
import { executeRAGQuery } from '@/lib/ai/ragEngine';
import { getOrCreateSession } from '@/lib/ai/sessionManager';

interface CoachRequest {
  user: string;
  role: 'employee' | 'admin';
  question: string;
  mode?: 'coach' | 'assistant'; // User-selected mode override
  sessionId?: string; // Optional session ID for conversation continuity
  stream?: boolean; // Optional streaming support
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
  structured?: CRMQueryResult; // Alias for queryResult in QUERY mode
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

/**
 * Check if message requests mode switch
 */
function detectModeSwitch(question: string): { switchMode?: 'COACH' | 'QUERY'; remainingQuestion?: string } {
  const lowerQ = question.toLowerCase().trim();
  
  // Check for mode switch requests
  if (lowerQ.includes('switch to coach') || lowerQ.includes('coach mode') || 
      lowerQ.includes('answer as coach') || lowerQ.includes('give me advice')) {
    return { switchMode: 'COACH' };
  }
  
  if (lowerQ.includes('switch to query') || lowerQ.includes('query mode') || 
      lowerQ.includes('answer as data') || lowerQ.includes('show me data') ||
      lowerQ.includes('look up') || lowerQ.includes('find data')) {
    return { switchMode: 'QUERY' };
  }
  
  // Extract remaining question if mode switch detected
  const switchPatterns = [
    /(?:switch to (?:coach|query) mode|answer as (?:coach|data)|give me (?:advice|data))[:\s]*(.+)/i,
    /(.+?)(?:switch to (?:coach|query) mode|answer as (?:coach|data))/i,
  ];
  
  for (const pattern of switchPatterns) {
    const match = question.match(pattern);
    if (match && match[1]) {
      const remaining = match[1].trim();
      if (remaining.length > 5) {
        return { remainingQuestion: remaining };
      }
    }
  }
  
  return {};
}

async function handleQueryMode(
  question: string,
  user: string,
  role: 'employee' | 'admin',
  sessionId?: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<CoachResponse> {
  console.log(`[AI] CRM QUERY: Starting query mode`);
  console.log(`[AI Coach] Processing QUERY mode for: "${question.substring(0, 50)}..."`);
  console.log(`[AI Coach] User: ${user}, Role: ${role}`);
  
  // Use RAG engine for QUERY mode
  try {
    const ragResponse = await executeRAGQuery(question, user, 'QUERY');
    console.log(`[AI Coach] RAG query executed: confidence=${ragResponse.confidence}`);
    
    // Convert RAG response to CoachResponse format for backward compatibility
    const queryResult: CRMQueryResult = {
      success: ragResponse.data.length > 0,
      entity: 'accounts' as any, // RAG can query multiple entities, using 'accounts' as default type
      operation: 'get',
      raw: ragResponse.data.length > 0 ? ragResponse.data : null,
      formatted: ragResponse.answer,
      count: ragResponse.data.length,
    };
    
    return {
      reply: ragResponse.answer,
      structured: queryResult,
      tone: 'informational',
      mode: 'QUERY',
      queryResult, // Keep for backward compatibility
    };
  } catch (error: any) {
    console.error('[AI Coach] RAG query execution failed:', error);
    
    // Fallback to old CRM query engine for backward compatibility
    try {
      const queryResult = await executeCRMQuery(question, role, user);
      console.log(`[AI Coach] Fallback CRM query executed: success=${queryResult.success}, entity=${queryResult.entity}, count=${queryResult.count || 0}`);
      
      return {
        reply: queryResult.formatted || 'No matching records found in CRM.',
        tone: 'informational',
        mode: 'QUERY',
        queryResult,
      };
    } catch (fallbackError: any) {
      console.error('[AI Coach] Fallback query also failed:', fallbackError);
      return {
        reply: `I encountered an error while fetching data: ${error.message}. Please try rephrasing your question.`,
        tone: 'warning',
        mode: 'QUERY',
        queryResult: {
          success: false,
          entity: 'unknown',
          operation: 'get',
          raw: null,
          formatted: error.message,
        },
      };
    }
  }
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

/**
 * Fetch quotation success rate and loss reasons
 */
async function fetchQuotationMetrics(user: string, role: 'employee' | 'admin') {
  const supabase = createSupabaseServerClient();
  const tables = ['quotes_mbcb', 'quotes_signages', 'quotes_paint'];
  
  let totalQuotations = 0;
  let wonCount = 0;
  let lostCount = 0;
  const lossReasons: string[] = [];
  
  try {
    for (const table of tables) {
      let query = supabase
        .from(table)
        .select('outcome_status, outcome_notes')
        .in('outcome_status', ['won', 'lost']);
      
      if (role === 'employee') {
        query = query.eq('created_by', user);
      }
      
      const { data } = await query;
      
      if (data) {
        data.forEach((q: any) => {
          totalQuotations++;
          if (q.outcome_status === 'won') {
            wonCount++;
          } else if (q.outcome_status === 'lost') {
            lostCount++;
            if (q.outcome_notes && q.outcome_notes.trim()) {
              lossReasons.push(q.outcome_notes.trim());
            }
          }
        });
      }
    }
    
    const winRate = totalQuotations > 0 
      ? Math.round((wonCount / totalQuotations) * 100)
      : 0;
    
    // Get unique loss reasons (limit to 5 most common)
    const uniqueLossReasons = Array.from(new Set(lossReasons)).slice(0, 5);
    const lossReasonsSummary = uniqueLossReasons.length > 0
      ? uniqueLossReasons.join(", ")
      : "No loss reasons recorded";
    
    return {
      totalQuotations,
      winRate,
      lossReasonsSummary
    };
  } catch (error: any) {
    console.error('[AI Coach] Error fetching quotation metrics:', error);
    return {
      totalQuotations: 0,
      winRate: 0,
      lossReasonsSummary: "No data available"
    };
  }
}

/**
 * Fetch additional CRM metrics (contacts, follow-ups, accounts)
 */
async function fetchAdditionalMetrics(user: string, role: 'employee' | 'admin') {
  const supabase = createSupabaseServerClient();
  
  try {
    // Fetch total contacts
    let contactsQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });
    
    if (role === 'employee') {
      // Get sub-accounts assigned to employee
      const { data: subAccounts } = await supabase
        .from('sub_accounts')
        .select('id')
        .eq('assigned_employee', user);
      
      const subAccountIds = (subAccounts || []).map(sa => sa.id);
      if (subAccountIds.length > 0) {
        contactsQuery = contactsQuery.in('sub_account_id', subAccountIds);
      } else {
        return {
          totalContacts: 0,
          openFollowups: 0,
          totalAccounts: 0,
          activeAccounts: 0
        };
      }
    }
    
    const { count: totalContacts } = await contactsQuery;
    
    // Fetch open follow-ups (contacts with follow_up_date in future or today)
    const today = new Date().toISOString().split('T')[0];
    let followupsQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .not('follow_up_date', 'is', null)
      .gte('follow_up_date', today);
    
    if (role === 'employee') {
      const { data: subAccounts } = await supabase
        .from('sub_accounts')
        .select('id')
        .eq('assigned_employee', user);
      
      const subAccountIds = (subAccounts || []).map(sa => sa.id);
      if (subAccountIds.length > 0) {
        followupsQuery = followupsQuery.in('sub_account_id', subAccountIds);
      }
    }
    
    const { count: openFollowups } = await followupsQuery;
    
    // Fetch accounts
    let accountsQuery = supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    let activeAccountsQuery = supabase
      .from('sub_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    if (role === 'employee') {
      accountsQuery = accountsQuery.eq('assigned_employee', user);
      activeAccountsQuery = activeAccountsQuery.eq('assigned_employee', user);
    }
    
    const { count: totalAccounts } = await accountsQuery;
    const { count: activeAccounts } = await activeAccountsQuery;
    
    return {
      totalContacts: totalContacts || 0,
      openFollowups: openFollowups || 0,
      totalAccounts: totalAccounts || 0,
      activeAccounts: activeAccounts || 0
    };
  } catch (error: any) {
    console.error('[AI Coach] Error fetching additional metrics:', error);
    return {
      totalContacts: 0,
      openFollowups: 0,
      totalAccounts: 0,
      activeAccounts: 0
    };
  }
}

async function handleCoachMode(
  question: string,
  user: string,
  role: 'employee' | 'admin',
  context?: CoachRequest['context'],
  sessionId?: string,
  conversationHistoryParam?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<CoachResponse> {
  console.log(`[AI] CRM COACH: Starting coach mode`);
  console.log(`[AI Coach] Processing COACH mode for: "${question.substring(0, 50)}..."`);
  
  // Load conversation history if sessionId provided
  let loadedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = conversationHistoryParam || [];
  if (sessionId && loadedHistory.length === 0) {
    try {
      loadedHistory = await loadConversationHistory(user, sessionId, 10);
      console.log(`[AI] CRM COACH: Loaded ${loadedHistory.length} conversation history entries`);
    } catch (error: any) {
      console.warn('[AI Coach] Error loading conversation history:', error.message);
    }
  }
  
  // Add to conversation memory (backward compatibility)
  addToConversationMemory(user, question);
  console.log(`[AI] CRM COACH: Added to conversation memory`);
  
  // Fetch all required CRM data
  let metrics: EmployeeMetrics | null = null;
  let slippingAccounts: SlippingAccount[] = [];
  let ranking: EmployeeRanking | null = null;
  let adminSummary: Awaited<ReturnType<typeof getAdminInsightsSummary>> | null = null;
  let quotationMetrics = { totalQuotations: 0, winRate: 0, lossReasonsSummary: "No data available" };
  let additionalMetrics = { totalContacts: 0, openFollowups: 0, totalAccounts: 0, activeAccounts: 0 };

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
    
    // Fetch quotation success rate and loss reasons
    quotationMetrics = await fetchQuotationMetrics(user, role);
    
    // Fetch additional metrics (contacts, follow-ups, accounts)
    additionalMetrics = await fetchAdditionalMetrics(user, role);
  } catch (dbError: any) {
    console.error('Error fetching CRM context:', dbError);
    // Continue with empty data rather than failing
  }

  // Build enhanced context with required format
  const slipping = slippingAccounts.map(a => ({
    subAccountName: a.name,
    engagementScore: a.engagementScore
  }));
  
  // Use existing metrics when available, fallback to additionalMetrics
  const totalAccounts = role === 'admin' 
    ? (adminSummary?.totalAccounts || additionalMetrics.totalAccounts)
    : (metrics?.totalAccounts || additionalMetrics.totalAccounts);
  
  const activeAccounts = role === 'admin'
    ? (adminSummary?.totalSubAccounts || additionalMetrics.activeAccounts)
    : (metrics?.totalSubAccounts || additionalMetrics.activeAccounts);
  
  const enhancedContext = `
🔹 Total Accounts: ${totalAccounts}
🔹 Active Accounts: ${activeAccounts}
🔹 Slipping Accounts (${slipping.length}): ${slipping.length > 0 ? slipping.slice(0, 5).map(a => a.subAccountName).join(", ") : "None"}
🔹 Total Contacts: ${additionalMetrics.totalContacts}
🔹 Open Follow-ups: ${additionalMetrics.openFollowups}
🔹 Total Quotations Raised: ${quotationMetrics.totalQuotations}
🔹 Win Rate: ${quotationMetrics.winRate}%
🔹 Loss Reasons: ${quotationMetrics.lossReasonsSummary}

Only use CRM data above. NEVER guess numbers.
If no data exists, explicitly say "No CRM data available".
`;

  // Get user profile for role-based customization
  const profile = getUserProfile(role);
  const profileContext = getProfileContext(role);
  console.log(`[AI] CRM COACH: Role detected: ${role}, Profile: ${profile.tone}/${profile.detailLevel}`);
  
  // Build AI prompt with strict data usage rules
  const systemPrompt = `You are an AI Sales Coach for YSM Safety CRM (road safety equipment company).

${profileContext}

CRITICAL RULES:
1. ONLY use the CRM data provided in the context below
2. NEVER guess, invent, or hallucinate numbers or facts
3. If data is missing or unavailable, explicitly state: "No CRM data available" for that metric
4. ALWAYS reference specific numbers and account names from the provided data
5. Give ACTIONABLE advice with specific next steps based on actual data
6. NO generic filler text - be specific to their actual CRM data
7. Keep replies concise (2-4 sentences)
8. ALWAYS include 2-3 specific suggested actions based on the data

TONE SELECTION:
- "encouraging": Use for achievements, good metrics, motivation
- "strategic": Use for planning, optimization, general advice  
- "warning": Use for low engagement, urgent issues, declining metrics

Return JSON: { "reply": "<answer>", "suggestedActions": ["action1", "action2", "action3"], "tone": "encouraging" | "strategic" | "warning" }`;

  // Format conversation memory context (backward compatibility)
  const memoryContext = formatMemoryContext(user);
  
  // Build conversation history context
  let conversationContext = '';
  if (loadedHistory.length > 0) {
    conversationContext = '\n\nPrevious Conversation:\n' + 
      loadedHistory.slice(-5).map((entry, idx) => 
        `${entry.role === 'user' ? 'User' : 'AI'}: ${entry.content}`
      ).join('\n');
  }
  
  // Build user prompt with enhanced context followed by question
  const userPrompt = `${memoryContext ? `${memoryContext}\n\n` : ''}${conversationContext}${enhancedContext}

User Question:
${question}

Based ONLY on the CRM data provided above, answer the user's question. If any data is missing, explicitly state "No CRM data available" for that metric.`;

  // Load business knowledge context
  let knowledge;
  try {
    knowledge = await loadBusinessKnowledge({
      subAccountId: context?.subAccountId,
      // quotationId detection not implemented yet - can be added later
    });
    console.log('[AI Coach] Loaded business knowledge context for COACH mode');
  } catch (error) {
    console.warn('[AI Coach] Failed to load business knowledge, continuing without it:', error);
    // Continue without knowledge context if loading fails
    knowledge = undefined;
  }

  // Call Gemini AI
  let coachResponse: CoachResponse;
  try {
    console.log(`[AI] CRM COACH: Calling runGemini with knowledge context`);
    console.log(`[AI Coach] Calling Gemini for coaching response`);
    const rawResponse = await runGemini<{
      reply: string;
      suggestedActions: string[];
      tone: 'encouraging' | 'strategic' | 'warning';
    }>(systemPrompt, userPrompt, knowledge);
    console.log(`[AI] CRM COACH: runGemini completed`);
    
    // Validate response
    const reply = rawResponse.reply || 'No CRM data available to answer this question.';
    const tone = (rawResponse.tone && ['encouraging', 'strategic', 'warning'].includes(rawResponse.tone))
      ? rawResponse.tone
      : 'strategic';
    
    coachResponse = {
      reply,
      suggestedActions: Array.isArray(rawResponse.suggestedActions) 
        ? rawResponse.suggestedActions.filter((a): a is string => typeof a === 'string' && a.trim().length > 0).slice(0, 3)
        : [],
      tone: tone as 'encouraging' | 'strategic' | 'warning',
      mode: 'COACH',
    };
    console.log(`[AI Coach] Response received: ${coachResponse.reply.substring(0, 80)}...`);
    console.log(`[AI] CRM COACH: Coach response complete`);
  } catch (aiError: any) {
    console.error('[AI Coach] Gemini error:', aiError.message);
    console.error(`[AI] CRM COACH: Error occurred`);
    
    // Return error response without generic fallback
      coachResponse = {
      reply: 'No CRM data available to answer this question. Please try again later or contact support if the issue persists.',
      suggestedActions: [],
      tone: 'warning',
        mode: 'COACH',
      };
  }

  return coachResponse;
}

// ============================================
// Main API Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: CoachRequest = await request.json();
    const { user, role, question, mode: userSelectedMode, sessionId, stream, context } = body;

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
    // SESSION MANAGEMENT
    // ============================================
    
    let finalSessionId: string;
    try {
      finalSessionId = sessionId || await getOrCreateSession(user);
      console.log(`[AI Coach] Using session: ${finalSessionId}`);
    } catch (error: any) {
      console.error('[AI Coach] Error getting session:', error.message);
      // Continue without session if it fails
      finalSessionId = sessionId || '';
    }
    
    // Load conversation history for context
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (finalSessionId) {
      try {
        conversationHistory = await loadConversationHistory(user, finalSessionId, 10);
        console.log(`[AI Coach] Loaded ${conversationHistory.length} conversation history entries`);
      } catch (error: any) {
        console.warn('[AI Coach] Error loading conversation history:', error.message);
      }
    }

    // ============================================
    // MODE SWITCHING DETECTION
    // ============================================
    
    const modeSwitch = detectModeSwitch(question);
    let actualQuestion = question;
    let effectiveUserMode = userSelectedMode;
    
    if (modeSwitch.switchMode) {
      effectiveUserMode = modeSwitch.switchMode === 'COACH' ? 'coach' : 'assistant';
      console.log(`[AI Coach] Mode switch detected: ${modeSwitch.switchMode}`);
      if (modeSwitch.remainingQuestion) {
        actualQuestion = modeSwitch.remainingQuestion;
      }
    }

    // ============================================
    // DETERMINE MODE (Router or User Override)
    // ============================================
    
    let mode: AIMode;
    
    if (effectiveUserMode === 'assistant') {
      // User explicitly selected assistant/query mode
      mode = 'QUERY';
      console.log(`[AI Coach] User-selected mode: QUERY (assistant)`);
    } else if (effectiveUserMode === 'coach') {
      // User explicitly selected coach mode
      mode = 'COACH';
      console.log(`[AI Coach] User-selected mode: COACH`);
    } else {
      // Use conversationRouterV2 for intelligent routing
      try {
        const routeDecision = await routeConversation(actualQuestion, user, conversationHistory);
        mode = routeDecision.mode === 'COACH' ? 'COACH' : 'QUERY';
        console.log(`[AI Coach] ConversationRouterV2 detected mode: ${mode} (confidence: ${routeDecision.confidence})`);
      } catch (error: any) {
        console.warn('[AI Coach] ConversationRouterV2 failed, falling back to old router:', error.message);
        // Fallback to old router for backward compatibility
        mode = routeAIRequest(actualQuestion);
        console.log(`[AI Coach] Fallback auto-detected mode: ${mode}`);
      }
    }

    console.log(`[AI Coach] ${getModeDescription(mode, actualQuestion)}`);

    // ============================================
    // STREAMING SUPPORT (Optional)
    // ============================================
    
    if (stream) {
      // Create a ReadableStream for streaming responses
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // For now, we'll stream the final response
            // In the future, this could stream partial responses as they're generated
            let response: CoachResponse;
            
            if (mode === 'QUERY') {
              response = await handleQueryMode(actualQuestion, user, role, finalSessionId, conversationHistory);
            } else {
              response = await handleCoachMode(actualQuestion, user, role, context, finalSessionId, conversationHistory);
            }
            
            // Stream the response as JSON
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(JSON.stringify({ success: true, ...response })));
            controller.close();
          } catch (error: any) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(JSON.stringify({ 
              success: false, 
              error: error.message 
            })));
            controller.close();
          }
        },
      });
      
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // ============================================
    // PROCESS REQUEST BASED ON MODE
    // ============================================

    let response: CoachResponse;

    if (mode === 'QUERY') {
      response = await handleQueryMode(actualQuestion, user, role, finalSessionId, conversationHistory);
    } else {
      response = await handleCoachMode(actualQuestion, user, role, context, finalSessionId, conversationHistory);
    }
    
    // ============================================
    // SAVE CONVERSATION TURN
    // ============================================
    
    if (finalSessionId) {
      saveConversationTurn(
        user,
        finalSessionId,
        actualQuestion,
        response.reply,
        mode,
        undefined // intent can be added later if needed
      ).catch(err => {
        console.error('[AI Coach] Error saving conversation turn:', err.message);
      });
    }

    // ============================================
    // VALIDATE AND RETURN RESPONSE
    // ============================================

    const validatedResponse: CoachResponse = {
      reply: typeof response.reply === 'string' && response.reply.trim()
        ? response.reply.trim()
        : 'No CRM data available to answer this question.',
      suggestedActions: Array.isArray(response.suggestedActions)
        ? response.suggestedActions
            .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
            .slice(0, 5)
        : [],
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
