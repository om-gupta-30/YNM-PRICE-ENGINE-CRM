/**
 * API Route for AI Monitoring Dashboard
 * Returns aggregated metrics and statistics for AI operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getDailySummary, getPerformanceMetrics, getErrorRate, getRecentErrors } from '@/lib/ai/monitoring';

/**
 * GET /api/admin/ai-monitoring
 * Returns AI monitoring metrics and statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    const userId = searchParams.get('userId') || null;
    const mode = searchParams.get('mode') || null;

    // Build date range
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get today's summary
    const todaySummary = await getDailySummary(new Date());

    // Get performance metrics for the period
    const performanceMetrics = await getPerformanceMetrics(start, end);

    // Get error rate
    const errorRate = await getErrorRate(start, end);

    // Get recent errors
    const recentErrors = await getRecentErrors(20);

    // Get detailed statistics
    const stats = await getDetailedStats(supabase, start, end, userId, mode);

    return NextResponse.json({
      todaySummary,
      performanceMetrics,
      errorRate,
      recentErrors,
      stats,
    });
  } catch (error: any) {
    console.error('[AI Monitoring API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get detailed statistics from database
 */
async function getDetailedStats(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  startDate: Date,
  endDate: Date,
  userId: string | null,
  mode: string | null
) {
  // Build query
  let query = supabase
    .from('ai_operation_logs')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: operations, error } = await query;

  if (error || !operations) {
    return {
      totalQueries: 0,
      totalToday: 0,
      totalThisWeek: 0,
      averageResponseTime: 0,
      slowestQueries: [],
      mostCommonQueries: [],
      mostCommonIntents: [],
      userEngagement: [],
      querySuccessRate: 0,
      modeDistribution: { COACH: 0, QUERY: 0 },
    };
  }

  // Filter by mode if specified
  const filteredOps = mode
    ? operations.filter(op => op.mode === mode)
    : operations;

  // Calculate metrics
  const queryOps = filteredOps.filter(op => op.operation_type === 'QUERY_EXECUTION');
  const intentOps = filteredOps.filter(op => op.operation_type === 'INTENT_CLASSIFICATION');
  const responseOps = filteredOps.filter(op => op.operation_type === 'AI_RESPONSE');

  // Total queries
  const totalQueries = queryOps.length;
  const totalToday = operations.filter(op => {
    const opDate = new Date(op.created_at);
    const today = new Date();
    return opDate.toDateString() === today.toDateString();
  }).length;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const totalThisWeek = operations.filter(op => 
    new Date(op.created_at) >= weekAgo
  ).length;

  // Average response time
  const responseTimes = responseOps
    .map(op => op.execution_time_ms)
    .filter((t): t is number => t !== null && t !== undefined);
  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
    : 0;

  // Slowest queries (top 10)
  const slowestQueries = queryOps
    .filter(op => op.execution_time_ms !== null && op.execution_time_ms !== undefined)
    .sort((a, b) => (b.execution_time_ms || 0) - (a.execution_time_ms || 0))
    .slice(0, 10)
    .map(op => ({
      sql: op.sql_query?.substring(0, 200) || 'N/A',
      executionTime: op.execution_time_ms,
      rowCount: op.row_count,
      timestamp: op.created_at,
      userId: op.user_id,
    }));

  // Most common queries (by question pattern)
  const questionCounts = new Map<string, { count: number; firstSeen: string }>();
  filteredOps
    .filter(op => op.question)
    .forEach(op => {
      const question = op.question.substring(0, 100); // Normalize
      if (!questionCounts.has(question)) {
        questionCounts.set(question, { count: 0, firstSeen: op.created_at });
      }
      const entry = questionCounts.get(question)!;
      entry.count++;
      if (op.created_at < entry.firstSeen) {
        entry.firstSeen = op.created_at;
      }
    });

  const mostCommonQueries = Array.from(questionCounts.entries())
    .map(([question, data]) => ({ question, count: data.count, firstSeen: data.firstSeen }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Most common intents
  const intentCounts = new Map<string, number>();
  intentOps
    .filter(op => op.intent_category)
    .forEach(op => {
      const category = op.intent_category;
      intentCounts.set(category, (intentCounts.get(category) || 0) + 1);
    });

  const mostCommonIntents = Array.from(intentCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // User engagement
  const userCounts = new Map<string, { queries: number; responses: number; errors: number }>();
  filteredOps.forEach(op => {
    if (!userCounts.has(op.user_id)) {
      userCounts.set(op.user_id, { queries: 0, responses: 0, errors: 0 });
    }
    const user = userCounts.get(op.user_id)!;
    if (op.operation_type === 'QUERY_EXECUTION') user.queries++;
    if (op.operation_type === 'AI_RESPONSE') user.responses++;
    if (op.operation_type === 'ERROR') user.errors++;
  });

  const userEngagement = Array.from(userCounts.entries())
    .map(([userId, stats]) => ({
      userId,
      totalOperations: stats.queries + stats.responses + stats.errors,
      queries: stats.queries,
      responses: stats.responses,
      errors: stats.errors,
    }))
    .sort((a, b) => b.totalOperations - a.totalOperations)
    .slice(0, 10);

  // Query success rate
  const successfulQueries = queryOps.filter(op => op.success).length;
  const querySuccessRate = totalQueries > 0
    ? (successfulQueries / totalQueries) * 100
    : 0;

  // Mode distribution
  const modeDistribution = {
    COACH: filteredOps.filter(op => op.mode === 'COACH').length,
    QUERY: filteredOps.filter(op => op.mode === 'QUERY').length,
  };

  return {
    totalQueries,
    totalToday,
    totalThisWeek,
    averageResponseTime: Math.round(averageResponseTime * 100) / 100,
    slowestQueries,
    mostCommonQueries,
    mostCommonIntents,
    userEngagement,
    querySuccessRate: Math.round(querySuccessRate * 100) / 100,
    modeDistribution,
  };
}

