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
  count: [/how many/i, /count/i, /number of/i, /total/i],
  list: [/list/i, /show/i, /get/i, /find/i, /all/i, /which/i, /who/i],
  aggregate: [/total/i, /average/i, /sum/i, /pipeline/i, /value/i],
  search: [/search/i, /find/i, /look for/i],
  get: [/what is/i, /what's/i, /tell me about/i, /details/i, /info/i],
};

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
  const subaccountPatterns = [
    /(?:for|under|of|in)\s+["']?([A-Za-z][A-Za-z0-9\s\-_.]+?)["']?(?:\s|$|\?|,)/i,
    /does\s+["']?([A-Za-z][A-Za-z0-9\s\-_.]+?)["']?\s+have/i,
    /["']?([A-Za-z][A-Za-z0-9\s\-_.]+?)["']?\s+(?:has|have)/i,
    /(?:subaccount|sub-account|sub account)\s+["']?([A-Za-z][A-Za-z0-9\s\-_.]+?)["']?/i,
  ];

  for (const pattern of subaccountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Filter out common words that aren't names
      const excludeWords = ['the', 'this', 'that', 'my', 'your', 'our', 'all', 'any', 'some', 'today', 'week', 'month'];
      if (!excludeWords.includes(name.toLowerCase()) && name.length > 1) {
        filters.subaccountName = name;
        break;
      }
    }
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
  
  const intent = parseQueryIntent(textQuery);
  console.log(`[QueryEngine] Parsed intent:`, JSON.stringify(intent, null, 2));

  // Validate Supabase connection
  let supabase;
  try {
    supabase = createSupabaseServerClient();
    console.log(`[QueryEngine] Supabase client created successfully`);
  } catch (error: any) {
    console.error('[QueryEngine] Failed to create Supabase client:', error);
    return {
      success: false,
      entity: intent.entity,
      operation: intent.operation,
      raw: null,
      formatted: 'Database connection error. Please check your configuration.',
      message: error.message,
    };
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
        console.log(`[QueryEngine] Unknown entity type, providing helpful suggestions`);
        return {
          success: false,
          entity: 'unknown',
          operation: intent.operation,
          raw: null,
          formatted: `I couldn't understand what CRM data you're looking for. 

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
// Entity Query Functions
// ============================================

async function queryContacts(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  intent: QueryIntent,
  userRole: 'admin' | 'employee',
  userId: string
): Promise<CRMQueryResult> {
  const { filters, operation } = intent;

  // Build base query
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
        accounts!inner(
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
    if (userRole === 'employee') {
      formatted = 'No quotations found in your account. Create quotations using the price engine to build your pipeline!';
    } else {
      formatted = 'No quotations found in the system.';
    }
  } else {
    formatted = `Found ${count} quotation(s) with total pipeline value of ₹${totalValue.toLocaleString('en-IN')}.`;
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
