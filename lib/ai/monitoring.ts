/**
 * AI Operations Monitoring
 * 
 * Logs and tracks AI operations for performance monitoring, error tracking, and analytics.
 * Provides insights into AI usage patterns, performance metrics, and error rates.
 */

import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { QueryIntent, IntentCategory } from './types/intentTypes';

/**
 * Operation types for logging
 */
export type OperationType = 
  | 'INTENT_CLASSIFICATION'
  | 'QUERY_EXECUTION'
  | 'AI_RESPONSE'
  | 'ERROR'
  | 'CACHE_HIT'
  | 'CACHE_MISS';

/**
 * Log entry for intent classification
 */
export interface IntentLogInput {
  userId: string;
  question: string;
  intent: QueryIntent;
  confidence: number;
  executionTime?: number; // milliseconds
}

/**
 * Log entry for query execution
 */
export interface QueryLogInput {
  userId: string;
  sql: string;
  executionTime: number; // milliseconds
  rowCount: number;
  cached?: boolean;
  error?: string;
}

/**
 * Log entry for AI response generation
 */
export interface AIResponseLogInput {
  userId: string;
  question: string;
  answer: string;
  mode: 'COACH' | 'QUERY';
  confidence: number;
  executionTime?: number; // milliseconds
  tokenCount?: number;
}

/**
 * Log entry for errors
 */
export interface ErrorLogInput {
  userId: string;
  operation: string;
  error: Error | string;
  context?: Record<string, any>;
  executionTime?: number; // milliseconds
}

/**
 * Daily summary statistics
 */
export interface DailySummary {
  date: string;
  totalOperations: number;
  intentClassifications: number;
  queryExecutions: number;
  aiResponses: number;
  errors: number;
  averageIntentConfidence: number;
  averageQueryTime: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  totalQueries: number;
  totalCacheHits: number;
  totalCacheMisses: number;
}

/**
 * Performance metrics for a time period
 */
export interface PerformanceMetrics {
  period: string;
  totalOperations: number;
  averageExecutionTime: number;
  p50ExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  errorRate: number;
  successRate: number;
}

/**
 * Log intent classification operation
 * 
 * @param input - Intent classification log data
 */
export async function logIntent(input: IntentLogInput): Promise<void> {
  const startTime = Date.now();
  
  try {
    const supabase = createSupabaseServerClient();
    const executionTime = input.executionTime || (Date.now() - startTime);

    const { error } = await supabase
      .from('ai_operation_logs')
      .insert({
        user_id: input.userId,
        operation_type: 'INTENT_CLASSIFICATION',
        question: input.question,
        intent_category: input.intent.category,
        intent_tables: input.intent.tables,
        intent_filters: input.intent.filters || null,
        intent_aggregation_type: input.intent.aggregationType || null,
        confidence: input.confidence,
        execution_time_ms: executionTime,
        success: true,
        error_message: null,
        metadata: {
          intent: input.intent,
        },
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[AI Monitoring] Error logging intent:', error.message);
      // Don't throw - logging failures shouldn't break the app
    }
  } catch (error: any) {
    console.error('[AI Monitoring] Failed to log intent:', error.message);
    // Silently fail - monitoring is non-critical
  }
}

/**
 * Log query execution operation
 * 
 * @param input - Query execution log data
 */
export async function logQuery(input: QueryLogInput): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from('ai_operation_logs')
      .insert({
        user_id: input.userId,
        operation_type: 'QUERY_EXECUTION',
        sql_query: input.sql,
        execution_time_ms: input.executionTime,
        row_count: input.rowCount,
        success: !input.error,
        error_message: input.error || null,
        metadata: {
          cached: input.cached || false,
        },
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[AI Monitoring] Error logging query:', error.message);
    }
  } catch (error: any) {
    console.error('[AI Monitoring] Failed to log query:', error.message);
  }
}

/**
 * Log AI response generation operation
 * 
 * @param input - AI response log data
 */
export async function logAIResponse(input: AIResponseLogInput): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from('ai_operation_logs')
      .insert({
        user_id: input.userId,
        operation_type: 'AI_RESPONSE',
        question: input.question,
        answer: input.answer.substring(0, 5000), // Limit answer length
        mode: input.mode,
        confidence: input.confidence,
        execution_time_ms: input.executionTime || null,
        success: true,
        error_message: null,
        metadata: {
          tokenCount: input.tokenCount || null,
          answerLength: input.answer.length,
        },
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[AI Monitoring] Error logging AI response:', error.message);
    }
  } catch (error: any) {
    console.error('[AI Monitoring] Failed to log AI response:', error.message);
  }
}

/**
 * Log error operation
 * 
 * @param input - Error log data
 */
export async function logError(input: ErrorLogInput): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();

    const errorMessage = input.error instanceof Error 
      ? input.error.message 
      : String(input.error);

    const errorStack = input.error instanceof Error 
      ? input.error.stack 
      : null;

    const { error } = await supabase
      .from('ai_operation_logs')
      .insert({
        user_id: input.userId,
        operation_type: 'ERROR',
        operation_name: input.operation,
        error_message: errorMessage,
        execution_time_ms: input.executionTime || null,
        success: false,
        metadata: {
          context: input.context || {},
          stack: errorStack,
        },
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[AI Monitoring] Error logging error:', error.message);
    }
  } catch (error: any) {
    console.error('[AI Monitoring] Failed to log error:', error.message);
  }
}

/**
 * Track cache hit/miss
 * 
 * @param userId - User ID
 * @param cacheHit - Whether cache was hit
 * @param executionTime - Time saved by cache (if hit)
 */
export async function logCacheOperation(
  userId: string,
  cacheHit: boolean,
  executionTime?: number
): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from('ai_operation_logs')
      .insert({
        user_id: userId,
        operation_type: cacheHit ? 'CACHE_HIT' : 'CACHE_MISS',
        execution_time_ms: executionTime || null,
        success: true,
        metadata: {
          cacheHit,
        },
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[AI Monitoring] Error logging cache operation:', error.message);
    }
  } catch (error: any) {
    console.error('[AI Monitoring] Failed to log cache operation:', error.message);
  }
}

/**
 * Get daily summary statistics
 * 
 * @param date - Date to get summary for (ISO string or Date object)
 * @returns Daily summary statistics
 */
export async function getDailySummary(date: Date | string): Promise<DailySummary | null> {
  try {
    const supabase = createSupabaseServerClient();
    
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all operations for the day
    const { data: operations, error } = await supabase
      .from('ai_operation_logs')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());

    if (error) {
      console.error('[AI Monitoring] Error fetching daily summary:', error.message);
      return null;
    }

    if (!operations || operations.length === 0) {
      return {
        date: startOfDay.toISOString().split('T')[0],
        totalOperations: 0,
        intentClassifications: 0,
        queryExecutions: 0,
        aiResponses: 0,
        errors: 0,
        averageIntentConfidence: 0,
        averageQueryTime: 0,
        averageResponseTime: 0,
        errorRate: 0,
        cacheHitRate: 0,
        totalQueries: 0,
        totalCacheHits: 0,
        totalCacheMisses: 0,
      };
    }

    // Calculate statistics
    const intentOps = operations.filter(op => op.operation_type === 'INTENT_CLASSIFICATION');
    const queryOps = operations.filter(op => op.operation_type === 'QUERY_EXECUTION');
    const responseOps = operations.filter(op => op.operation_type === 'AI_RESPONSE');
    const errorOps = operations.filter(op => op.operation_type === 'ERROR');
    const cacheHits = operations.filter(op => op.operation_type === 'CACHE_HIT');
    const cacheMisses = operations.filter(op => op.operation_type === 'CACHE_MISS');

    const intentConfidences = intentOps
      .map(op => op.confidence)
      .filter((c): c is number => c !== null && c !== undefined);
    const averageIntentConfidence = intentConfidences.length > 0
      ? intentConfidences.reduce((sum, c) => sum + c, 0) / intentConfidences.length
      : 0;

    const queryTimes = queryOps
      .map(op => op.execution_time_ms)
      .filter((t): t is number => t !== null && t !== undefined);
    const averageQueryTime = queryTimes.length > 0
      ? queryTimes.reduce((sum, t) => sum + t, 0) / queryTimes.length
      : 0;

    const responseTimes = responseOps
      .map(op => op.execution_time_ms)
      .filter((t): t is number => t !== null && t !== undefined);
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
      : 0;

    const totalQueries = cacheHits.length + cacheMisses.length;
    const cacheHitRate = totalQueries > 0
      ? (cacheHits.length / totalQueries) * 100
      : 0;

    const errorRate = operations.length > 0
      ? (errorOps.length / operations.length) * 100
      : 0;

    return {
      date: startOfDay.toISOString().split('T')[0],
      totalOperations: operations.length,
      intentClassifications: intentOps.length,
      queryExecutions: queryOps.length,
      aiResponses: responseOps.length,
      errors: errorOps.length,
      averageIntentConfidence: Math.round(averageIntentConfidence * 100) / 100,
      averageQueryTime: Math.round(averageQueryTime * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      totalQueries,
      totalCacheHits: cacheHits.length,
      totalCacheMisses: cacheMisses.length,
    };
  } catch (error: any) {
    console.error('[AI Monitoring] Error generating daily summary:', error.message);
    return null;
  }
}

/**
 * Get performance metrics for a time period
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Performance metrics
 */
export async function getPerformanceMetrics(
  startDate: Date | string,
  endDate: Date | string
): Promise<PerformanceMetrics | null> {
  try {
    const supabase = createSupabaseServerClient();
    
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    const { data: operations, error } = await supabase
      .from('ai_operation_logs')
      .select('execution_time_ms, success')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .not('execution_time_ms', 'is', null);

    if (error) {
      console.error('[AI Monitoring] Error fetching performance metrics:', error.message);
      return null;
    }

    if (!operations || operations.length === 0) {
      return {
        period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
        totalOperations: 0,
        averageExecutionTime: 0,
        p50ExecutionTime: 0,
        p95ExecutionTime: 0,
        p99ExecutionTime: 0,
        errorRate: 0,
        successRate: 100,
      };
    }

    const executionTimes = operations
      .map(op => op.execution_time_ms)
      .filter((t): t is number => t !== null && t !== undefined)
      .sort((a, b) => a - b);

    const averageExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length
      : 0;

    const p50Index = Math.floor(executionTimes.length * 0.5);
    const p95Index = Math.floor(executionTimes.length * 0.95);
    const p99Index = Math.floor(executionTimes.length * 0.99);

    const p50ExecutionTime = executionTimes[p50Index] || 0;
    const p95ExecutionTime = executionTimes[p95Index] || 0;
    const p99ExecutionTime = executionTimes[p99Index] || 0;

    const errors = operations.filter(op => !op.success);
    const errorRate = operations.length > 0
      ? (errors.length / operations.length) * 100
      : 0;
    const successRate = 100 - errorRate;

    return {
      period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
      totalOperations: operations.length,
      averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
      p50ExecutionTime: Math.round(p50ExecutionTime * 100) / 100,
      p95ExecutionTime: Math.round(p95ExecutionTime * 100) / 100,
      p99ExecutionTime: Math.round(p99ExecutionTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
    };
  } catch (error: any) {
    console.error('[AI Monitoring] Error generating performance metrics:', error.message);
    return null;
  }
}

/**
 * Get error rate for a time period
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Error rate percentage
 */
export async function getErrorRate(
  startDate: Date | string,
  endDate: Date | string
): Promise<number> {
  try {
    const supabase = createSupabaseServerClient();
    
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    const { data: operations, error } = await supabase
      .from('ai_operation_logs')
      .select('success')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (error || !operations || operations.length === 0) {
      return 0;
    }

    const errors = operations.filter(op => !op.success);
    return (errors.length / operations.length) * 100;
  } catch (error: any) {
    console.error('[AI Monitoring] Error calculating error rate:', error.message);
    return 0;
  }
}

/**
 * Get recent errors for debugging
 * 
 * @param limit - Number of recent errors to fetch
 * @returns Array of error log entries
 */
export async function getRecentErrors(limit: number = 50): Promise<any[]> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('ai_operation_logs')
      .select('*')
      .eq('operation_type', 'ERROR')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AI Monitoring] Error fetching recent errors:', error.message);
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('[AI Monitoring] Error fetching recent errors:', error.message);
    return [];
  }
}

/**
 * Clean up old logs (older than specified days)
 * 
 * @param daysToKeep - Number of days of logs to keep
 */
export async function cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
  try {
    const supabase = createSupabaseServerClient();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data, error } = await supabase
      .from('ai_operation_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('[AI Monitoring] Error cleaning up old logs:', error.message);
      return 0;
    }

    return data?.length || 0;
  } catch (error: any) {
    console.error('[AI Monitoring] Error cleaning up old logs:', error.message);
    return 0;
  }
}

