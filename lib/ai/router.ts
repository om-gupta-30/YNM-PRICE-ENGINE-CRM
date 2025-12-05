/**
 * AI Router - Determines whether a query should use COACH or QUERY mode
 * 
 * Mode A (COACH): AI reasoning for coaching, advice, strategy
 * Mode B (QUERY): Live database lookups for factual CRM data
 * 
 * @module lib/ai/router
 */

export type AIMode = 'COACH' | 'QUERY';

// ============================================
// Query Mode Detection Patterns
// ============================================

/**
 * Patterns that indicate the user wants factual database data (QUERY mode)
 * These are questions that require looking up actual CRM records
 */
const QUERY_PATTERNS = [
  // Count patterns
  /how many contacts/i,
  /how many accounts/i,
  /how many sub.?accounts/i,
  /how many follow.?ups/i,
  /how many leads/i,
  /how many activities/i,
  /how many quotations/i,
  /how many quotes/i,
  
  // List patterns
  /list (?:all )?(?:my )?contacts/i,
  /list (?:all )?(?:my )?accounts/i,
  /list (?:all )?(?:my )?sub.?accounts/i,
  /list (?:all )?(?:my )?follow.?ups/i,
  /list (?:all )?(?:my )?leads/i,
  /list (?:all )?(?:my )?activities/i,
  /list (?:all )?(?:my )?quotations/i,
  
  // Show patterns
  /show (?:all )?(?:my )?contacts/i,
  /show (?:all )?(?:my )?accounts/i,
  /show (?:all )?(?:my )?sub.?accounts/i,
  /show (?:all )?(?:my )?follow.?ups/i,
  /show (?:all )?(?:my )?leads/i,
  /show (?:all )?(?:my )?activities/i,
  /show (?:all )?(?:my )?quotations/i,
  
  // Get/Find patterns
  /(?:get|find) contacts/i,
  /(?:get|find) accounts/i,
  /(?:get|find) sub.?accounts/i,
  /(?:get|find) follow.?ups/i,
  /(?:get|find) leads/i,
  
  // What/Tell me patterns (data queries)
  /what (?:are|is) (?:my|the) contacts/i,
  /what (?:are|is) (?:my|the) accounts/i,
  /what (?:are|is) (?:my|the) sub.?accounts/i,
  /what (?:are|is) (?:my|the) follow.?ups/i,
  /what (?:are|is) (?:my|the) leads/i,
  /what (?:are|is) (?:my|the) activities/i,
  /what (?:are|is) (?:my|the) quotations/i,
  /tell me (?:about|my) contacts/i,
  /tell me (?:about|my) accounts/i,
  /tell me (?:about|my) sub.?accounts/i,
  /tell me (?:about|my) follow.?ups/i,
  /tell me (?:about|my) leads/i,
  
  // Specific data queries
  /what is (?:the )?engagement score/i,
  /what(?:'s| is) (?:the )?total pipeline/i,
  /what(?:'s| is) (?:the )?pipeline value/i,
  /total quotation value/i,
  
  // Due/pending queries
  /follow.?ups (?:due|pending|overdue)/i,
  /(?:due|pending|overdue) follow.?ups/i,
  /today.?s follow.?ups/i,
  /follow.?ups for today/i,
  /upcoming follow.?ups/i,
  
  // Specific entity queries
  /contacts (?:for|under|in|of) /i,
  /contacts does .+ have/i,
  /does .+ have (?:any )?contacts/i,
  
  // Recent activity queries
  /recent activities/i,
  /activities (?:this week|today|this month)/i,
  /activity (?:log|history)/i,
  
  // Status queries
  /lead status/i,
  /quotation status/i,
  
  // Who/What queries about data
  /who are (?:the|my) contacts/i,
  /what accounts do I have/i,
  /what sub.?accounts/i,
  /which accounts/i,
  /which contacts/i,
  /which leads/i,
  
  // Simple entity mentions (if user just says "contacts", "accounts", etc.)
  /^(?:contacts|accounts|sub.?accounts|follow.?ups|leads|activities|quotations|quotes)$/i,
];

/**
 * Patterns that indicate coaching/advice mode (COACH mode)
 * These are questions seeking guidance, strategy, or analysis
 */
const COACH_PATTERNS = [
  // Improvement/advice patterns
  /how (?:can|do|should) I improve/i,
  /how to improve/i,
  /tips? (?:for|to|on)/i,
  /advice (?:for|on|about)/i,
  /suggest(?:ion)?s? (?:for|to|on)/i,
  /recommend(?:ation)?s? (?:for|to|on)/i,
  
  // Strategy patterns
  /what should I (?:do|focus)/i,
  /where should I focus/i,
  /how (?:can|do) I (?:close|win|convert)/i,
  /best (?:way|practice|approach)/i,
  /strategy (?:for|to)/i,
  
  // Analysis patterns
  /why (?:is|are|am)/i,
  /analyze/i,
  /what.?s (?:wrong|going on)/i,
  /help me (?:understand|figure)/i,
  
  // Motivation/status patterns
  /how am I doing/i,
  /am I doing (?:well|good|ok)/i,
  /my performance/i,
  /how.?s my/i,
  
  // Coaching questions
  /coach me/i,
  /guide me/i,
  /train me/i,
  /teach me/i,
  /explain (?:how|why|what)/i,
  
  // Priority/focus questions
  /what.?s (?:the )?priority/i,
  /what to (?:prioritize|focus)/i,
  /which (?:accounts?|leads?) (?:should|need)/i,
  
  // Greeting patterns (should use coach mode)
  /^(?:hi|hello|hey|good morning|good afternoon|good evening)/i,
  /^how are you/i,
];

/**
 * Keywords that strongly indicate QUERY mode regardless of sentence structure
 */
const QUERY_KEYWORDS = [
  'how many',
  'count',
  'number of',
  'list all',
  'show all',
  'get all',
  'pipeline value',
  'total value',
  'follow-ups due',
  'followups due',
  'due today',
  'overdue',
];

/**
 * Keywords that strongly indicate COACH mode regardless of sentence structure
 */
const COACH_KEYWORDS = [
  'improve',
  'tips',
  'advice',
  'help me',
  'should i',
  'strategy',
  'best way',
  'recommend',
  'suggestion',
  'coach',
  'guide',
];

// ============================================
// Router Function
// ============================================

/**
 * Routes an AI request to the appropriate mode
 * 
 * @param inputText - The user's query text
 * @returns 'COACH' for coaching/advice mode, 'QUERY' for database lookup mode
 */
export function routeAIRequest(inputText: string): AIMode {
  const text = inputText.toLowerCase().trim();
  
  // Empty or very short queries default to coach mode
  if (text.length < 2) {
    return 'COACH';
  }

  // Check for simple entity mentions first (most reliable)
  const simpleEntityPattern = /^(?:contacts?|accounts?|sub.?accounts?|follow.?ups?|leads?|activities?|quotations?|quotes?)$/i;
  if (simpleEntityPattern.test(text)) {
    console.log(`[Router] QUERY mode triggered by simple entity mention: "${text}"`);
    return 'QUERY';
  }

  // First, check for strong QUERY keywords
  for (const keyword of QUERY_KEYWORDS) {
    if (text.includes(keyword)) {
      console.log(`[Router] QUERY mode triggered by keyword: "${keyword}"`);
      return 'QUERY';
    }
  }

  // Then, check QUERY patterns
  for (const pattern of QUERY_PATTERNS) {
    if (pattern.test(text)) {
      console.log(`[Router] QUERY mode triggered by pattern: ${pattern}`);
      return 'QUERY';
    }
  }

  // Check for strong COACH keywords
  for (const keyword of COACH_KEYWORDS) {
    if (text.includes(keyword)) {
      console.log(`[Router] COACH mode triggered by keyword: "${keyword}"`);
      return 'COACH';
    }
  }

  // Check COACH patterns
  for (const pattern of COACH_PATTERNS) {
    if (pattern.test(text)) {
      console.log(`[Router] COACH mode triggered by pattern: ${pattern}`);
      return 'COACH';
    }
  }

  // If query contains entity keywords but no clear pattern, default to QUERY
  // (user likely wants data, not advice)
  const entityKeywords = ['contact', 'account', 'subaccount', 'followup', 'lead', 'activity', 'quotation', 'quote'];
  for (const keyword of entityKeywords) {
    if (text.includes(keyword)) {
      console.log(`[Router] QUERY mode triggered by entity keyword: "${keyword}"`);
      return 'QUERY';
    }
  }

  // Default to COACH mode for ambiguous queries
  // (AI can provide general guidance)
  console.log(`[Router] Defaulting to COACH mode for ambiguous query`);
  return 'COACH';
}

/**
 * Validates if a query is suitable for the CRM assistant
 * Returns true if the query is about CRM-related topics
 */
export function isValidCRMQuery(inputText: string): boolean {
  const text = inputText.toLowerCase().trim();
  
  // CRM-related keywords
  const crmKeywords = [
    'contact', 'account', 'sub-account', 'subaccount', 'lead', 'follow-up', 'followup',
    'activity', 'quotation', 'quote', 'engagement', 'score', 'performance', 'sale',
    'customer', 'client', 'pipeline', 'call', 'email', 'meeting', 'task', 'note',
    'status', 'deal', 'conversion', 'target', 'goal', 'streak', 'ranking'
  ];
  
  // Check if any CRM keyword is present
  for (const keyword of crmKeywords) {
    if (text.includes(keyword)) {
      return true;
    }
  }
  
  // Also allow greetings and general questions
  const generalPatterns = [
    /^(?:hi|hello|hey)/i,
    /^how are you/i,
    /^what can you/i,
    /^help/i,
  ];
  
  for (const pattern of generalPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get a description of what mode was selected and why
 * Useful for debugging and logging
 */
export function getModeDescription(mode: AIMode, inputText: string): string {
  if (mode === 'QUERY') {
    return `Database Query Mode - Looking up factual CRM data for: "${inputText.substring(0, 50)}..."`;
  }
  return `Sales Coach Mode - Providing coaching/advice for: "${inputText.substring(0, 50)}..."`;
}
