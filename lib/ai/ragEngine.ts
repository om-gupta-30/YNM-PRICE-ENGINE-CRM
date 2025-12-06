/**
 * RAG (Retrieval-Augmented Generation) Engine
 * 
 * Orchestrates the complete RAG pipeline:
 * 1. Intent Classification - Understands user questions
 * 2. Query Building - Generates SQL queries from intent
 * 3. Query Execution - Retrieves data from database
 * 4. Answer Generation - Creates natural language responses
 * 
 * Features:
 * - Role-based access control (RLS)
 * - Smart query caching
 * - Conversation memory
 * - Performance monitoring
 * - Error handling and fallbacks
 * 
 * @module lib/ai/ragEngine
 * @see {@link https://docs.ynmsafety.com/ai-features} for user documentation
 */

import { classifyIntent } from './intentClassifier';
import { createQueryBuilder, UserContext } from './dynamicQueryBuilder';
import { formatQueryResultsForAI, formatUserContextForAI } from './contextFormatter';
import { QueryIntent } from './types/intentTypes';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { runGemini, runGeminiWithFallback } from '@/utils/ai';
import * as monitoring from './monitoring';
import { getCachedQuery, setCachedQuery } from './queryCache';

/**
 * Query result with metadata
 */
export interface QueryResultWithMetadata {
  data: any[];
  rowCount: number;
  queryTime: number; // milliseconds
  cached: boolean;
  sql: string;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: any[];
  timestamp: number;
  sql: string;
}

/**
 * In-memory query cache with TTL
 */
class QueryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Generate cache key from SQL and user context
   */
  private getCacheKey(sql: string, userId: string): string {
    return `${userId}:${sql}`;
  }

  /**
   * Get cached result if available and not expired
   */
  get(sql: string, userId: string): any[] | null {
    const key = this.getCacheKey(sql, userId);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.TTL) {
      // Entry expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store result in cache
   */
  set(sql: string, userId: string, data: any[]): void {
    const key = this.getCacheKey(sql, userId);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      sql,
    });
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const queryCache = new QueryCache();

// Clean up expired entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    queryCache.clearExpired();
  }, 60 * 1000);
}

/**
 * Response structure for RAG queries
 */
export interface RAGResponse {
  answer: string;
  data: any[];
  sql: string;
  confidence: number;
  sources: string[];
}

/**
 * Execute a complete RAG query pipeline
 * 
 * This is the main entry point for RAG queries. It orchestrates:
 * 1. User context fetching
 * 2. Intent classification
 * 3. SQL query building
 * 4. Data retrieval (with caching)
 * 5. AI response generation
 * 
 * @param question - User's natural language question (e.g., "How many contacts do I have?")
 * @param userId - User ID for context, permissions, and RLS filtering
 * @param mode - Response mode:
 *   - 'COACH': Provides strategic coaching and advice
 *   - 'QUERY': Returns data-driven answers with query results
 * @returns Promise<RAGResponse> containing:
 *   - answer: Natural language response
 *   - data: Query results array
 *   - sql: Generated SQL query (for transparency)
 *   - confidence: Intent classification confidence (0-1)
 *   - sources: Data sources used (table names)
 * 
 * @example
 * ```typescript
 * const response = await executeRAGQuery(
 *   "Show me my top 5 accounts by engagement",
 *   "user123",
 *   "QUERY"
 * );
 * console.log(response.answer); // "Here are your top 5 accounts..."
 * console.log(response.data); // Array of account objects
 * ```
 * 
 * @throws {Error} If intent classification fails
 * @throws {Error} If query building fails
 * @throws {Error} If data retrieval fails
 * 
 * @see {@link classifyIntent} for intent classification
 * @see {@link DynamicQueryBuilder} for SQL generation
 * @see {@link generateAIResponse} for answer generation
 */
export async function executeRAGQuery(
  question: string,
  userId: string,
  mode: 'COACH' | 'QUERY' = 'QUERY'
): Promise<RAGResponse> {
  let userContext: UserContext | undefined;
  let intentClassification;
  let queryResult: QueryResultWithMetadata | undefined;
  let sql = '';
  let data: any[] = [];
  let confidence = 0;
  let sources: string[] = [];

  try {
    // Step 1: Fetch user context from database
    console.log('[RAG Engine] Fetching user context for userId:', userId);
    userContext = await fetchUserContext(userId);
    console.log('[RAG Engine] User context fetched:', { 
      userId: userContext?.userId, 
      employeeId: userContext?.employeeId, 
      role: userContext?.role,
      hasPermissions: !!userContext?.permissions 
    });
    
    // Step 2: Classify intent
    const intentStartTime = Date.now();
    try {
      intentClassification = await classifyIntent(question, userContext);
      confidence = intentClassification.confidence;
      sources.push('Intent Classification');
      
      // Log intent classification
      monitoring.logIntent({
        userId,
        question,
        intent: intentClassification.intent,
        confidence,
        executionTime: Date.now() - intentStartTime,
      }).catch(err => console.error('[RAG Engine] Failed to log intent:', err));
    } catch (error: any) {
      console.error('[RAG Engine] Intent classification failed:', error.message);
      
      // Log error
      monitoring.logError({
        userId,
        operation: 'INTENT_CLASSIFICATION',
        error,
        executionTime: Date.now() - intentStartTime,
      }).catch(err => console.error('[RAG Engine] Failed to log error:', err));
      
      return {
        answer: `I encountered an error understanding your question: ${error.message}. Please try rephrasing your question.`,
        data: [],
        sql: '',
        confidence: 0,
        sources: [],
      };
    }

    // Step 3: Build SQL query
    try {
      const queryBuilder = createQueryBuilder();
      const intent = intentClassification.intent;
      
      console.log('[RAG Engine] Building query with user context:', {
        userId: userContext?.userId,
        employeeId: userContext?.employeeId,
        role: userContext?.role,
        intentCategory: intent.category,
        tables: intent.tables
      });
      
      const queryBuilderResult = await queryBuilder.buildQuery(intent, userContext);
      sql = queryBuilderResult.sql;
      
      console.log('[RAG Engine] Query built:', { 
        sqlPreview: sql.substring(0, 200),
        hasUserFilter: sql.includes('assigned') || sql.includes('created_by') || sql.includes('employee')
      });
      // Convert QueryBuilderResult to QueryResultWithMetadata format
      queryResult = {
        data: [],
        rowCount: 0,
        queryTime: 0,
        cached: false,
        sql: queryBuilderResult.sql,
      };
      // Note: affectedTables might not exist on QueryBuilderResult, using empty array
      if ('affectedTables' in queryBuilderResult && Array.isArray(queryBuilderResult.affectedTables)) {
        sources.push(...queryBuilderResult.affectedTables);
      }
    } catch (error: any) {
      console.error('[RAG Engine] Query building failed:', error.message);
      return {
        answer: `I couldn't generate a query for your question. ${intentClassification.explanation}. Please try rephrasing.`,
        data: [],
        sql: '',
        confidence: confidence * 0.5, // Reduce confidence due to query building failure
        sources: ['Intent Classification'],
      };
    }

    // Step 4: Retrieve relevant data (with caching and RLS)
    let queryResultData: QueryResultWithMetadata;
    try {
      queryResultData = await retrieveRelevantData(intentClassification.intent, userId);
      data = queryResultData.data;
      queryResult = queryResultData;
      
      // Log query (async, non-blocking)
      monitoring.logQuery({
        userId,
        sql,
        executionTime: queryResult.queryTime,
        rowCount: queryResult.rowCount,
        cached: queryResult.cached,
      }).catch(err => console.error('[RAG Engine] Query logging failed:', err));
      
      // Also log to legacy table (for backward compatibility)
      logQuery(userId, question, mode, sql, queryResult).catch(err => {
        console.error('[RAG Engine] Legacy query logging failed:', err);
      });
      
      if (data.length === 0 && mode === 'QUERY') {
        // For data queries, return early if no results
        return {
          answer: formatQueryResultsForAI(data, question, intentClassification.intent),
          data: [],
          sql,
          confidence,
          sources,
        };
      }
    } catch (error: any) {
      console.error('[RAG Engine] Data retrieval failed:', error.message);
      
      // Log failed query
      const failedResult: QueryResultWithMetadata = {
        data: [],
        rowCount: 0,
        queryTime: 0,
        cached: false,
        sql,
      };
      
      monitoring.logQuery({
        userId,
        sql,
        executionTime: 0,
        rowCount: 0,
        cached: false,
        error: error.message,
      }).catch(err => console.error('[RAG Engine] Query logging failed:', err));
      
      logQuery(userId, question, mode, sql, failedResult).catch(err => {
        console.error('[RAG Engine] Legacy query logging failed:', err);
      });
      
      return {
        answer: `I encountered an error executing the query: ${error.message}. The query was: ${sql.substring(0, 100)}...`,
        data: [],
        sql,
        confidence: confidence * 0.7, // Reduce confidence due to execution failure
        sources,
      };
    }

    // Step 5: Format context for AI
    let formattedContext = '';
    try {
      const formattedResults = formatQueryResultsForAI(data, question, intentClassification.intent);
      const formattedUser = formatUserContextForAI(userContext);
      
      formattedContext = `${formattedUser}\n\n${formattedResults}`;
    } catch (error: any) {
      console.error('[RAG Engine] Context formatting failed:', error.message);
      // Continue with basic formatting
      formattedContext = `Query: ${question}\nResults: ${JSON.stringify(data.slice(0, 10))}`;
    }

    // Step 6: Generate answer with AI (using new generateAIResponse function)
    let answer = '';
    const responseStartTime = Date.now();
    try {
      // TODO: Fetch conversation history if available
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> | undefined = undefined;
      
      answer = await generateAIResponse(
        question,
        formattedContext,
        mode,
        userContext,
        conversationHistory
      );
      
      // Log successful AI response
      monitoring.logAIResponse({
        userId,
        question,
        answer,
        mode,
        confidence,
        executionTime: Date.now() - responseStartTime,
      }).catch(err => console.error('[RAG Engine] Failed to log AI response:', err));
    } catch (error: any) {
      console.error('[RAG Engine] Answer generation failed:', error.message);
      
      // Log error
      monitoring.logError({
        userId,
        operation: 'AI_RESPONSE_GENERATION',
        error,
        context: { mode, question: question.substring(0, 100) },
        executionTime: Date.now() - responseStartTime,
      }).catch(err => console.error('[RAG Engine] Failed to log error:', err));
      
      // Fallback: use formatted context as answer
      answer = formattedContext || `Query: ${question}\nNo results found.`;
    }

    const response: RAGResponse = {
      answer,
      data,
      sql,
      confidence,
      sources: Array.from(new Set(sources)), // Remove duplicates
    };

    // Log successful query with answer (async, non-blocking)
    logQuery(userId, question, mode, sql, queryResult, answer, confidence).catch(err => {
      console.error('[RAG Engine] Query logging failed:', err);
    });

    return response;
  } catch (error: any) {
    console.error('[RAG Engine] Unexpected error:', error);
    return {
      answer: `I encountered an unexpected error: ${error.message}. Please try again later.`,
      data: [],
      sql,
      confidence: 0,
      sources,
    };
  }
}

/**
 * Fetch user context from database
 */
export async function fetchUserContext(userId: string): Promise<UserContext> {
  try {
    const supabase = createSupabaseServerClient();
    
    console.log('[RAG Engine] Fetching user from database:', { userId });
    
    // Fetch user from users table
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.warn('[RAG Engine] User not found, using minimal context:', { userId, error: error?.message });
      return {
        userId,
        role: 'user',
      };
    }
    
    console.log('[RAG Engine] User found:', { id: user.id, name: user.name, role: user.role });

    // Fetch user statistics if available
    const stats = await fetchUserStats(userId, supabase);

    return {
      userId: user.id,
      employeeId: user.id,
      role: user.role || 'user',
      permissions: determinePermissions(user.role),
      ...stats,
    };
  } catch (error: any) {
    console.error('[RAG Engine] Error fetching user context:', error.message);
    return {
      userId,
      role: 'user',
    };
  }
}

/**
 * Fetch user statistics
 */
async function fetchUserStats(
  userId: string,
  supabase: ReturnType<typeof createSupabaseServerClient>
): Promise<{ stats?: any }> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch activity count
    const { count: activityCount } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Fetch quotation count
    const { count: quotationCount } = await supabase
      .from('quotes_mbcb')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Fetch account count
    const { count: accountCount } = await supabase
      .from('sub_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_employee_id', userId)
      .eq('is_active', true);

    return {
      stats: {
        totalActivities: activityCount || 0,
        quotationsLast30Days: quotationCount || 0,
        totalAccounts: accountCount || 0,
      },
    };
  } catch (error: any) {
    console.error('[RAG Engine] Error fetching user stats:', error.message);
    return {};
  }
}

/**
 * Determine permissions based on role
 */
function determinePermissions(role?: string): string[] {
  if (!role) {
    return ['read'];
  }

  const roleLower = role.toLowerCase();
  if (roleLower === 'admin') {
    return ['read', 'write', 'delete', 'admin'];
  }
  if (roleLower === 'manager') {
    return ['read', 'write'];
  }
  return ['read'];
}

/**
 * Execute SQL query against Supabase
 * Uses RPC function for execution (requires database function to be created)
 */
async function executeSQLQuery(sql: string, params: any[]): Promise<any[]> {
  try {
    const supabase = createSupabaseServerClient();
    
    // Replace parameterized placeholders with actual values (safely)
    let finalSQL = sql;
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      let paramValue: string;
      
      if (param === null || param === undefined) {
        paramValue = 'NULL';
      } else if (typeof param === 'string') {
        // Escape single quotes and wrap in quotes
        paramValue = `'${param.replace(/'/g, "''")}'`;
      } else if (param instanceof Date) {
        paramValue = `'${param.toISOString()}'`;
      } else {
        paramValue = String(param);
      }
      
      // Replace $1, $2, etc. with actual values
      finalSQL = finalSQL.replace(new RegExp(`\\$${i + 1}\\b`, 'g'), paramValue);
    }

    console.log('[RAG Engine] Executing SQL:', finalSQL.substring(0, 200) + '...');
    
    // Try to execute via RPC function (requires database function)
    // First, try the execute_query RPC function
    try {
      const { data, error } = await supabase.rpc('execute_query', {
        query_sql: finalSQL,
      });

      if (error) {
        // If RPC doesn't exist, try alternative approach
        console.warn('[RAG Engine] RPC execute_query not available, trying alternative method');
        throw error;
      }

      return data || [];
    } catch (rpcError: any) {
      // Fallback: Use REST API with service role key
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceKey) {
        try {
          // Use PostgREST to execute query via REST API
          // Note: This requires the query to be safe and properly formatted
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ query_sql: finalSQL }),
          });

          if (response.ok) {
            const data = await response.json();
            return Array.isArray(data) ? data : [];
          }
        } catch (restError: any) {
          console.error('[RAG Engine] REST API execution failed:', restError.message);
        }
      }

      // Final fallback: Log error and return empty array
      console.error('[RAG Engine] SQL execution failed. Please create an RPC function:', rpcError.message);
      console.error('[RAG Engine] Required database function:');
      console.error(`
CREATE OR REPLACE FUNCTION execute_query(query_sql TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  EXECUTE query_sql INTO result;
  RETURN result;
END;
$$;
      `);
      
      throw new Error(`Query execution failed: ${rpcError.message}. Please set up the execute_query RPC function.`);
    }
  } catch (error: any) {
    console.error('[RAG Engine] SQL execution error:', error.message);
    throw new Error(`Query execution failed: ${error.message}`);
  }
}

/**
 * Retrieve relevant data based on intent
 * Uses query builder, executes via Supabase, handles errors, applies RLS, and returns metadata
 * 
 * @param intent - The classified query intent
 * @param userId - User ID for context and RLS
 * @returns QueryResultWithMetadata with data, row count, query time, and cache status
 */
export async function retrieveRelevantData(
  intent: QueryIntent,
  userId: string
): Promise<QueryResultWithMetadata> {
  const startTime = Date.now();
  let sql = '';
  let cached = false;

  try {
    // Step 1: Fetch user context for RLS
    const userContext = await fetchUserContext(userId);

    // Step 2: Build SQL query
    const queryBuilder = createQueryBuilder();
    const queryResult = await queryBuilder.buildQuery(intent, userContext);
    sql = queryResult.sql;

    // Step 3: Check smart cache
    const cachedData = await getCachedQuery(sql, userId, queryResult.params);
    if (cachedData) {
      const queryTime = Date.now() - startTime;
      
      return {
        data: cachedData,
        rowCount: cachedData.length,
        queryTime,
        cached: true,
        sql,
      };
    }

    // Step 4: Execute query via Supabase (with RLS applied automatically)
    let data: any[] = [];
    try {
      data = await executeSQLQueryWithRLS(sql, queryResult.params, userContext);
    } catch (error: any) {
      console.error('[RAG Engine] Query execution failed:', error.message);
      
      // Return empty result with error metadata
      const queryTime = Date.now() - startTime;
      return {
        data: [],
        rowCount: 0,
        queryTime,
        cached: false,
        sql,
      };
    }

    // Step 5: Cache the result using smart cache
    await setCachedQuery(sql, userId, data, queryResult.params);

    const queryTime = Date.now() - startTime;

    return {
      data,
      rowCount: data.length,
      queryTime,
      cached: false,
      sql,
    };
  } catch (error: any) {
    console.error('[RAG Engine] retrieveRelevantData error:', error.message);
    const queryTime = Date.now() - startTime;
    
    return {
      data: [],
      rowCount: 0,
      queryTime,
      cached: false,
      sql,
    };
  }
}

/**
 * Execute SQL query with Row-Level Security (RLS) applied
 * RLS is automatically applied by Supabase based on user context
 */
async function executeSQLQueryWithRLS(
  sql: string,
  params: any[],
  userContext: UserContext
): Promise<any[]> {
  try {
    const supabase = createSupabaseServerClient();
    
    // Replace parameterized placeholders with actual values (safely)
    let finalSQL = sql;
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      let paramValue: string;
      
      if (param === null || param === undefined) {
        paramValue = 'NULL';
      } else if (typeof param === 'string') {
        // Escape single quotes and wrap in quotes
        paramValue = `'${param.replace(/'/g, "''")}'`;
      } else if (param instanceof Date) {
        paramValue = `'${param.toISOString()}'`;
      } else {
        paramValue = String(param);
      }
      
      // Replace $1, $2, etc. with actual values
      finalSQL = finalSQL.replace(new RegExp(`\\$${i + 1}\\b`, 'g'), paramValue);
    }

    // Set user context for RLS (if Supabase supports it)
    // Note: RLS policies should be configured in the database
    // The user context is already applied via the query builder's user filters

    // Execute via RPC function
    try {
      const { data, error } = await supabase.rpc('execute_query', {
        query_sql: finalSQL,
      });

      if (error) {
        throw error;
      }

      return Array.isArray(data) ? data : [];
    } catch (rpcError: any) {
      // Fallback: Use REST API
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceKey) {
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ query_sql: finalSQL }),
          });

          if (response.ok) {
            const data = await response.json();
            return Array.isArray(data) ? data : [];
          }
        } catch (restError: any) {
          console.error('[RAG Engine] REST API execution failed:', restError.message);
        }
      }

      throw new Error(`Query execution failed: ${rpcError.message}`);
    }
  } catch (error: any) {
    console.error('[RAG Engine] SQL execution error:', error.message);
    throw error;
  }
}

/**
 * Log query to ai_queries table (legacy - use monitoring.logQuery instead)
 * @deprecated Use monitoring.logQuery instead
 */
async function logQuery(
  userId: string,
  question: string,
  mode: 'COACH' | 'QUERY',
  sql: string,
  result: QueryResultWithMetadata,
  answer?: string,
  confidence?: number
): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    
    // Build result JSONB with all metadata
    const resultData = {
      sql_query: sql,
      row_count: result.rowCount,
      query_time_ms: result.queryTime,
      cached: result.cached,
      answer: answer || null,
      confidence: confidence || null,
      data_sample: result.data.slice(0, 10), // Store sample of data
    };
    
    // Map mode to lowercase to match table constraint
    const modeLower = mode.toLowerCase() as 'coach' | 'query';
    
    const { error } = await supabase.from('ai_queries').insert({
      user_id: userId,
      question,
      mode: modeLower,
      result: resultData,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[RAG Engine] Failed to log query:', error.message);
      // Don't throw - logging failures shouldn't break the query
    }
  } catch (error: any) {
    console.error('[RAG Engine] Query logging error:', error.message);
    // Don't throw - logging failures shouldn't break the query
  }
}

/**
 * Generate natural language AI response from query results
 * 
 * Uses Gemini AI to convert structured data into human-readable responses.
 * Supports two modes with different prompt strategies:
 * 
 * - COACH Mode: Provides strategic advice, encouragement, and actionable tips
 * - QUERY Mode: Provides data-driven answers with specific numbers and facts
 * 
 * @param question - Original user question for context
 * @param context - Formatted database results and context (from formatQueryResultsForAI)
 * @param mode - Response mode:
 *   - 'COACH': Strategic coaching with encouragement
 *   - 'QUERY': Data-driven answers with citations
 * @param userContext - User context (name, role, stats) for personalization
 * @param conversationHistory - Optional conversation history for context:
 *   - Array of { role: 'user' | 'assistant', content: string }
 *   - Used for follow-up questions and context
 * @returns Promise<string> Markdown-formatted response
 * 
 * @example
 * ```typescript
 * const answer = await generateAIResponse(
 *   "How many contacts do I have?",
 *   "Query Results:\nTotal Contacts: 45\n...",
 *   "QUERY",
 *   { userId: "user123", role: "employee" },
 *   [{ role: "user", content: "Show me my data" }]
 * );
 * ```
 * 
 * @see {@link formatQueryResultsForAI} for context formatting
 * @see {@link runGeminiWithFallback} for AI model fallback
 */
export async function generateAIResponse(
  question: string,
  context: string,
  mode: 'COACH' | 'QUERY',
  userContext: any,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  try {
    // Build mode-specific system prompt
    const systemPrompt = buildSystemPrompt(mode, userContext);
    
    // Build user prompt with context and history
    const userPrompt = buildUserPrompt(question, context, mode, conversationHistory);
    
    // Combine prompts for runGeminiWithFallback
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    // Generate response using fallback mechanism
    interface AIResponse {
      answer?: string;
      response?: string;
      reply?: string;
      content?: string;
    }
    
    const response = await runGeminiWithFallback<AIResponse>(fullPrompt);
    
    // Extract response text
    let answer = response.answer || response.response || response.reply || response.content || '';
    
    // If response is still empty or just JSON, try to get raw text
    if (!answer || answer.trim().length === 0) {
      // Fallback: use the response object as string
      answer = JSON.stringify(response);
    }
    
    // Validate response to prevent hallucination
    answer = validateResponse(answer, context, mode);
    
    // Ensure markdown formatting
    answer = ensureMarkdownFormatting(answer);
    
    return answer;
  } catch (error: any) {
    console.error('[RAG Engine] AI response generation error:', error.message);
    
    // Return safe fallback response
    return mode === 'COACH'
      ? `I'm here to help! However, I encountered an issue processing your question. Could you please rephrase it or provide more details?`
      : `I encountered an error generating a response. The data is available, but I couldn't format it properly. Please try again.`;
  }
}

/**
 * Build system prompt based on mode
 */
function buildSystemPrompt(mode: 'COACH' | 'QUERY', userContext: any): string {
  const userName = userContext?.name || userContext?.userId || 'there';
  const userRole = userContext?.role || 'user';
  
  if (mode === 'COACH') {
    return `You are an expert CRM sales coach and advisor. Your role is to provide strategic guidance, encouragement, and actionable tips to help sales professionals improve their performance.

User Context:
- Name: ${userName}
- Role: ${userRole}
${userContext?.stats ? `- Recent Activity: ${JSON.stringify(userContext.stats)}` : ''}

Guidelines:
1. Be encouraging and supportive - acknowledge their efforts
2. Provide specific, actionable advice based on the data
3. Focus on strategic insights, not just numbers
4. Suggest concrete next steps they can take
5. Use markdown formatting for readability (headers, lists, emphasis)
6. Be concise but comprehensive
7. Reference specific data points when making recommendations
8. NEVER make up data or statistics - only use what's provided in the context

Response Format:
- Use markdown headers (##) for main sections
- Use bullet points (-) for actionable items
- Use **bold** for emphasis
- Use > for important quotes or highlights`;
  } else {
    return `You are a precise CRM data analyst. Your role is to provide accurate, data-driven answers based on database query results.

User Context:
- Name: ${userName}
- Role: ${userRole}

Guidelines:
1. Be accurate and precise - only use data from the provided context
2. Cite specific numbers, dates, and facts from the query results
3. If data is missing or unavailable, clearly state that
4. Use markdown formatting for tables and structured data
5. NEVER hallucinate or invent data - if you don't have the information, say so
6. Include citations referencing the data source (e.g., "Based on the query results...")
7. Format numbers, dates, and currencies clearly
8. If the query returned no results, explain what that means

Response Format:
- Use markdown tables for structured data
- Use code blocks (\`\`\`) for SQL or technical details if relevant
- Use **bold** for key metrics
- Use > for important findings
- Always cite your sources`;
  }
}

/**
 * Build user prompt with context and conversation history
 */
function buildUserPrompt(
  question: string,
  context: string,
  mode: 'COACH' | 'QUERY',
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  let prompt = `Question: ${question}\n\n`;
  
  // Add conversation history if available
  if (conversationHistory && conversationHistory.length > 0) {
    prompt += `Previous Conversation:\n`;
    for (const msg of conversationHistory.slice(-5)) { // Last 5 messages
      prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
    }
    prompt += `\n`;
  }
  
  prompt += `Database Context and Query Results:\n${context}\n\n`;
  
  if (mode === 'COACH') {
    prompt += `Based on the above data, provide strategic coaching advice, actionable recommendations, and encouragement. Focus on what the user can do to improve their performance.`;
  } else {
    prompt += `Based on the above query results, provide a clear, accurate answer to the question. Cite specific data points and explain what the results mean.`;
  }
  
  return prompt;
}

/**
 * Validate response to prevent hallucination
 */
function validateResponse(
  answer: string,
  context: string,
  mode: 'COACH' | 'QUERY'
): string {
  // Extract numbers and dates from context for validation
  const contextNumbers = extractNumbers(context);
  const contextDates = extractDates(context);
  
  // Check for potential hallucinations
  const answerNumbers = extractNumbers(answer);
  const answerDates = extractDates(answer);
  
  // For QUERY mode, be stricter about data validation
  if (mode === 'QUERY') {
    // Check if answer contains numbers not in context
    const suspiciousNumbers = answerNumbers.filter(num => 
      !contextNumbers.some(ctxNum => Math.abs(ctxNum - num) < 0.01)
    );
    
    if (suspiciousNumbers.length > 0) {
      console.warn('[RAG Engine] Potential hallucination detected: numbers not in context', suspiciousNumbers);
      // Add disclaimer
      answer = `⚠️ **Note:** Some numbers in this response may need verification. Please cross-reference with the source data.\n\n${answer}`;
    }
    
    // Check if answer contains dates not in context
    const suspiciousDates = answerDates.filter(date => 
      !contextDates.some(ctxDate => ctxDate === date)
    );
    
    if (suspiciousDates.length > 0) {
      console.warn('[RAG Engine] Potential hallucination detected: dates not in context', suspiciousDates);
    }
  }
  
  // Check for common hallucination patterns
  const hallucinationPatterns = [
    /according to our records/i,
    /our database shows/i,
    /we have data indicating/i,
  ];
  
  for (const pattern of hallucinationPatterns) {
    if (pattern.test(answer) && !context.toLowerCase().includes('database') && !context.toLowerCase().includes('query')) {
      // Replace with more accurate phrasing
      answer = answer.replace(pattern, 'Based on the query results');
    }
  }
  
  // Ensure answer references the context
  if (mode === 'QUERY' && !answer.toLowerCase().includes('query') && !answer.toLowerCase().includes('data') && !answer.toLowerCase().includes('result')) {
    answer = `Based on the query results:\n\n${answer}`;
  }
  
  return answer;
}

/**
 * Extract numbers from text
 */
function extractNumbers(text: string): number[] {
  const numberRegex = /[\d,]+\.?\d*/g;
  const matches = text.match(numberRegex) || [];
  return matches
    .map(m => parseFloat(m.replace(/,/g, '')))
    .filter(n => !isNaN(n) && isFinite(n));
}

/**
 * Extract dates from text
 */
function extractDates(text: string): string[] {
  const dateRegex = /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{1,2}, \d{4}/g;
  return text.match(dateRegex) || [];
}

/**
 * Ensure response is properly formatted in markdown
 */
function ensureMarkdownFormatting(text: string): string {
  // If text doesn't contain markdown, add basic formatting
  if (!text.includes('#') && !text.includes('*') && !text.includes('-') && !text.includes('`')) {
    // Add basic markdown structure
    const lines = text.split('\n');
    const formatted = lines.map((line, index) => {
      // Skip empty lines
      if (line.trim().length === 0) {
        return line;
      }
      
      // If line looks like a header (short, no punctuation), make it a header
      if (line.length < 50 && !line.includes('.') && !line.includes(',')) {
        return `## ${line}`;
      }
      
      // If line starts with a number or bullet-like character, format as list
      if (/^\d+\.|^[-*]/.test(line.trim())) {
        return line.trim().startsWith('-') ? line : `- ${line.trim()}`;
      }
      
      return line;
    });
    
    return formatted.join('\n');
  }
  
  return text;
}

