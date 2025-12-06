import { NextRequest, NextResponse } from 'next/server';
import { classifyIntent } from '@/lib/ai/intentClassifier';
import { QueryIntent } from '@/lib/ai/types/intentTypes';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

/**
 * Request body interface
 */
interface IntentPreviewRequest {
  question: string;
}

/**
 * Response interface
 */
interface IntentPreviewResponse {
  intent: QueryIntent;
  confidence: number;
  explanation: string;
  estimatedComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
}

/**
 * Get user from request
 * Extracts user ID from headers or request body
 */
async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // Try to get from custom header
    const userIdHeader = request.headers.get('x-user-id');
    
    if (userIdHeader) {
      return userIdHeader;
    }
    
    // Try to get from Supabase session
    const supabase = createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (!error && user) {
      return user.id;
    }
    
    // Fallback: try to get from request body (for testing)
    try {
      const body = await request.clone().json();
      if (body.userId) {
        return body.userId;
      }
    } catch {
      // Ignore JSON parse errors
    }
    
    return null;
  } catch (error: any) {
    console.error('[Intent Preview] Error getting user:', error.message);
    return null;
  }
}

/**
 * Estimate query complexity based on intent
 */
function estimateComplexity(intent: QueryIntent): 'SIMPLE' | 'MODERATE' | 'COMPLEX' {
  let complexityScore = 0;
  
  // Base complexity by category
  const categoryComplexity: Record<string, number> = {
    'CONTACT_QUERY': 1,
    'ACCOUNT_QUERY': 1,
    'ACTIVITY_QUERY': 1,
    'LEAD_QUERY': 1,
    'QUOTATION_QUERY': 2,
    'PERFORMANCE_QUERY': 3,
    'AGGREGATION_QUERY': 2,
    'COMPARISON_QUERY': 3,
    'TREND_QUERY': 3,
    'PREDICTION_QUERY': 4,
  };
  
  complexityScore += categoryComplexity[intent.category] || 2;
  
  // Add complexity for multiple tables
  if (intent.tables.length > 1) {
    complexityScore += intent.tables.length - 1;
  }
  
  // Add complexity for aggregations
  if (intent.aggregationType) {
    complexityScore += 1;
  }
  
  // Add complexity for time ranges
  if (intent.timeRange) {
    complexityScore += 1;
  }
  
  // Add complexity for multiple filters
  const filterCount = intent.filters ? Object.keys(intent.filters).length : 0;
  if (filterCount > 2) {
    complexityScore += filterCount - 2;
  }
  
  // Determine complexity level
  if (complexityScore <= 2) {
    return 'SIMPLE';
  } else if (complexityScore <= 4) {
    return 'MODERATE';
  } else {
    return 'COMPLEX';
  }
}

/**
 * POST handler for intent preview
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Get user from auth session (optional for preview, but preferred)
    const userId = await getUserFromRequest(request);
    
    // Step 2: Parse and validate request body
    let body: IntentPreviewRequest;
    try {
      body = await request.json();
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Validate question
    if (!body.question || typeof body.question !== 'string' || body.question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Question is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    
    const question = body.question.trim();
    
    // Step 3: Build user context (minimal, since we're not executing queries)
    const userContext = userId ? {
      userId,
      role: 'user', // Default role for preview
    } : undefined;
    
    // Step 4: Classify intent
    let classificationResult;
    try {
      classificationResult = await classifyIntent(question, userContext);
    } catch (error: any) {
      console.error('[Intent Preview] Error classifying intent:', error.message);
      return NextResponse.json(
        {
          error: 'Failed to classify intent',
          message: error.message || 'An error occurred while analyzing the question',
        },
        { status: 500 }
      );
    }
    
    // Step 5: Estimate complexity
    const estimatedComplexity = estimateComplexity(classificationResult.intent);
    
    // Step 6: Build and return response
    const response: IntentPreviewResponse = {
      intent: classificationResult.intent,
      confidence: classificationResult.confidence,
      explanation: classificationResult.explanation,
      estimatedComplexity,
    };
    
    return NextResponse.json(response, {
      status: 200,
    });
  } catch (error: any) {
    console.error('[Intent Preview] Unexpected error:', error);
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
 * GET handler for health check and documentation
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Intent Preview API',
    description: 'Preview intent classification without executing queries',
    usage: {
      method: 'POST',
      body: {
        question: 'string (required) - The question to classify',
      },
      response: {
        intent: 'QueryIntent - The classified intent',
        confidence: 'number - Confidence score (0.0 to 1.0)',
        explanation: 'string - Explanation of the classification',
        estimatedComplexity: 'string - SIMPLE, MODERATE, or COMPLEX',
      },
    },
    examples: [
      {
        question: 'How many contacts do I have?',
        expectedIntent: 'CONTACT_QUERY with COUNT aggregation',
      },
      {
        question: 'Show me accounts with low engagement',
        expectedIntent: 'ACCOUNT_QUERY with filters',
      },
      {
        question: 'How can I improve my sales performance?',
        expectedIntent: 'COACH mode (not a query intent)',
      },
    ],
  });
}

