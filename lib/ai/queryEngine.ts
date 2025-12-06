/**
 * CRM Query Engine - Mode B: CRM Knowledge Assistant
 * 
 * This module handles factual CRM queries by:
 * 1. Parsing user intent to identify target entity (contacts, accounts, subaccounts, followups)
 * 2. Safely constructing Supabase queries
 * 3. Returning structured database results (never hallucinating)
 * 
 * @module lib/ai/queryEngine
 */

import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { interpretSemanticQuery } from './semanticQueryInterpreter';
import { detectSilentAccounts, detectSilentAccountsFallback, detectSlippingEngagement } from './crmInsightEngine';

// ============================================
// Types
// ============================================

export type QueryEntityType = 
  | 'contacts' 
  | 'accounts' 
  | 'subaccounts' 
  | 'followups' 
  | 'activities' 
  | 'quotations'
  | 'leads'
  | 'metrics'
  | 'unknown';

export interface QueryIntent {
  entity: QueryEntityType;
  operation: 'count' | 'list' | 'get' | 'aggregate' | 'search';
  filters: {
    subaccountName?: string;
    subAccountId?: number; // Resolved sub-account ID
    accountName?: string;
    employeeName?: string;
    contactName?: string;
    dateRange?: { start?: string; end?: string };
    status?: string;
    limit?: number;
  };
  rawQuery: string;
}

export interface CRMQueryResult {
  success: boolean;
  entity: QueryEntityType;
  operation: string;
  raw: any;
  formatted: string;
  count?: number;
  message?: string;
}

// ============================================
// Intent Detection Patterns
// ============================================

const ENTITY_PATTERNS: Record<QueryEntityType, RegExp[]> = {
  contacts: [
    /how many contacts/i,
    /list contacts/i,
    /show contacts/i,
    /contacts for/i,
    /contacts under/i,
    /contacts in/i,
    /contact list/i,
    /all contacts/i,
    /number of contacts/i,
    /contacts count/i,
    /who are the contacts/i,
    /get contacts/i,
    /find contacts/i,
    /what contacts/i,
    /tell me about contacts/i,
    /my contacts/i,
    /contact details/i,
    /contact information/i,
    /^contacts$/i, // Just "contacts"
    /^contact$/i, // Just "contact"
  ],
  accounts: [
    /how many accounts/i,
    /list accounts/i,
    /show accounts/i,
    /all accounts/i,
    /account list/i,
    /accounts for/i,
    /number of accounts/i,
    /which accounts/i,
    /get accounts/i,
    /find accounts/i,
    /accounts with/i,
    /what accounts/i,
    /tell me about accounts/i,
    /my accounts/i,
    /account details/i,
    /^accounts$/i, // Just "accounts"
    /^account$/i, // Just "account"
  ],
  subaccounts: [
    /how many sub.?accounts/i,
    /list sub.?accounts/i,
    /show sub.?accounts/i,
    /sub.?accounts for/i,
    /sub.?accounts under/i,
    /all sub.?accounts/i,
    /sub.?account list/i,
    /number of sub.?accounts/i,
    /which sub.?accounts/i,
    /get sub.?accounts/i,
    /find sub.?accounts/i,
    /does .+ have/i, // "Does Megha have..." pattern
    /what sub.?accounts/i,
    /tell me about sub.?accounts/i,
    /my sub.?accounts/i,
    /sub.?account details/i,
    /^sub.?accounts$/i, // Just "subaccounts"
    /^sub.?account$/i, // Just "subaccount"
  ],
  followups: [
    /how many follow.?ups/i,
    /list follow.?ups/i,
    /show follow.?ups/i,
    /follow.?ups due/i,
    /pending follow.?ups/i,
    /upcoming follow.?ups/i,
    /follow.?up list/i,
    /all follow.?ups/i,
    /overdue follow.?ups/i,
    /today.?s follow.?ups/i,
    /follow.?ups for today/i,
    /what follow.?ups/i,
    /tell me about follow.?ups/i,
    /my follow.?ups/i,
    /follow.?up details/i,
    /^follow.?ups$/i, // Just "followups"
    /^follow.?up$/i, // Just "followup"
  ],
  activities: [
    /how many activities/i,
    /list activities/i,
    /show activities/i,
    /recent activities/i,
    /activity log/i,
    /activity history/i,
    /activities for/i,
    /what activities/i,
    /activities this week/i,
    /activities today/i,
    /tell me about activities/i,
    /my activities/i,
    /activity details/i,
    /^activities$/i, // Just "activities"
    /^activity$/i, // Just "activity"
  ],
  quotations: [
    /how many quotations/i,
    /list quotations/i,
    /show quotations/i,
    /quotation value/i,
    /total quotations/i,
    /pipeline value/i,
    /total pipeline/i,
    /quotations for/i,
    /quotes for/i,
    /quote value/i,
    /what quotations/i,
    /tell me about quotations/i,
    /my quotations/i,
    /quotation details/i,
    /^quotations$/i, // Just "quotations"
    /^quotation$/i, // Just "quotation"
    /^quotes$/i, // Just "quotes"
    /^quote$/i, // Just "quote"
  ],
  leads: [
    /how many leads/i,
    /list leads/i,
    /show leads/i,
    /active leads/i,
    /lead status/i,
    /leads for/i,
    /open leads/i,
    /new leads/i,
    /what leads/i,
    /tell me about leads/i,
    /my leads/i,
    /lead details/i,
    /^leads$/i, // Just "leads"
    /^lead$/i, // Just "lead"
  ],
  metrics: [
    /engagement score/i,
    /average score/i,
    /performance/i,
    /total value/i,
    /conversion rate/i,
    /activity breakdown/i,
    /what is my/i,
    /my metrics/i,
    /my performance/i,
    /my stats/i,
    /statistics/i,
  ],
  unknown: [],
};

const OPERATION_PATTERNS = {
  count: [/how many/i, /count/i, /number of/i, /total\s+(number|count)?/i, /are there\s+\d+/i, /there are\s+\d+/i, /only\s+\d+/i],
  list: [/list/i, /show/i, /get/i, /find/i, /which/i, /who are/i],
  aggregate: [/average/i, /sum/i, /pipeline/i, /value/i],
  search: [/search/i, /look for/i],
  get: [/what is/i, /what's/i, /tell me about/i, /details/i, /info/i],
};

// ============================================
// Semantic Inference (Fallback)
// ============================================

/**
 * Infer query intent using basic semantic heuristics
 * Used as fallback when regex patterns don't match
 */
function inferQueryIntent(text: string): {
  entityGuess: string | null;
  operationGuess: 'count' | 'list' | 'top' | 'unknown';
  filterGuess?: {
    namePrefix?: string;
    dateFilter?: { start?: string; end?: string };
    employeeName?: string;
  };
} {
  const normalized = text.toLowerCase().trim();
  
  // 1. Detect entity guesses
  let entityGuess: string | null = null;
  
  const entityKeywords: Record<string, string> = {
    'contact': 'contacts',
    'contacts': 'contacts',
    'account': 'accounts',
    'accounts': 'accounts',
    'subaccount': 'subaccounts',
    'sub-account': 'subaccounts',
    'subaccounts': 'subaccounts',
    'sub-accounts': 'subaccounts',
    'quotation': 'quotations',
    'quotations': 'quotations',
    'quote': 'quotations',
    'quotes': 'quotations',
    'activity': 'activities',
    'activities': 'activities',
    'employee': 'employees',
    'employees': 'employees',
    'lead': 'leads',
    'leads': 'leads',
  };
  
  // Check for entity keywords (whole word match)
  for (const [keyword, entity] of Object.entries(entityKeywords)) {
    const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (keywordRegex.test(text)) {
      entityGuess = entity;
      break;
    }
  }
  
  // 2. Detect operation guesses
  let operationGuess: 'count' | 'list' | 'top' | 'unknown' = 'unknown';
  
  if (/how many|count|number of|total\s+(number|count)?|are there|there are|only\s+\d+/i.test(normalized)) {
    operationGuess = 'count';
  } else if (/list|show|give me|name all|display|what are|which are/i.test(normalized)) {
    operationGuess = 'list';
  } else if (/largest|highest|biggest|top\s+\d+|maximum|max/i.test(normalized)) {
    operationGuess = 'top';
  }
  
  // 3. Detect basic filter structure
  const filterGuess: {
    namePrefix?: string;
    dateFilter?: { start?: string; end?: string };
    employeeName?: string;
  } = {};
  
  // "starting with X" or "that start with X"
  const namePrefixMatch = normalized.match(/(?:starting with|that start with|begin with|beginning with)\s+["']?([a-z0-9]+)["']?/i);
  if (namePrefixMatch && namePrefixMatch[1]) {
    filterGuess.namePrefix = namePrefixMatch[1];
  }
  
  // "in last X days" or "last X days"
  const daysMatch = normalized.match(/(?:in\s+)?last\s+(\d+)\s+days?/i);
  if (daysMatch && daysMatch[1]) {
    const days = parseInt(daysMatch[1], 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    filterGuess.dateFilter = { start: startDate.toISOString() };
  }
  
  // "assigned to NAME" or "for employee NAME"
  const employeeMatch = normalized.match(/(?:assigned to|for employee|employee)\s+["']?([A-Za-z][A-Za-z0-9\s\-_.]{2,40}?)["']?/i);
  if (employeeMatch && employeeMatch[1]) {
    filterGuess.employeeName = employeeMatch[1].trim();
  }
  
  return {
    entityGuess,
    operationGuess,
    filterGuess: Object.keys(filterGuess).length > 0 ? filterGuess : undefined,
  };
}

// ============================================
// Intent Parser
// ============================================

/**
 * Parse user query text to extract intent
 */
export function parseQueryIntent(text: string): QueryIntent {
  const normalizedText = text.toLowerCase().trim();
  
  // Detect entity type - try exact matches first, then patterns
  let detectedEntity: QueryEntityType = 'unknown';
  
  // First, check for exact entity mentions (more reliable)
  const entityKeywords: Record<string, QueryEntityType> = {
    'contact': 'contacts',
    'contacts': 'contacts',
    'account': 'accounts',
    'accounts': 'accounts',
    'subaccount': 'subaccounts',
    'sub-account': 'subaccounts',
    'subaccounts': 'subaccounts',
    'sub-accounts': 'subaccounts',
    'followup': 'followups',
    'follow-up': 'followups',
    'followups': 'followups',
    'follow-ups': 'followups',
    'activity': 'activities',
    'activities': 'activities',
    'quotation': 'quotations',
    'quotations': 'quotations',
    'quote': 'quotations',
    'quotes': 'quotations',
    'lead': 'leads',
    'leads': 'leads',
  };
  
  // Check for exact keyword matches
  for (const [keyword, entity] of Object.entries(entityKeywords)) {
    // Match whole word or at start/end of sentence
    const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (keywordRegex.test(normalizedText)) {
      detectedEntity = entity;
      console.log(`[QueryEngine] Detected entity "${entity}" from keyword "${keyword}"`);
      break;
    }
  }
  
  // If no exact match, try patterns
  if (detectedEntity === 'unknown') {
    for (const [entity, patterns] of Object.entries(ENTITY_PATTERNS)) {
      if (entity === 'unknown') continue;
      for (const pattern of patterns) {
        if (pattern.test(normalizedText)) {
          detectedEntity = entity as QueryEntityType;
          console.log(`[QueryEngine] Detected entity "${entity}" from pattern`);
          break;
        }
      }
      if (detectedEntity !== 'unknown') break;
    }
  }

  // Detect operation type
  let operation: QueryIntent['operation'] = 'list';
  for (const [op, patterns] of Object.entries(OPERATION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedText)) {
        operation = op as QueryIntent['operation'];
        break;
      }
    }
  }

  // Extract filters
  const filters: QueryIntent['filters'] = {};

  // Extract subaccount name (various patterns)
  // Pattern: "for Megha", "under Megha", "Megha has", "does Megha have"
  // BUT: Skip if user says "not for", "no", "in general", "total", etc.
  
  // First check if user is explicitly asking for TOTAL/GENERAL (no filter)
  const isGeneralQuery = /\b(total|all|in general|overall|every|entire|whole|not for a specific|not for any specific|no specific|without filter|everything)\b/i.test(normalizedText);
  
  if (!isGeneralQuery) {
    const subaccountPatterns = [
      // "contacts for Ram Kumar" - but NOT "not for X" 
      /(?<!not\s)(?<!no\s)(?:for|under|of)\s+["']?([A-Z][A-Za-z0-9\s\-_.]{2,40}?)["']?(?:\s|$|\?|,)/i,
      /does\s+["']?([A-Z][A-Za-z0-9\s\-_.]{2,40}?)["']?\s+have/i,
      /["']?([A-Z][A-Za-z0-9\s\-_.]{2,40}?)["']?\s+(?:has|have)\s+(?:how many|contacts|sub)/i,
      /(?:subaccount|sub-account|sub account)\s+["']?([A-Z][A-Za-z0-9\s\-_.]{2,40}?)["']?/i,
    ];

    // Extended list of common words that aren't entity names
    const excludeWords = [
      'the', 'this', 'that', 'my', 'your', 'our', 'all', 'any', 'some', 
      'today', 'week', 'month', 'year', 'specific', 'a specific', 'particular',
      'general', 'in general', 'total', 'each', 'every', 'which', 'what',
      'how', 'when', 'where', 'who', 'whom', 'whose', 'why', 'me', 'us',
      'them', 'you', 'him', 'her', 'it', 'one', 'two', 'three', 'example',
      'instance', 'type', 'types', 'kind', 'kinds', 'none', 'no one', 'nobody'
    ];

    for (const pattern of subaccountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Filter out common words and short strings
        if (!excludeWords.some(w => name.toLowerCase() === w || name.toLowerCase().startsWith(w + ' ')) && name.length > 2) {
          filters.subaccountName = name;
          console.log(`[QueryEngine] Extracted subaccount filter: "${name}"`);
          break;
        }
      }
    }
  } else {
    console.log(`[QueryEngine] General query detected - no subaccount filter applied`);
  }

  // Extract account name
  const accountPatterns = [
    /account\s+["']?([A-Za-z][A-Za-z0-9\s\-_.]+?)["']?(?:\s|$|\?|,)/i,
    /(?:company|organization)\s+["']?([A-Za-z][A-Za-z0-9\s\-_.]+?)["']?/i,
  ];

  for (const pattern of accountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      filters.accountName = match[1].trim();
      break;
    }
  }

  // Extract employee name
  const employeePatterns = [
    /(?:employee|assigned to|for employee)\s+["']?([A-Za-z][A-Za-z0-9\s\-_.]+?)["']?/i,
    /(?:Employee\d+)/i,
  ];

  for (const pattern of employeePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      filters.employeeName = match[1].trim();
      break;
    }
  }

  // Extract date filters
  if (/today/i.test(normalizedText)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filters.dateRange = { start: today.toISOString() };
  } else if (/this week/i.test(normalizedText)) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    filters.dateRange = { start: startOfWeek.toISOString() };
  } else if (/this month/i.test(normalizedText)) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    filters.dateRange = { start: startOfMonth.toISOString() };
  }

  // Extract status filter
  const statusMatch = normalizedText.match(/(?:status|state)\s*[:=]?\s*["']?(\w+)["']?/i);
  if (statusMatch) {
    filters.status = statusMatch[1];
  }

  // Default limit
  filters.limit = 50;

  return {
    entity: detectedEntity,
    operation,
    filters,
    rawQuery: text,
  };
}

// ============================================
// Query Executors
// ============================================

/**
 * Execute CRM query based on parsed intent
 */
export async function executeCRMQuery(
  textQuery: string,
  userRole: 'admin' | 'employee',
  userId: string
): Promise<CRMQueryResult> {
  console.log(`[QueryEngine] Processing query: "${textQuery}" for user: ${userId} (${userRole})`);
  
  // Validate Supabase connection first
  let supabase: ReturnType<typeof createSupabaseServerClient>;
  try {
    supabase = createSupabaseServerClient();
    console.log(`[QueryEngine] Supabase client created successfully`);
  } catch (error: any) {
    console.error('[QueryEngine] Failed to create Supabase client:', error);
    return {
      success: false,
      entity: 'unknown',
      operation: 'list',
      raw: null,
      formatted: 'Database connection error. Please check your configuration.',
      message: error.message,
    };
  }

  // Try semantic query interpretation first (before regex logic)
  console.log(`[AI] QueryEngine: Starting query execution for: "${textQuery.substring(0, 100)}"`);
  const semanticIntent = interpretSemanticQuery(textQuery);
  console.log(`[AI] QueryEngine: Semantic intent`, {
    entity: semanticIntent.entity,
    filterType: semanticIntent.filterType,
    hasFilters: !!semanticIntent.filters && Object.keys(semanticIntent.filters).length > 0,
  });
  
  // Handle multi-condition queries (minQuotes, silentDays, region filters)
  if (semanticIntent.filters && (semanticIntent.filters.minQuotes || semanticIntent.filters.silentDays || semanticIntent.filters.region)) {
    console.log('[Semantic Query] Complex multi-condition CRM query detected:', semanticIntent);
    
    try {
      // Build base query for sub_accounts
      let baseQuery = supabase
        .from('sub_accounts')
        .select(`
          id,
          sub_account_name,
          assigned_employee,
          engagement_score,
          last_activity_at,
          account_id,
          accounts(
            id,
            account_name,
            state,
            city
          )
        `)
        .eq('is_active', true);
      
      // Apply role-based filtering
      if (userRole === 'employee') {
        baseQuery = baseQuery.eq('assigned_employee', userId);
      }
      
      // Apply region filter (check accounts.state or sub_accounts.state if exists)
      if (semanticIntent.filters.region) {
        // Try to filter by accounts.state first, fallback to sub_accounts if state field exists
        baseQuery = baseQuery.ilike('accounts.state', `%${semanticIntent.filters.region}%`);
      }
      
      // Apply silent days filter
      if (semanticIntent.filters.silentDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - semanticIntent.filters.silentDays);
        baseQuery = baseQuery.or(`last_activity_at.is.null,last_activity_at.lt.${cutoff.toISOString()}`);
      }
      
      // Execute base query
      const { data: subAccounts, error: baseError } = await baseQuery.limit(100);
      
      if (baseError) {
        throw new Error(`Failed to fetch sub-accounts: ${baseError.message}`);
      }
      
      // If minQuotes filter is present, we need to count quotations per sub_account
      let filteredSubAccounts = subAccounts || [];
      
      if (semanticIntent.filters.minQuotes) {
        // Count quotations for each sub_account
        const quotationCounts: Record<number, number> = {};
        
        // Query all quotation tables
        const tables = ['quotes_mbcb', 'quotes_signages', 'quotes_paint'];
        for (const table of tables) {
          const { data: quotes } = await supabase
            .from(table)
            .select('sub_account_id')
            .not('sub_account_id', 'is', null);
          
          if (quotes) {
            quotes.forEach((q: any) => {
              if (q.sub_account_id) {
                quotationCounts[q.sub_account_id] = (quotationCounts[q.sub_account_id] || 0) + 1;
              }
            });
          }
        }
        
        // Filter sub_accounts by minimum quotation count
        filteredSubAccounts = (subAccounts || []).filter((sa: any) => {
          const count = quotationCounts[sa.id] || 0;
          return count >= semanticIntent.filters!.minQuotes!;
        });
      }
      
      const count = filteredSubAccounts.length;
      console.log(`[Semantic Query] Multi-condition query returned ${count} sub-accounts`);
      
      // Format results
      let formatted = '';
      const conditions: string[] = [];
      if (semanticIntent.filters.region) {
        conditions.push(`in ${semanticIntent.filters.region}`);
      }
      if (semanticIntent.filters.minQuotes) {
        conditions.push(`with ${semanticIntent.filters.minQuotes}+ quotations`);
      }
      if (semanticIntent.filters.silentDays) {
        conditions.push(`silent for ${semanticIntent.filters.silentDays} days`);
      }
      
      const conditionStr = conditions.length > 0 ? ` (${conditions.join(', ')})` : '';
      
      if (count === 0) {
        formatted = `No sub-accounts found${conditionStr}.`;
      } else {
        formatted = `Found ${count} sub-account(s)${conditionStr}:`;
      }
      
      return {
        success: true,
        entity: 'subaccounts',
        operation: 'list',
        raw: {
          subAccountCount: count,
          filters: semanticIntent.filters,
          subAccounts: filteredSubAccounts.map((sa: any) => ({
            id: sa.id,
            name: sa.sub_account_name,
            assignedEmployee: sa.assigned_employee,
            engagementScore: sa.engagement_score,
            lastActivityAt: sa.last_activity_at,
            account: sa.accounts?.account_name,
            state: sa.accounts?.state,
            city: sa.accounts?.city,
          })),
        },
        formatted,
        count,
      };
    } catch (error: any) {
      console.error('[Semantic Query] Error in multi-condition query:', error);
      return {
        success: false,
        entity: 'subaccounts',
        operation: 'list',
        raw: null,
        formatted: `Error executing multi-condition query: ${error.message}`,
        message: error.message,
      };
    }
  }
  
  if (semanticIntent.entity === 'contacts' && semanticIntent.filterType === 'startsWith') {
    console.log('[Semantic Query] Contact name startsWith match detected');
    if (semanticIntent.filterValue) {
      return await runContactStartsWithQuery(supabase, semanticIntent.filterValue, userRole, userId);
    }
  }

  if (semanticIntent.entity === 'accounts' && semanticIntent.filterType === 'silentAccounts') {
    console.log('[Semantic Query] Detecting silent customers');
    try {
      const results = await detectSilentAccountsFallback(30);
      
      const count = results.length;
      let formatted = '';
      
      if (count === 0) {
        formatted = 'No silent accounts found. All accounts have recent activity.';
      } else {
        formatted = `Found ${count} silent account(s) (no activity in last 30 days):`;
      }

      return {
        success: true,
        entity: 'accounts',
        operation: 'list',
        raw: {
          accountCount: count,
          accounts: results.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            engagementScore: acc.engagement_score,
            lastActivityAt: acc.last_activity_at,
            accountId: acc.account_id,
          })),
        },
        formatted,
        count,
      };
    } catch (error: any) {
      console.error('[Semantic Query] Error detecting silent accounts:', error);
      return {
        success: false,
        entity: 'accounts',
        operation: 'list',
        raw: null,
        formatted: `Error detecting silent accounts: ${error.message}`,
        message: error.message,
      };
    }
  }

  // Handle slipping engagement queries
  if (semanticIntent.entity === 'accounts' && 
      (textQuery.toLowerCase().includes('slipping') || 
       textQuery.toLowerCase().includes('low engagement') ||
       textQuery.toLowerCase().includes('declining'))) {
    console.log('[Semantic Query] Detecting slipping engagement');
    try {
      const results = await detectSlippingEngagement(40);
      
      const count = results.length;
      let formatted = '';
      
      if (count === 0) {
        formatted = 'No accounts with slipping engagement found. All accounts have engagement scores above 40.';
      } else {
        formatted = `Found ${count} account(s) with slipping engagement (score < 40):`;
      }

      return {
        success: true,
        entity: 'accounts',
        operation: 'list',
        raw: {
          accountCount: count,
          accounts: results.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            engagementScore: acc.engagement_score,
          })),
        },
        formatted,
        count,
      };
    } catch (error: any) {
      console.error('[Semantic Query] Error detecting slipping engagement:', error);
      return {
        success: false,
        entity: 'accounts',
        operation: 'list',
        raw: null,
        formatted: `Error detecting slipping accounts: ${error.message}`,
        message: error.message,
      };
    }
  }

  // Continue with existing regex-based parsing
  const intent = parseQueryIntent(textQuery);
  console.log(`[QueryEngine] Parsed intent:`, JSON.stringify(intent, null, 2));

  // ============================================
  // Follow-up Resolution Layer
  // Resolves incomplete queries by finding missing IDs from names/keywords
  // ============================================
  
  /**
   * Search for sub-account by name (fuzzy match)
   */
  async function searchSubaccountByName(keyword: string): Promise<{ id: number; name: string } | null> {
    try {
      const supabaseClient = createSupabaseServerClient();
      let query = supabaseClient
        .from('sub_accounts')
        .select('id, sub_account_name')
        .eq('is_active', true)
        .ilike('sub_account_name', `%${keyword}%`)
        .limit(5);
      
      // Apply role-based filtering
      if (userRole === 'employee') {
        query = query.eq('assigned_employee', userId);
      }
      
      const { data, error } = await query;
      
      if (error || !data || data.length === 0) {
        return null;
      }
      
      // Try exact match first
      const exactMatch = data.find((sa: any) => 
        sa.sub_account_name.toLowerCase() === keyword.toLowerCase()
      );
      
      if (exactMatch) {
        console.log(`[QueryEngine] Found exact sub-account match: "${exactMatch.sub_account_name}" (ID: ${exactMatch.id})`);
        return { id: exactMatch.id, name: exactMatch.sub_account_name };
      }
      
      // Return first fuzzy match
      if (data.length > 0) {
        console.log(`[QueryEngine] Found fuzzy sub-account match: "${data[0].sub_account_name}" (ID: ${data[0].id})`);
        return { id: data[0].id, name: data[0].sub_account_name };
      }
      
      return null;
    } catch (error: any) {
      console.error('[QueryEngine] Error searching sub-account:', error);
      return null;
    }
  }
  
  // Resolve incomplete queries: if entity inferred but subAccountId missing, try to resolve from keyword
  if (intent.operation === 'list' && intent.entity === 'quotations' && !intent.filters.subAccountId && intent.filters.subaccountName) {
    console.log(`[QueryEngine] Resolving sub-account for quotations query: "${intent.filters.subaccountName}"`);
    const match = await searchSubaccountByName(intent.filters.subaccountName);
    if (match) {
      intent.filters.subAccountId = match.id;
      console.log(`[QueryEngine] Resolved sub-account "${intent.filters.subaccountName}" → ID: ${match.id}`);
    } else {
      console.log(`[QueryEngine] Could not resolve sub-account "${intent.filters.subaccountName}"`);
    }
  }

  try {
    let result: CRMQueryResult;
    
    switch (intent.entity) {
      case 'contacts':
        result = await queryContacts(supabase, intent, userRole, userId);
        break;
      case 'accounts':
        result = await queryAccounts(supabase, intent, userRole, userId);
        break;
      case 'subaccounts':
        result = await querySubAccounts(supabase, intent, userRole, userId);
        break;
      case 'followups':
        result = await queryFollowups(supabase, intent, userRole, userId);
        break;
      case 'activities':
        result = await queryActivities(supabase, intent, userRole, userId);
        break;
      case 'quotations':
        result = await queryQuotations(supabase, intent, userRole, userId);
        break;
      case 'leads':
        result = await queryLeads(supabase, intent, userRole, userId);
        break;
      case 'metrics':
        result = await queryMetrics(supabase, intent, userRole, userId);
        break;
      default:
        // Fallback to semantic inference
        console.log(`[QueryEngine] Unknown entity type, trying semantic inference`);
        const inferred = inferQueryIntent(textQuery);
        
        if (inferred.entityGuess) {
          console.log(`[QueryEngine] Inferred entity: "${inferred.entityGuess}", operation: "${inferred.operationGuess}"`);
          
          // Map inferred entity to QueryEntityType
          const inferredEntity = inferred.entityGuess as QueryEntityType | 'employees';
          
          // Create a basic intent from inference
          // Map 'top' operation to 'list' with smaller limit
          const mappedOperation: QueryIntent['operation'] = 
            inferred.operationGuess === 'unknown' ? 'list' :
            inferred.operationGuess === 'top' ? 'list' :
            inferred.operationGuess;
          
          const inferredIntent: QueryIntent = {
            entity: inferredEntity === 'employees' ? 'unknown' : inferredEntity,
            operation: mappedOperation,
            filters: {
              limit: inferred.operationGuess === 'top' ? 10 : 50,
              ...(inferred.filterGuess?.namePrefix && { 
                // Note: name prefix filtering would need to be implemented per entity
              }),
              ...(inferred.filterGuess?.dateFilter && { 
                dateRange: inferred.filterGuess.dateFilter 
              }),
              ...(inferred.filterGuess?.employeeName && { 
                employeeName: inferred.filterGuess.employeeName 
              }),
            },
            rawQuery: textQuery,
          };
          
          // Try to execute query with inferred intent
          try {
            let result: CRMQueryResult | undefined;
            
            switch (inferredEntity) {
              case 'contacts':
                result = await queryContacts(supabase, inferredIntent, userRole, userId);
                break;
              case 'accounts':
                result = await queryAccounts(supabase, inferredIntent, userRole, userId);
                break;
              case 'subaccounts':
                result = await querySubAccounts(supabase, inferredIntent, userRole, userId);
                break;
              case 'activities':
                result = await queryActivities(supabase, inferredIntent, userRole, userId);
                break;
              case 'quotations':
                result = await queryQuotations(supabase, inferredIntent, userRole, userId);
                break;
              case 'leads':
                result = await queryLeads(supabase, inferredIntent, userRole, userId);
                break;
              case 'employees':
              default:
                // Employees entity not directly queryable, provide helpful message
                if (inferredEntity === 'employees') {
                  result = {
                    success: false,
                    entity: 'unknown' as QueryEntityType,
                    operation: inferred.operationGuess,
                    raw: null,
                    formatted: `I understood you're asking about employees, but employee queries aren't directly supported. Try asking about accounts or sub-accounts assigned to specific employees instead.`,
                    message: 'Employees entity not directly queryable',
                  };
                }
                // Fall through to helpful suggestions for other unknown entities
                break;
            }
            
            if (result) {
              console.log(`[QueryEngine] Semantic inference succeeded`);
              return result;
            }
          } catch (inferenceError: any) {
            console.warn(`[QueryEngine] Semantic inference query failed:`, inferenceError.message);
            // Fall through to helpful suggestions
          }
        }
        
        // If inference didn't work, provide helpful suggestions
        console.log(`[QueryEngine] Semantic inference didn't help, providing suggestions`);
        return {
          success: false,
          entity: 'unknown',
          operation: intent.operation,
          raw: null,
          formatted: `I understood this as CRM intent but unclear entity — try specifying contacts/accounts/quotes/etc.

Try asking about:
• "Show my contacts" or "How many contacts do I have?"
• "List my accounts" or "What accounts are assigned to me?"
• "Show my sub-accounts" or "List sub-accounts"
• "What are my follow-ups?" or "Show follow-ups due today"
• "List my activities" or "Show recent activities"
• "What quotations do I have?" or "Show my pipeline value"
• "List my leads" or "Show active leads"

Or ask for coaching advice like:
• "How can I improve my performance?"
• "What should I focus on today?"
• "Give me tips to close more deals"`,
          message: 'Unknown entity type',
        };
    }
    
    console.log(`[QueryEngine] Query result: success=${result.success}, count=${result.count || 0}`);
    return result;
  } catch (error: any) {
    console.error('[QueryEngine] Error executing query:', error);
    console.error('[QueryEngine] Error stack:', error.stack);
    return {
      success: false,
      entity: intent.entity,
      operation: intent.operation,
      raw: null,
      formatted: `I encountered an error while fetching data: ${error.message}. Please try rephrasing your question or contact support if the issue persists.`,
      message: error.message,
    };
  }
}

// ============================================
// Semantic Query Helpers
// ============================================

/**
 * Run a contact query filtered by name prefix (starts with)
 */
async function runContactStartsWithQuery(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  prefix: string,
  userRole: 'admin' | 'employee',
  userId: string
): Promise<CRMQueryResult> {
  console.log(`[Semantic Query] Running contact startsWith query for prefix: "${prefix}"`);

  try {
    let query = supabase
      .from('contacts')
      .select(`
        id,
        name,
        designation,
        email,
        phone,
        call_status,
        follow_up_date,
        notes,
        created_at,
        sub_account_id,
        sub_accounts!inner(
          id,
          sub_account_name,
          assigned_employee,
          account_id,
          accounts(
            id,
            account_name
          )
        )
      `)
      .ilike('name', `${prefix}%`)
      .order('name', { ascending: true })
      .limit(50);

    // Apply role-based filtering
    if (userRole === 'employee') {
      query = query.eq('sub_accounts.assigned_employee', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch contacts: ${error.message}`);
    }

    const count = data?.length || 0;
    console.log(`[Semantic Query] Found ${count} contacts starting with "${prefix}"`);

    // Format results
    let formatted = '';
    if (count === 0) {
      formatted = `No contacts found starting with "${prefix}".`;
    } else {
      formatted = `Found ${count} contact(s) starting with "${prefix}":`;
    }

    return {
      success: true,
      entity: 'contacts',
      operation: 'list',
      raw: {
        prefix,
        contactCount: count,
        contacts: data?.map((c: any) => ({
          id: c.id,
          name: c.name,
          designation: c.designation,
          phone: c.phone,
          email: c.email,
          callStatus: c.call_status,
          followUpDate: c.follow_up_date,
          subAccount: c.sub_accounts?.sub_account_name,
          account: c.sub_accounts?.accounts?.account_name,
        })) || [],
      },
      formatted,
      count,
    };
  } catch (error: any) {
    console.error('[Semantic Query] Error in runContactStartsWithQuery:', error);
    return {
      success: false,
      entity: 'contacts',
      operation: 'list',
      raw: null,
      formatted: `Error fetching contacts starting with "${prefix}": ${error.message}`,
      message: error.message,
    };
  }
}

// ============================================
// Entity Query Functions
// ============================================

async function queryContacts(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  intent: QueryIntent,
  userRole: 'admin' | 'employee',
  userId: string
): Promise<CRMQueryResult> {
  const { filters, operation } = intent;

  // For count operations without specific filters, get exact total count
  const isCountQuery = operation === 'count' || intent.rawQuery.match(/how many|total|are there|only \d+/i);
  
  if (!filters.subaccountName && isCountQuery) {
    // Get total count with role-based filtering if needed
    let countQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });

    // For employees, we need to count only their contacts via sub_accounts
    if (userRole === 'employee') {
      // First get their sub_account IDs
      const { data: subAccounts } = await supabase
        .from('sub_accounts')
        .select('id')
        .eq('assigned_employee', userId);
      
      const subAccountIds = (subAccounts || []).map(sa => sa.id);
      
      if (subAccountIds.length === 0) {
        return {
          success: true,
          entity: 'contacts',
          operation,
          raw: { subaccount: null, contactCount: 0, contacts: [] },
          formatted: 'You have no contacts because no sub-accounts are assigned to you.',
          count: 0,
        };
      }
      
      countQuery = supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .in('sub_account_id', subAccountIds);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Failed to count contacts: ${countError.message}`);
    }

    console.log(`[QueryEngine] Total contacts count: ${totalCount}`);
    
    const roleContext = userRole === 'admin' ? 'in the entire database' : 'assigned to you';
    
    return {
      success: true,
      entity: 'contacts',
      operation: 'count',
      raw: {
        subaccount: null,
        contactCount: totalCount || 0,
        contacts: [],
      },
      formatted: `There are ${totalCount || 0} contacts ${roleContext}.`,
      count: totalCount || 0,
    };
  }

  // Build base query with optional joins
  // Use left join when we don't need to filter by subaccount
  const needsSubaccountFilter = filters.subaccountName || userRole === 'employee';
  
  let query = supabase
    .from('contacts')
    .select(`
      id,
      name,
      designation,
      email,
      phone,
      call_status,
      follow_up_date,
      notes,
      created_at,
      sub_account_id,
      sub_accounts${needsSubaccountFilter ? '!inner' : ''}(
        id,
        sub_account_name,
        assigned_employee,
        account_id,
        accounts(
          id,
          account_name
        )
      )
    `)
    .order('created_at', { ascending: false });

  // Apply role-based filtering
  if (userRole === 'employee') {
    query = query.eq('sub_accounts.assigned_employee', userId);
  }

  // Apply subaccount name filter (fuzzy search)
  if (filters.subaccountName) {
    query = query.ilike('sub_accounts.sub_account_name', `%${filters.subaccountName}%`);
  }

  // Apply limit
  query = query.limit(filters.limit || 50);

  const { data: contacts, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch contacts: ${error.message}`);
  }

  const count = contacts?.length || 0;
  console.log(`[QueryEngine] Contacts query: found ${count} contacts`);

  // Format results
  let formatted = '';
  if (count === 0) {
    if (filters.subaccountName) {
      formatted = `No contacts found for sub-account "${filters.subaccountName}". You may need to add contacts to this sub-account first.`;
    } else if (userRole === 'employee') {
      formatted = 'No contacts found in your assigned sub-accounts. You may need to add contacts to your sub-accounts first.';
    } else {
      formatted = 'No contacts found matching your criteria. The database may be empty or the filters may be too restrictive.';
    }
  } else {
    const contactList = (contacts || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      designation: c.designation || 'N/A',
      phone: c.phone || 'N/A',
      email: c.email || 'N/A',
      callStatus: c.call_status || 'N/A',
      followUpDate: c.follow_up_date || null,
      subAccount: c.sub_accounts?.sub_account_name || 'N/A',
      account: c.sub_accounts?.accounts?.account_name || 'N/A',
    }));

    if (operation === 'count') {
      formatted = filters.subaccountName
        ? `Found ${count} contact(s) for "${filters.subaccountName}".`
        : `Found ${count} contact(s) total.`;
    } else {
      formatted = filters.subaccountName
        ? `Found ${count} contact(s) for "${filters.subaccountName}":`
        : `Found ${count} contact(s):`;
    }
  }

  return {
    success: true,
    entity: 'contacts',
    operation,
    raw: {
      subaccount: filters.subaccountName || null,
      contactCount: count,
      contacts: contacts?.map((c: any) => ({
        id: c.id,
        name: c.name,
        designation: c.designation,
        phone: c.phone,
        email: c.email,
        callStatus: c.call_status,
        followUpDate: c.follow_up_date,
        subAccount: c.sub_accounts?.sub_account_name,
        account: c.sub_accounts?.accounts?.account_name,
      })) || [],
    },
    formatted,
    count,
  };
}

async function querySubAccounts(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  intent: QueryIntent,
  userRole: 'admin' | 'employee',
  userId: string
): Promise<CRMQueryResult> {
  const { filters, operation } = intent;

  let query = supabase
    .from('sub_accounts')
    .select(`
      id,
      sub_account_name,
      assigned_employee,
      engagement_score,
      is_active,
      created_at,
      account_id,
      accounts!inner(
        id,
        account_name,
        company_stage,
        company_tag
      )
    `)
    .eq('is_active', true)
    .order('engagement_score', { ascending: false });

  // Role-based filtering
  if (userRole === 'employee') {
    query = query.eq('assigned_employee', userId);
  }

  // Filter by subaccount name
  if (filters.subaccountName) {
    query = query.ilike('sub_account_name', `%${filters.subaccountName}%`);
  }

  // Filter by account name
  if (filters.accountName) {
    query = query.ilike('accounts.account_name', `%${filters.accountName}%`);
  }

  query = query.limit(filters.limit || 50);

  const { data: subAccounts, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch sub-accounts: ${error.message}`);
  }

  const count = subAccounts?.length || 0;
  console.log(`[QueryEngine] SubAccounts query: found ${count} sub-accounts`);

  let formatted = '';
  if (count === 0) {
    if (filters.subaccountName) {
      formatted = `No sub-account found matching "${filters.subaccountName}". Try checking the exact spelling or ask "list all sub-accounts" to see available ones.`;
    } else if (userRole === 'employee') {
      formatted = 'No sub-accounts are currently assigned to you. Contact your administrator to get sub-accounts assigned.';
    } else {
      formatted = 'No sub-accounts found in the database. The database may be empty.';
    }
  } else {
    if (operation === 'count') {
      formatted = `Found ${count} sub-account(s).`;
    } else {
      formatted = `Found ${count} sub-account(s):`;
    }
  }

  return {
    success: true,
    entity: 'subaccounts',
    operation,
    raw: {
      subAccountCount: count,
      subAccounts: subAccounts?.map((sa: any) => ({
        id: sa.id,
        name: sa.sub_account_name,
        assignedEmployee: sa.assigned_employee,
        engagementScore: sa.engagement_score,
        account: sa.accounts?.account_name,
        companyStage: sa.accounts?.company_stage,
        companyTag: sa.accounts?.company_tag,
      })) || [],
    },
    formatted,
    count,
  };
}

async function queryAccounts(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  intent: QueryIntent,
  userRole: 'admin' | 'employee',
  userId: string
): Promise<CRMQueryResult> {
  const { filters, operation } = intent;

  // For employees, we need to get accounts via sub_accounts assignment
  if (userRole === 'employee') {
    const { data: subAccounts, error: subError } = await supabase
      .from('sub_accounts')
      .select('account_id')
      .eq('assigned_employee', userId)
      .eq('is_active', true);

    if (subError) {
      throw new Error(`Failed to fetch accounts: ${subError.message}`);
    }

    const accountIds = [...new Set((subAccounts || []).map(sa => sa.account_id))];

    if (accountIds.length === 0) {
      return {
        success: true,
        entity: 'accounts',
        operation,
        raw: { accountCount: 0, accounts: [] },
        formatted: 'You have no accounts assigned.',
        count: 0,
      };
    }

    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .in('id', accountIds)
      .eq('is_active', true)
      .order('engagement_score', { ascending: false })
      .limit(filters.limit || 50);

    if (error) {
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }

    return formatAccountResult(accounts || [], operation, filters);
  }

  // Admin query
  let query = supabase
    .from('accounts')
    .select('*')
    .eq('is_active', true)
    .order('engagement_score', { ascending: false });

  if (filters.accountName) {
    query = query.ilike('account_name', `%${filters.accountName}%`);
  }

  query = query.limit(filters.limit || 50);

  const { data: accounts, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch accounts: ${error.message}`);
  }

  return formatAccountResult(accounts || [], operation, filters);
}

function formatAccountResult(accounts: any[], operation: string, filters: any): CRMQueryResult {
  const count = accounts.length;

  let formatted = '';
  if (count === 0) {
    formatted = filters.accountName
      ? `No account found matching "${filters.accountName}".`
      : 'No accounts found matching your criteria.';
  } else {
    if (operation === 'count') {
      formatted = `Found ${count} account(s).`;
    } else {
      formatted = `Found ${count} account(s):`;
    }
  }

  return {
    success: true,
    entity: 'accounts',
    operation,
    raw: {
      accountCount: count,
      accounts: accounts.map(a => ({
        id: a.id,
        name: a.account_name,
        companyStage: a.company_stage,
        companyTag: a.company_tag,
        engagementScore: a.engagement_score,
        contactPerson: a.contact_person,
        phone: a.phone,
        email: a.email,
      })),
    },
    formatted,
    count,
  };
}

async function queryFollowups(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  intent: QueryIntent,
  userRole: 'admin' | 'employee',
  userId: string
): Promise<CRMQueryResult> {
  const { filters, operation } = intent;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Query contacts with follow-up dates
  let query = supabase
    .from('contacts')
    .select(`
      id,
      name,
      phone,
      follow_up_date,
      call_status,
      sub_accounts!inner(
        id,
        sub_account_name,
        assigned_employee,
        accounts!inner(
          account_name
        )
      )
    `)
    .not('follow_up_date', 'is', null)
    .order('follow_up_date', { ascending: true });

  // Role-based filtering
  if (userRole === 'employee') {
    query = query.eq('sub_accounts.assigned_employee', userId);
  }

  // Date filter for due/overdue
  if (filters.dateRange?.start) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    query = query.lte('follow_up_date', tomorrow.toISOString());
  }

  query = query.limit(filters.limit || 50);

  const { data: followups, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch follow-ups: ${error.message}`);
  }

  // Categorize follow-ups
  const today = now.toISOString().split('T')[0];
  const overdue: any[] = [];
  const dueToday: any[] = [];
  const upcoming: any[] = [];

  (followups || []).forEach((f: any) => {
    const fDate = new Date(f.follow_up_date).toISOString().split('T')[0];
    const formatted = {
      id: f.id,
      contactName: f.name,
      phone: f.phone,
      followUpDate: f.follow_up_date,
      callStatus: f.call_status,
      subAccount: f.sub_accounts?.sub_account_name,
      account: f.sub_accounts?.accounts?.account_name,
    };

    if (fDate < today) {
      overdue.push(formatted);
    } else if (fDate === today) {
      dueToday.push(formatted);
    } else {
      upcoming.push(formatted);
    }
  });

  const count = followups?.length || 0;
  console.log(`[QueryEngine] Followups query: found ${count} follow-ups`);

  let formatted = '';
  if (count === 0) {
    if (userRole === 'employee') {
      formatted = 'No follow-ups scheduled for your contacts. You can schedule follow-ups by updating contact records.';
    } else {
      formatted = 'No follow-ups scheduled in the system.';
    }
  } else {
    formatted = `Found ${count} follow-up(s): ${overdue.length} overdue, ${dueToday.length} due today, ${upcoming.length} upcoming.`;
  }

  return {
    success: true,
    entity: 'followups',
    operation,
    raw: {
      totalFollowups: count,
      overdue,
      dueToday,
      upcoming,
    },
    formatted,
    count,
  };
}

async function queryActivities(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  intent: QueryIntent,
  userRole: 'admin' | 'employee',
  userId: string
): Promise<CRMQueryResult> {
  const { filters, operation } = intent;

  let query = supabase
    .from('activities')
    .select(`
      id,
      activity_type,
      description,
      created_at,
      employee_id,
      account_id,
      sub_account_id,
      accounts(account_name),
      sub_accounts(sub_account_name)
    `)
    .order('created_at', { ascending: false });

  // Role-based filtering
  if (userRole === 'employee') {
    query = query.eq('employee_id', userId);
  }

  // Date filter
  if (filters.dateRange?.start) {
    query = query.gte('created_at', filters.dateRange.start);
  }

  query = query.limit(filters.limit || 50);

  const { data: activities, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch activities: ${error.message}`);
  }

  // Count by type
  const breakdown: Record<string, number> = {};
  (activities || []).forEach((a: any) => {
    breakdown[a.activity_type] = (breakdown[a.activity_type] || 0) + 1;
  });

  const count = activities?.length || 0;
  console.log(`[QueryEngine] Activities query: found ${count} activities`);

  let formatted = '';
  if (count === 0) {
    if (filters.dateRange?.start) {
      formatted = `No activities found for the specified time period. Try asking "show all activities" or "list my activities" without a date filter.`;
    } else if (userRole === 'employee') {
      formatted = 'No activities found in your account. Start logging activities to track your work!';
    } else {
      formatted = 'No activities found in the system.';
    }
  } else {
    const breakdownStr = Object.entries(breakdown)
      .map(([type, cnt]) => `${type}: ${cnt}`)
      .join(', ');
    formatted = `Found ${count} activity(ies). Breakdown: ${breakdownStr}`;
  }

  return {
    success: true,
    entity: 'activities',
    operation,
    raw: {
      totalActivities: count,
      breakdown,
      activities: activities?.map((a: any) => ({
        id: a.id,
        type: a.activity_type,
        description: a.description,
        createdAt: a.created_at,
        employee: a.employee_id,
        account: (a.accounts as any)?.account_name,
        subAccount: (a.sub_accounts as any)?.sub_account_name,
      })) || [],
    },
    formatted,
    count,
  };
}

async function queryQuotations(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  intent: QueryIntent,
  userRole: 'admin' | 'employee',
  userId: string
): Promise<CRMQueryResult> {
  const { filters, operation } = intent;

  // Query all quotation tables
  const tables = ['quotes_mbcb', 'quotes_signages', 'quotes_paint'];
  let allQuotations: any[] = [];
  let totalValue = 0;
  let resolvedSubAccountName: string | null = null;

  // If subAccountId was resolved, fetch the sub-account name for better error messages
  if (filters.subAccountId) {
    const { data: subAccount } = await supabase
      .from('sub_accounts')
      .select('sub_account_name')
      .eq('id', filters.subAccountId)
      .single();
    
    if (subAccount) {
      resolvedSubAccountName = subAccount.sub_account_name;
    }
  }

  for (const table of tables) {
    let query = supabase
      .from(table)
      .select(`
        id,
        section,
        customer_name,
        final_total_cost,
        status,
        created_at,
        created_by,
        sub_account_id,
        sub_accounts(sub_account_name)
      `)
      .order('created_at', { ascending: false });

    // Role-based filtering
    if (userRole === 'employee') {
      query = query.eq('created_by', userId);
    }

    // Filter by resolved sub-account ID
    if (filters.subAccountId) {
      query = query.eq('sub_account_id', filters.subAccountId);
    }

    // Date filter
    if (filters.dateRange?.start) {
      query = query.gte('created_at', filters.dateRange.start);
    }

    const { data, error } = await query.limit(20);

    if (!error && data) {
      const mapped = data.map((q: any) => ({
        id: q.id,
        type: table.replace('quotes_', '').toUpperCase(),
        section: q.section,
        customerName: q.customer_name,
        value: q.final_total_cost || 0,
        status: q.status,
        createdAt: q.created_at,
        createdBy: q.created_by,
        subAccount: (q.sub_accounts as any)?.sub_account_name,
      }));
      allQuotations = [...allQuotations, ...mapped];
      totalValue += data.reduce((sum: number, q: any) => sum + (q.final_total_cost || 0), 0);
    }
  }

  // Sort by date
  allQuotations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  allQuotations = allQuotations.slice(0, filters.limit || 50);

  const count = allQuotations.length;
  console.log(`[QueryEngine] Quotations query: found ${count} quotations, total value: ₹${totalValue.toLocaleString('en-IN')}`);

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  allQuotations.forEach(q => {
    statusBreakdown[q.status || 'draft'] = (statusBreakdown[q.status || 'draft'] || 0) + 1;
  });

  let formatted = '';
  if (count === 0) {
    // Provide specific message if sub-account was resolved but no quotations found
    if (resolvedSubAccountName) {
      formatted = `${resolvedSubAccountName} exists but 0 quotations found.`;
    } else if (filters.subaccountName) {
      formatted = `No quotations found for "${filters.subaccountName}". The sub-account may not exist or has no quotations.`;
    } else if (userRole === 'employee') {
      formatted = 'No quotations found in your account. Create quotations using the price engine to build your pipeline!';
    } else {
      formatted = 'No quotations found in the system.';
    }
  } else {
    const subAccountContext = resolvedSubAccountName ? ` for ${resolvedSubAccountName}` : '';
    formatted = `Found ${count} quotation(s)${subAccountContext} with total pipeline value of ₹${totalValue.toLocaleString('en-IN')}.`;
  }

  return {
    success: true,
    entity: 'quotations',
    operation,
    raw: {
      totalQuotations: count,
      totalPipelineValue: totalValue,
      statusBreakdown,
      quotations: allQuotations,
    },
    formatted,
    count,
  };
}

async function queryLeads(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  intent: QueryIntent,
  userRole: 'admin' | 'employee',
  userId: string
): Promise<CRMQueryResult> {
  const { filters, operation } = intent;

  let query = supabase
    .from('leads')
    .select(`
      id,
      lead_name,
      contact_person,
      phone,
      email,
      status,
      lead_source,
      assigned_employee,
      created_at
    `)
    .order('created_at', { ascending: false });

  // Role-based filtering
  if (userRole === 'employee') {
    query = query.eq('assigned_employee', userId);
  }

  // Status filter
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  query = query.limit(filters.limit || 50);

  const { data: leads, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch leads: ${error.message}`);
  }

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  (leads || []).forEach((l: any) => {
    statusBreakdown[l.status || 'New'] = (statusBreakdown[l.status || 'New'] || 0) + 1;
  });

  const count = leads?.length || 0;
  console.log(`[QueryEngine] Leads query: found ${count} leads`);

  let formatted = '';
  if (count === 0) {
    if (userRole === 'employee') {
      formatted = 'No leads found in your account. Add leads to start tracking potential opportunities!';
    } else {
      formatted = 'No leads found in the system.';
    }
  } else {
    const statusStr = Object.entries(statusBreakdown)
      .map(([status, cnt]) => `${status}: ${cnt}`)
      .join(', ');
    formatted = `Found ${count} lead(s). Status breakdown: ${statusStr}`;
  }

  return {
    success: true,
    entity: 'leads',
    operation,
    raw: {
      totalLeads: count,
      statusBreakdown,
      leads: leads?.map((l: any) => ({
        id: l.id,
        name: l.lead_name,
        contactPerson: l.contact_person,
        phone: l.phone,
        email: l.email,
        status: l.status,
        source: l.lead_source,
        assignedEmployee: l.assigned_employee,
        createdAt: l.created_at,
      })) || [],
    },
    formatted,
    count,
  };
}

async function queryMetrics(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  intent: QueryIntent,
  userRole: 'admin' | 'employee',
  userId: string
): Promise<CRMQueryResult> {
  const { filters } = intent;

  // Get engagement scores for subaccounts
  let query = supabase
    .from('sub_accounts')
    .select('engagement_score, assigned_employee')
    .eq('is_active', true);

  if (userRole === 'employee') {
    query = query.eq('assigned_employee', userId);
  }

  if (filters.subaccountName) {
    query = query.ilike('sub_account_name', `%${filters.subaccountName}%`);
  }

  const { data: subAccounts, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch metrics: ${error.message}`);
  }

  const scores = (subAccounts || []).map((sa: any) => sa.engagement_score || 0);
  const avgScore = scores.length > 0 
    ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length 
    : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;

  const formatted = `Engagement Metrics: Average score: ${avgScore.toFixed(1)}, Range: ${minScore} - ${maxScore}, Total sub-accounts: ${scores.length}`;

  return {
    success: true,
    entity: 'metrics',
    operation: 'aggregate',
    raw: {
      totalSubAccounts: scores.length,
      averageEngagementScore: avgScore,
      maxEngagementScore: maxScore,
      minEngagementScore: minScore,
    },
    formatted,
    count: scores.length,
  };
}
