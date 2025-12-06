import { NextRequest, NextResponse } from 'next/server';
import { classifyIntent } from '@/lib/ai/intentClassifier';
import { createQueryBuilder, UserContext } from '@/lib/ai/dynamicQueryBuilder';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { DATABASE_SCHEMA } from '@/lib/ai/databaseSchemaContext';

/**
 * Request body interface
 */
interface QueryExplainRequest {
  question: string;
}

/**
 * Response interface
 */
interface QueryExplainResponse {
  sql: string;
  explanation: string;
  affectedTables: string[];
  estimatedRows: number;
  warnings: string[];
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
    console.error('[Query Explain] Error getting user:', error.message);
    return null;
  }
}

/**
 * Fetch user context for query building
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
      permissions: determinePermissions(user.role),
    };
  } catch (error: any) {
    console.error('[Query Explain] Error fetching user context:', error.message);
    return {
      userId,
      role: 'user',
    };
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
 * Analyze SQL for potential issues and warnings
 */
function analyzeQueryForWarnings(
  sql: string,
  intent: any,
  affectedTables: string[]
): string[] {
  const warnings: string[] = [];
  const sqlUpper = sql.toUpperCase();
  
  // Check for full table scans (no WHERE clause)
  if (!sqlUpper.includes('WHERE') && !sqlUpper.includes('LIMIT')) {
    warnings.push('⚠️ No WHERE clause detected - this may result in a full table scan');
  }
  
  // Check for missing LIMIT on large result sets
  if (!sqlUpper.includes('LIMIT') && !sqlUpper.includes('COUNT') && !sqlUpper.includes('SUM') && !sqlUpper.includes('AVG')) {
    warnings.push('⚠️ No LIMIT clause - query may return a large number of rows');
  }
  
  // Check for multiple table joins without filters
  if (affectedTables.length > 2 && !sqlUpper.includes('WHERE')) {
    warnings.push('⚠️ Multiple table joins without filters - may be expensive');
  }
  
  // Check for LIKE queries without indexes (common pattern)
  if (sqlUpper.includes('LIKE') && sqlUpper.includes('%')) {
    warnings.push('⚠️ LIKE query with wildcard - may not use indexes efficiently');
  }
  
  // Check for aggregation on large tables
  if (intent.aggregationType && affectedTables.length > 0) {
    const primaryTable = affectedTables[0];
    const schema = DATABASE_SCHEMA[primaryTable];
    if (schema) {
      // Check if table likely has many rows (heuristic: no obvious small table indicators)
      if (!primaryTable.includes('user') && !primaryTable.includes('config')) {
        warnings.push('⚠️ Aggregation on potentially large table - may take time');
      }
    }
  }
  
  // Check for time range queries without indexes
  if (intent.timeRange && !sqlUpper.includes('created_at') && !sqlUpper.includes('updated_at')) {
    warnings.push('⚠️ Time range filter may not use timestamp indexes efficiently');
  }
  
  // Check for complex aggregations
  if (sqlUpper.includes('GROUP BY') && affectedTables.length > 1) {
    warnings.push('⚠️ GROUP BY across multiple tables - may be computationally expensive');
  }
  
  // Check for subqueries or CTEs (complex queries)
  if (sqlUpper.includes('SELECT') && (sqlUpper.split('SELECT').length - 1) > 2) {
    warnings.push('⚠️ Complex query with multiple SELECT statements detected');
  }
  
  // Check for missing indexes on foreign keys
  for (const table of affectedTables) {
    const schema = DATABASE_SCHEMA[table];
    if (schema && schema.indexes) {
      // Check if common filter columns have indexes
      const hasCommonIndexes = schema.indexes.some(idx => 
        idx.includes('status') || 
        idx.includes('created_at') || 
        idx.includes('assigned')
      );
      if (!hasCommonIndexes && sqlUpper.includes('WHERE')) {
        warnings.push(`⚠️ Table "${table}" may benefit from additional indexes on filtered columns`);
      }
    }
  }
  
  return warnings;
}

/**
 * Estimate number of rows that would be returned
 * This is a rough estimate based on query characteristics
 */
function estimateRows(
  sql: string,
  intent: any,
  affectedTables: string[]
): number {
  const sqlUpper = sql.toUpperCase();
  
  // If it's a COUNT query, estimate based on table size
  if (sqlUpper.includes('COUNT')) {
    // Rough estimates for common tables
    const tableSizeEstimates: Record<string, number> = {
      'contacts': 1000,
      'accounts': 500,
      'sub_accounts': 2000,
      'activities': 5000,
      'leads': 800,
      'quotes_mbcb': 300,
      'quotes_signages': 200,
      'quotes_paint': 150,
      'follow_ups': 400,
    };
    
    const primaryTable = affectedTables[0];
    const baseEstimate = tableSizeEstimates[primaryTable] || 1000;
    
    // Apply filters (reduce estimate if filters present)
    if (sqlUpper.includes('WHERE')) {
      return Math.floor(baseEstimate * 0.3); // Assume filters reduce by 70%
    }
    
    return baseEstimate;
  }
  
  // If it's an aggregation, return 1 (single result)
  if (sqlUpper.includes('SUM') || sqlUpper.includes('AVG') || sqlUpper.includes('MAX') || sqlUpper.includes('MIN')) {
    if (!sqlUpper.includes('GROUP BY')) {
      return 1;
    }
    // With GROUP BY, estimate number of groups
    return Math.min(50, affectedTables.length * 10);
  }
  
  // Regular SELECT query
  let estimate = 100; // Default estimate
  
  // Adjust based on table
  const primaryTable = affectedTables[0];
  const tableSizeEstimates: Record<string, number> = {
    'contacts': 1000,
    'accounts': 500,
    'sub_accounts': 2000,
    'activities': 5000,
    'leads': 800,
    'quotes_mbcb': 300,
    'quotes_signages': 200,
    'quotes_paint': 150,
    'follow_ups': 400,
  };
  
  estimate = tableSizeEstimates[primaryTable] || 1000;
  
  // Apply filters
  if (sqlUpper.includes('WHERE')) {
    estimate = Math.floor(estimate * 0.2); // Filters typically reduce results significantly
  }
  
  // Apply LIMIT if present
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    estimate = Math.min(estimate, parseInt(limitMatch[1], 10));
  }
  
  // Multiple tables increase estimate
  if (affectedTables.length > 1) {
    estimate = Math.floor(estimate * affectedTables.length * 0.5);
  }
  
  return Math.max(1, estimate); // At least 1 row
}

/**
 * POST handler for query explanation
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Get user from auth session
    const userId = await getUserFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: User not found. Please provide x-user-id header or authenticate.' },
        { status: 401 }
      );
    }
    
    // Step 2: Parse and validate request body
    let body: QueryExplainRequest;
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
    
    // Step 3: Fetch user context
    let userContext: UserContext;
    try {
      userContext = await fetchUserContext(userId);
    } catch (error: any) {
      console.error('[Query Explain] Error fetching user context:', error.message);
      userContext = {
        userId,
        role: 'user',
      };
    }
    
    // Step 4: Classify intent
    let classificationResult;
    try {
      classificationResult = await classifyIntent(question, userContext);
    } catch (error: any) {
      console.error('[Query Explain] Error classifying intent:', error.message);
      return NextResponse.json(
        {
          error: 'Failed to classify intent',
          message: error.message || 'An error occurred while analyzing the question',
        },
        { status: 500 }
      );
    }
    
    // Step 5: Build query
    let queryResult;
    try {
      const queryBuilder = createQueryBuilder();
      queryResult = await queryBuilder.buildQuery(classificationResult.intent, userContext);
    } catch (error: any) {
      console.error('[Query Explain] Error building query:', error.message);
      return NextResponse.json(
        {
          error: 'Failed to build query',
          message: error.message || 'An error occurred while building the SQL query',
          intent: classificationResult.intent,
        },
        { status: 500 }
      );
    }
    
    // Step 6: Analyze query for warnings
    const warnings = analyzeQueryForWarnings(
      queryResult.sql,
      classificationResult.intent,
      queryResult.affectedTables
    );
    
    // Step 7: Estimate rows
    const estimatedRows = estimateRows(
      queryResult.sql,
      classificationResult.intent,
      queryResult.affectedTables
    );
    
    // Step 8: Build and return response
    const response: QueryExplainResponse = {
      sql: queryResult.sql,
      explanation: queryResult.explanation,
      affectedTables: queryResult.affectedTables,
      estimatedRows,
      warnings,
    };
    
    return NextResponse.json(response, {
      status: 200,
    });
  } catch (error: any) {
    console.error('[Query Explain] Unexpected error:', error);
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
    service: 'Query Explain API',
    description: 'Explain what SQL query would be executed without actually running it',
    usage: {
      method: 'POST',
      body: {
        question: 'string (required) - The question to explain',
      },
      response: {
        sql: 'string - The SQL query that would be executed',
        explanation: 'string - Human-readable explanation of the query',
        affectedTables: 'string[] - Tables that would be queried',
        estimatedRows: 'number - Estimated number of rows returned',
        warnings: 'string[] - Warnings about potentially expensive operations',
      },
    },
    warnings: {
      description: 'Warnings are generated for:',
      items: [
        'Full table scans (no WHERE clause)',
        'Missing LIMIT on large result sets',
        'Multiple table joins without filters',
        'LIKE queries with wildcards',
        'Aggregations on large tables',
        'Time range queries without proper indexes',
        'Complex GROUP BY operations',
        'Missing indexes on filtered columns',
      ],
    },
  });
}

