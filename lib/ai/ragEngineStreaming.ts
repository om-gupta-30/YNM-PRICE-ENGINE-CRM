/**
 * Streaming RAG Engine
 * Provides streaming versions of RAG operations for real-time updates
 */

import { classifyIntent } from './intentClassifier';
import { createQueryBuilder, UserContext } from './dynamicQueryBuilder';
import { formatQueryResultsForAI, formatUserContextForAI } from './contextFormatter';
import { QueryIntent } from './types/intentTypes';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCachedQuery, setCachedQuery } from './queryCache';
import * as monitoring from './monitoring';

/**
 * Fetch user context (duplicated from ragEngine since it's not exported)
 */
async function fetchUserContext(userId: string): Promise<UserContext> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return {
        userId,
        role: 'user',
      };
    }

    return {
      userId: user.id,
      employeeId: user.id,
      role: user.role || 'user',
    };
  } catch (error: any) {
    return {
      userId,
      role: 'user',
    };
  }
}

/**
 * Stream callback type for SSE events
 */
export type StreamCallback = (event: {
  type: string;
  data?: any;
  chunk?: string;
  error?: string;
}) => void;

/**
 * Stream RAG query execution with progress updates
 */
export async function streamRAGQuery(
  question: string,
  userId: string,
  mode: 'COACH' | 'QUERY',
  onStream: StreamCallback
): Promise<void> {
  let userContext: UserContext | undefined;
  let intentClassification;
  let sql = '';
  let data: any[] = [];
  let confidence = 0;
  let sources: string[] = [];

  try {
    // Step 1: Fetch user context
    onStream({ type: 'status', data: { stage: 'fetching_context', message: 'Loading user context...' } });
    userContext = await fetchUserContext(userId);

    // Step 2: Classify intent
    onStream({ type: 'status', data: { stage: 'classifying_intent', message: 'Understanding your question...' } });
    const intentStartTime = Date.now();
    try {
      intentClassification = await classifyIntent(question, userContext);
      confidence = intentClassification.confidence;
      sources.push('Intent Classification');

      onStream({
        type: 'intent',
        data: {
          category: intentClassification.intent.category,
          tables: intentClassification.intent.tables,
          confidence,
        },
      });

      monitoring.logIntent({
        userId,
        question,
        intent: intentClassification.intent,
        confidence,
        executionTime: Date.now() - intentStartTime,
      }).catch(() => {});

    } catch (error: any) {
      onStream({ type: 'error', error: `Intent classification failed: ${error.message}` });
      return;
    }

    // Step 3: Build SQL query
    onStream({ type: 'status', data: { stage: 'building_query', message: 'Building database query...' } });
    try {
      const queryBuilder = createQueryBuilder();
      const intent = intentClassification.intent;
      const queryResult = await queryBuilder.buildQuery(intent, userContext);
      sql = queryResult.sql;

      onStream({
        type: 'query',
        data: {
          sql,
          affectedTables: queryResult.affectedTables,
        },
      });

      sources.push(...queryResult.affectedTables);
    } catch (error: any) {
      onStream({ type: 'error', error: `Query building failed: ${error.message}` });
      return;
    }

    // Step 4: Retrieve data
    onStream({ type: 'status', data: { stage: 'executing_query', message: 'Querying database...' } });
    try {
      const startTime = Date.now();
      const userContextForRLS = await fetchUserContext(userId);
      const queryBuilder = createQueryBuilder();
      const queryResult = await queryBuilder.buildQuery(intentClassification.intent, userContextForRLS);

      // Check cache
      const cachedData = await getCachedQuery(sql, userId, queryResult.params);
      if (cachedData) {
        data = cachedData;
        onStream({ type: 'status', data: { stage: 'cache_hit', message: 'Using cached results' } });
      } else {
        // Execute query
        const supabase = createSupabaseServerClient();
        
        // Replace parameterized placeholders with actual values (safely)
        let finalSQL = sql;
        for (let i = 0; i < queryResult.params.length; i++) {
          const param = queryResult.params[i];
          let paramValue: string;
          
          if (param === null || param === undefined) {
            paramValue = 'NULL';
          } else if (typeof param === 'string') {
            paramValue = `'${param.replace(/'/g, "''")}'`;
          } else if (param instanceof Date) {
            paramValue = `'${param.toISOString()}'`;
          } else {
            paramValue = String(param);
          }
          
          finalSQL = finalSQL.replace(new RegExp(`\\$${i + 1}\\b`, 'g'), paramValue);
        }

        // Execute via RPC function
        try {
          const { data: queryData, error } = await supabase.rpc('execute_query', {
            query_sql: finalSQL,
          });

          if (error) {
            throw error;
          }

          data = Array.isArray(queryData) ? queryData : [];
          await setCachedQuery(sql, userId, data, queryResult.params);
        } catch (rpcError: any) {
          throw new Error(`Query execution failed: ${rpcError.message}`);
        }
      }

      onStream({
        type: 'data',
        data: {
          rowCount: data.length,
          preview: data.slice(0, 5),
        },
      });
    } catch (error: any) {
      onStream({ type: 'error', error: `Data retrieval failed: ${error.message}` });
      return;
    }

    // Step 5: Format context
    onStream({ type: 'status', data: { stage: 'formatting_context', message: 'Preparing response...' } });
    let formattedContext = '';
    try {
      const formattedResults = formatQueryResultsForAI(data, question, intentClassification.intent);
      const formattedUser = formatUserContextForAI(userContext);
      formattedContext = `${formattedUser}\n\n${formattedResults}`;
    } catch (error: any) {
      formattedContext = `Query: ${question}\nResults: ${JSON.stringify(data.slice(0, 10))}`;
    }

    // Step 6: Stream AI response
    onStream({ type: 'status', data: { stage: 'generating_response', message: 'Generating AI response...' } });
    await streamAIResponse(question, formattedContext, mode, userContext, onStream);

  } catch (error: any) {
    onStream({ type: 'error', error: `Unexpected error: ${error.message}` });
  }
}

/**
 * Stream AI response using Gemini's streaming API
 */
async function streamAIResponse(
  question: string,
  context: string,
  mode: 'COACH' | 'QUERY',
  userContext: any,
  onStream: StreamCallback
): Promise<void> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY');
    }

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' });

    // Build prompts
    const systemPrompt = buildSystemPrompt(mode, userContext);
    const userPrompt = buildUserPrompt(question, context, mode);
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // Start streaming
    onStream({ type: 'response_start' });

    // Use generateContentStream for streaming
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    });

    let fullResponse = '';
    
    // Stream chunks as they arrive
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullResponse += chunkText;
        onStream({ type: 'chunk', chunk: chunkText });
      }
    }

    // Send final response
    onStream({ type: 'response_end', data: { fullResponse } });
  } catch (error: any) {
    console.error('[Streaming] AI response generation failed:', error.message);
    onStream({ type: 'error', error: `AI response generation failed: ${error.message}` });
  }
}

/**
 * Build system prompt (same as ragEngine)
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
 * Build user prompt (same as ragEngine)
 */
function buildUserPrompt(
  question: string,
  context: string,
  mode: 'COACH' | 'QUERY',
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  let prompt = `Question: ${question}\n\n`;

  if (conversationHistory && conversationHistory.length > 0) {
    prompt += `Previous Conversation:\n`;
    for (const msg of conversationHistory.slice(-5)) {
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

