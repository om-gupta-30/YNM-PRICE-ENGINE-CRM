import { NextRequest, NextResponse } from 'next/server';
import { executeRAGQuery, generateAIResponse, fetchUserContext } from '@/lib/ai/ragEngine';
import { streamRAGQuery } from '@/lib/ai/ragEngineStreaming';
import { routeConversation } from '@/lib/ai/conversationRouterV2';
import { saveConversationTurn, loadConversationHistory } from '@/lib/ai/conversationMemory';
import { getOrCreateSession } from '@/lib/ai/sessionManager';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

/**
 * Request body interface
 */
interface RAGChatRequest {
  message: string;
  mode?: 'COACH' | 'QUERY';
  sessionId?: string;
}

/**
 * Response interface
 */
interface RAGChatResponse {
  answer: string;
  mode: string;
  data?: any[];
  confidence: number;
  sessionId: string;
  sql?: string;
  sources?: string[];
}

/**
 * Rate limiting: Track requests per user
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_REQUESTS_PER_HOUR = 50;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check rate limit for a user
 * 
 * @param userId - User identifier
 * @returns true if within limit, false if exceeded
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);
  
  if (!entry || now > entry.resetAt) {
    // Create new entry or reset expired one
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_HOUR - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }
  
  if (entry.count >= MAX_REQUESTS_PER_HOUR) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(userId, entry);
  
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_HOUR - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get user from request
 * Extracts user ID from headers or request body
 */
async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // Try to get from Authorization header or custom header
    const authHeader = request.headers.get('authorization');
    const userIdHeader = request.headers.get('x-user-id');
    
    console.log('[RAG Chat] getUserFromRequest - Headers:', {
      hasAuthHeader: !!authHeader,
      hasUserIdHeader: !!userIdHeader,
      userIdHeader
    });
    
    if (userIdHeader) {
      console.log('[RAG Chat] Using userId from x-user-id header:', userIdHeader);
      return userIdHeader;
    }
    
    // Try to get from Supabase session
    const supabase = createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    console.log('[RAG Chat] Supabase auth.getUser():', {
      hasUser: !!user,
      userId: user?.id,
      error: error?.message
    });
    
    if (!error && user) {
      console.log('[RAG Chat] Using userId from Supabase session:', user.id);
      return user.id;
    }
    
    // Fallback: try to get from request body (for testing)
    try {
      const body = await request.clone().json();
      if (body.userId) {
        console.log('[RAG Chat] Using userId from request body:', body.userId);
        return body.userId;
      }
    } catch {
      // Ignore JSON parse errors
    }
    
    console.warn('[RAG Chat] No userId found in headers, session, or body');
    return null;
  } catch (error: any) {
    console.error('[RAG Chat] Error getting user:', error.message);
    return null;
  }
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [userId, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(userId);
    }
  }
}

// Clean up expired rate limits every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 10 * 60 * 1000);
}

/**
 * POST handler for RAG chat
 * Supports both regular and streaming responses via query parameter
 */
export async function POST(request: NextRequest) {
  // Check if streaming is requested
  const searchParams = request.nextUrl.searchParams;
  const stream = searchParams.get('stream') === 'true';

  // If streaming, return SSE response
  if (stream) {
    return handleStreamingRequest(request);
  }

  // Otherwise, handle regular request
  return handleRegularRequest(request);
}

/**
 * Handle regular (non-streaming) request
 */
async function handleRegularRequest(request: NextRequest) {
  try {
    // Step 1: Get user from auth session
    const userId = await getUserFromRequest(request);
    
    console.log('[RAG Chat] User context:', { userId, hasUserId: !!userId });
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: User not found. Please provide x-user-id header or authenticate.' },
        { status: 401 }
      );
    }
    
    // Step 2: Check rate limit
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      const resetTime = new Date(rateLimit.resetAt).toISOString();
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Maximum ${MAX_REQUESTS_PER_HOUR} requests per hour. Please try again after ${resetTime}`,
          resetAt: resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(MAX_REQUESTS_PER_HOUR),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetAt),
          },
        }
      );
    }
    
    // Step 3: Parse and validate request body
    let body: RAGChatRequest;
    try {
      body = await request.json();
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Validate message
    if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    
    // Validate mode if provided
    if (body.mode && body.mode !== 'COACH' && body.mode !== 'QUERY') {
      return NextResponse.json(
        { error: 'Mode must be either "COACH" or "QUERY"' },
        { status: 400 }
      );
    }
    
    const message = body.message.trim();
    const requestedMode = body.mode;
    const sessionId = body.sessionId;
    
    // Step 4: Get or create session
    let finalSessionId: string;
    try {
      finalSessionId = sessionId || await getOrCreateSession(userId);
    } catch (error: any) {
      console.error('[RAG Chat] Error getting session:', error.message);
      return NextResponse.json(
        { error: 'Failed to get or create session' },
        { status: 500 }
      );
    }
    
    // Step 5: Load conversation history
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    try {
      conversationHistory = await loadConversationHistory(userId, finalSessionId, 10);
    } catch (error: any) {
      console.warn('[RAG Chat] Error loading conversation history:', error.message);
      // Continue without history
    }
    
    // Step 6: Determine mode using conversation router if not provided
    let mode: 'COACH' | 'QUERY';
    let routeDecision;
    
    if (requestedMode) {
      mode = requestedMode;
    } else {
      try {
        routeDecision = await routeConversation(message, userId, conversationHistory);
        mode = routeDecision.mode;
      } catch (error: any) {
        console.error('[RAG Chat] Error routing conversation:', error.message);
        // Default to QUERY mode on error
        mode = 'QUERY';
      }
    }
    
    // Step 6.5: Test database connectivity and data
    try {
      console.log('[RAG Chat] Running test query to verify database connectivity...');
      const supabase = createSupabaseServerClient();
      
      // Test 1: Check if contacts table has data for this user
      const testQuery = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: false })
        .eq('created_by', userId)
        .limit(1);
      
      console.log('[Test Query] Contact count result:', {
        data: testQuery.data,
        count: testQuery.count,
        error: testQuery.error,
        hasData: testQuery.data && testQuery.data.length > 0,
        userId
      });
      
      // Test 2: Check total contacts count (without user filter)
      const totalContactsQuery = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });
      
      console.log('[Test Query] Total contacts in database:', {
        count: totalContactsQuery.count,
        error: totalContactsQuery.error
      });
      
      // Test 3: Check if user exists in users table
      const userCheck = await supabase
        .from('users')
        .select('id, name, role')
        .eq('id', userId)
        .single();
      
      console.log('[Test Query] User check:', {
        user: userCheck.data,
        error: userCheck.error,
        userExists: !!userCheck.data
      });
      
      if (testQuery.error) {
        console.error('[Test Query] Database error:', testQuery.error);
      }
      
      if (!testQuery.data || testQuery.data.length === 0) {
        console.warn('[Test Query] No contacts found for user. This may indicate:');
        console.warn('[Test Query] 1. User has no contacts assigned');
        console.warn('[Test Query] 2. Contacts table uses different column name (not created_by)');
        console.warn('[Test Query] 3. User ID format mismatch');
      } else {
        console.log('[Test Query] ✓ Database connectivity verified');
        console.log('[Test Query] ✓ User has contacts in database');
      }
    } catch (testError: any) {
      console.error('[Test Query] Test query failed:', testError.message);
      // Don't block the main query, just log the error
    }
    
    // TEMPORARY TEST - Remove after debugging
    // Bypass RAG system for "how many contacts" queries to test direct database access
    if (mode === 'QUERY' && message.toLowerCase().includes('how many contacts')) {
      console.log('[TEST] Bypassing RAG system - using direct database query');
      console.log('[TEST] NOTE: Verify your contacts table has assigned_to and/or created_by columns!');
      console.log('[TEST] If these columns don\'t exist, the query will fail.');
      console.log('[TEST] Check your database schema or use sub_account_id filter instead.');
      
      try {
        const supabase = createSupabaseServerClient();
        
        // First, try to get total contacts count (no filter) to verify table exists
        const { count: totalCount, error: totalError } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true });
        
        console.log('[TEST] Total contacts in database (no filter):', { 
          count: totalCount, 
          error: totalError 
        });
        
        // Test direct query with assigned_to filter (if column exists)
        const { count, error: assignedToError } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', userId);
        
        console.log('[TEST] Direct contact count (assigned_to):', { 
          count, 
          error: assignedToError,
          userId,
          note: assignedToError ? 'Column might not exist or have different name' : 'Success'
        });
        
        // Also test with created_by filter (if column exists)
        const { count: countCreatedBy, error: createdByError } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', userId);
        
        console.log('[TEST] Direct contact count (created_by):', { 
          count: countCreatedBy, 
          error: createdByError,
          userId,
          note: createdByError ? 'Column might not exist or have different name' : 'Success'
        });
        
        // Also test with OR condition (assigned_to OR created_by)
        let orData: any[] = [];
        let orError: any = null;
        try {
          const orResult = await supabase
            .from('contacts')
            .select('id', { count: 'exact' })
            .or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
          orData = orResult.data || [];
          orError = orResult.error;
        } catch (orErr: any) {
          orError = orErr;
        }
        
        console.log('[TEST] Direct contact count (assigned_to OR created_by):', { 
          count: orData?.length || 0,
          error: orError,
          userId 
        });
        
        // Also test with sub_account_id (if contacts are linked via sub_accounts)
        // This might be the actual way contacts are linked to users
        const { data: subAccountData, error: subAccountError } = await supabase
          .from('sub_accounts')
          .select('id')
          .eq('assigned_employee_id', userId);
        
        const subAccountIds = subAccountData?.map(sa => sa.id) || [];
        let contactsViaSubAccounts = 0;
        if (subAccountIds.length > 0) {
          const { count: contactsCount, error: contactsError } = await supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .in('sub_account_id', subAccountIds);
          
          contactsViaSubAccounts = contactsCount || 0;
          console.log('[TEST] Contacts via sub_accounts (assigned_employee_id):', {
            subAccountIds,
            contactsCount,
            error: contactsError
          });
        }
        
        // Return the result
        const finalCount = count || countCreatedBy || orData?.length || contactsViaSubAccounts || 0;
        return NextResponse.json({
          answer: `You have ${finalCount} contacts. Breakdown: assigned_to=${count || 0}, created_by=${countCreatedBy || 0}, OR=${orData?.length || 0}, via_sub_accounts=${contactsViaSubAccounts || 0}, total_in_db=${totalCount || 0}.`,
          mode: 'QUERY',
          confidence: 100,
          data: [],
          sql: 'TEMPORARY_TEST_QUERY',
          sources: ['contacts']
        }, {
          status: 200,
          headers: {
            'X-RateLimit-Limit': String(MAX_REQUESTS_PER_HOUR),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetAt),
          },
        });
      } catch (testError: any) {
        console.error('[TEST] Direct query failed:', testError);
        return NextResponse.json({
          error: 'Test query failed',
          message: testError.message,
          answer: `Test query failed: ${testError.message}. Check if contacts table exists and has the expected columns.`,
          mode: 'QUERY',
          confidence: 0
        }, { status: 500 });
      }
    }
    
    // Step 7: Execute RAG query
    let ragResponse;
    try {
      console.log('[RAG Chat] Executing RAG query with user context:', { userId, mode, messageLength: message.length });
      ragResponse = await executeRAGQuery(message, userId, mode);
      console.log('[RAG Chat] RAG query completed:', { 
        answerLength: ragResponse.answer?.length || 0, 
        dataCount: ragResponse.data?.length || 0,
        confidence: ragResponse.confidence 
      });
    } catch (error: any) {
      console.error('[RAG Chat] Error executing RAG query:', error.message);
      return NextResponse.json(
        {
          error: 'Failed to process query',
          message: error.message || 'An error occurred while processing your request',
        },
        { status: 500 }
      );
    }
    
    // Step 7.5: Check for empty results and provide helpful fallback
    if (mode === 'QUERY' && (!ragResponse.data || ragResponse.data.length === 0)) {
      console.log('[RAG Chat] Empty results detected, generating helpful fallback response');
      try {
        // Get user context for personalized response
        const userContext = await fetchUserContext(userId);
        
        // Determine what type of data was queried from sources or question
        const dataType = ragResponse.sources && ragResponse.sources.length > 0
          ? ragResponse.sources[0] // Use first source table name
          : message.toLowerCase().includes('contact') ? 'contacts'
          : message.toLowerCase().includes('account') ? 'accounts'
          : message.toLowerCase().includes('activity') ? 'activities'
          : message.toLowerCase().includes('quotation') || message.toLowerCase().includes('quote') ? 'quotations'
          : message.toLowerCase().includes('lead') ? 'leads'
          : 'data';
        
        // Generate helpful AI response
        const helpfulPrompt = `The user asked: "${message}"

The query returned no results. Provide a helpful, friendly response that:
1. Acknowledges that no ${dataType} data was found
2. Suggests they might not have any ${dataType} data yet (if they're a new user)
3. Provides guidance on how to add ${dataType} to their CRM
4. Suggests alternative questions they could ask
5. Keeps the tone encouraging and helpful

Keep the response concise (2-3 sentences) and actionable.`;

        const helpfulAnswer = await generateAIResponse(
          helpfulPrompt,
          `User Context: ${JSON.stringify({ role: userContext?.role, userId: userContext?.userId })}\n\nQuery: ${message}\nResult: No data found for ${dataType}`,
          'COACH',
          userContext
        );
        
        console.log('[RAG Chat] Generated helpful fallback response:', helpfulAnswer.substring(0, 100));
        
        // Update the response with helpful answer
        ragResponse.answer = helpfulAnswer;
        ragResponse.confidence = Math.max(ragResponse.confidence, 0.5); // Ensure minimum confidence
      } catch (fallbackError: any) {
        console.error('[RAG Chat] Failed to generate helpful fallback:', fallbackError.message);
        // Use a simple fallback if AI generation fails
        ragResponse.answer = `I couldn't find any data matching your query. This might mean you don't have any records yet, or the data might be filtered differently. Try asking about a different aspect of your CRM, or check if you need to add data first.`;
      }
    }
    
    // Step 8: Save conversation turn to memory (async, non-blocking)
    saveConversationTurn(
      userId,
      finalSessionId,
      message,
      ragResponse.answer,
      mode,
      routeDecision
    ).catch(err => {
      console.error('[RAG Chat] Error saving conversation turn:', err.message);
    });
    
    // Step 9: Build and return response
    const response: RAGChatResponse = {
      answer: ragResponse.answer,
      mode: mode, // Use the determined mode
      data: ragResponse.data.length > 0 ? ragResponse.data : undefined,
      confidence: ragResponse.confidence,
      sessionId: finalSessionId,
      sql: ragResponse.sql, // Include SQL for transparency
      sources: ragResponse.sources, // Include data sources
    };
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-RateLimit-Limit': String(MAX_REQUESTS_PER_HOUR),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt),
      },
    });
  } catch (error: any) {
    console.error('[RAG Chat] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle streaming request with Server-Sent Events (SSE)
 */
async function handleStreamingRequest(request: NextRequest) {
  // Check if client supports SSE
  const acceptHeader = request.headers.get('accept') || '';
  const supportsSSE = acceptHeader.includes('text/event-stream');

  if (!supportsSSE) {
    // Fallback to regular request
    return handleRegularRequest(request);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Step 1: Get user from auth session
        const userId = await getUserFromRequest(request);
        
        console.log('[RAG Chat] Streaming - User context:', { userId, hasUserId: !!userId });
        
        if (!userId) {
          sendEvent('error', { message: 'Unauthorized: User not found' });
          controller.close();
          return;
        }

        // Step 2: Check rate limit
        const rateLimit = checkRateLimit(userId);
        if (!rateLimit.allowed) {
          sendEvent('error', { message: 'Rate limit exceeded' });
          controller.close();
          return;
        }

        // Step 3: Parse request body
        let body: RAGChatRequest;
        try {
          body = await request.json();
        } catch (error: any) {
          sendEvent('error', { message: 'Invalid JSON in request body' });
          controller.close();
          return;
        }

        // Validate message
        if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
          sendEvent('error', { message: 'Message is required' });
          controller.close();
          return;
        }

        const message = body.message.trim();
        const requestedMode = body.mode;
        const sessionId = body.sessionId;

        // Step 4: Get or create session
        let finalSessionId: string;
        try {
          finalSessionId = sessionId || await getOrCreateSession(userId);
        } catch (error: any) {
          sendEvent('error', { message: 'Failed to get or create session' });
          controller.close();
          return;
        }

        // Step 5: Load conversation history
        let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        try {
          conversationHistory = await loadConversationHistory(userId, finalSessionId, 10);
        } catch (error: any) {
          // Continue without history
        }

        // Step 6: Determine mode
        let mode: 'COACH' | 'QUERY';
        let routeDecision;
        
        if (requestedMode) {
          mode = requestedMode;
        } else {
          try {
            routeDecision = await routeConversation(message, userId, conversationHistory);
            mode = routeDecision.mode;
            sendEvent('mode', { mode, confidence: routeDecision.confidence });
          } catch (error: any) {
            mode = 'QUERY';
          }
        }

        // Step 6.5: Test database connectivity and data
        try {
          console.log('[RAG Chat] Streaming - Running test query to verify database connectivity...');
          const supabase = createSupabaseServerClient();
          
          // Test 1: Check if contacts table has data for this user
          const testQuery = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: false })
            .eq('created_by', userId)
            .limit(1);
          
          console.log('[Test Query] Streaming - Contact count result:', {
            data: testQuery.data,
            count: testQuery.count,
            error: testQuery.error,
            hasData: testQuery.data && testQuery.data.length > 0,
            userId
          });
          
          // Test 2: Check total contacts count (without user filter)
          const totalContactsQuery = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true });
          
          console.log('[Test Query] Streaming - Total contacts in database:', {
            count: totalContactsQuery.count,
            error: totalContactsQuery.error
          });
          
          // Test 3: Check if user exists in users table
          const userCheck = await supabase
            .from('users')
            .select('id, name, role')
            .eq('id', userId)
            .single();
          
          console.log('[Test Query] Streaming - User check:', {
            user: userCheck.data,
            error: userCheck.error,
            userExists: !!userCheck.data
          });
          
          if (testQuery.error) {
            console.error('[Test Query] Streaming - Database error:', testQuery.error);
          }
          
          if (!testQuery.data || testQuery.data.length === 0) {
            console.warn('[Test Query] Streaming - No contacts found for user. This may indicate:');
            console.warn('[Test Query] Streaming - 1. User has no contacts assigned');
            console.warn('[Test Query] Streaming - 2. Contacts table uses different column name (not created_by)');
            console.warn('[Test Query] Streaming - 3. User ID format mismatch');
          } else {
            console.log('[Test Query] Streaming - ✓ Database connectivity verified');
            console.log('[Test Query] Streaming - ✓ User has contacts in database');
          }
        } catch (testError: any) {
          console.error('[Test Query] Streaming - Test query failed:', testError.message);
          // Don't block the main query, just log the error
        }

        // Step 7: Stream RAG query execution
        let fullAnswer = '';
        let finalData: any[] = [];
        let finalSql = '';
        let finalConfidence = 0;
        let finalSources: string[] = [];

        await streamRAGQuery(message, userId, mode, async (event) => {
          switch (event.type) {
            case 'status':
              sendEvent('status', event.data);
              break;
            case 'intent':
              sendEvent('intent', event.data);
              finalConfidence = event.data?.confidence || 0;
              break;
            case 'query':
              sendEvent('query', event.data);
              finalSql = event.data?.sql || '';
              finalSources = event.data?.affectedTables || [];
              break;
            case 'data':
              sendEvent('data', event.data);
              finalData = event.data?.preview || [];
              break;
            case 'response_start':
              sendEvent('response_start', {});
              break;
            case 'chunk':
              fullAnswer += event.chunk || '';
              sendEvent('chunk', { chunk: event.chunk });
              break;
            case 'response_end':
              sendEvent('response_end', { fullResponse: fullAnswer });
              break;
            case 'error':
              sendEvent('error', { message: event.error });
              controller.close();
              return;
          }
        });

        // Step 8: Save conversation turn (async)
        saveConversationTurn(
          userId,
          finalSessionId,
          message,
          fullAnswer,
          mode,
          routeDecision
        ).catch(() => {});

        // Step 9: Send final response
        sendEvent('done', {
          answer: fullAnswer,
          mode,
          data: finalData.length > 0 ? finalData : undefined,
          confidence: finalConfidence,
          sessionId: finalSessionId,
          sql: finalSql,
          sources: finalSources,
        });

        controller.close();
      } catch (error: any) {
        sendEvent('error', { message: error.message || 'Unexpected error' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

/**
 * GET handler for health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'RAG Chat API',
    rateLimit: {
      maxRequests: MAX_REQUESTS_PER_HOUR,
      window: '1 hour',
    },
    streaming: {
      supported: true,
      endpoint: '/api/ai/rag-chat?stream=true',
    },
  });
}

