-- AI Operations Monitoring Schema
-- Run this SQL in your Supabase SQL Editor to create the ai_operation_logs table

-- AI Operation Logs table
CREATE TABLE IF NOT EXISTS ai_operation_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'INTENT_CLASSIFICATION',
    'QUERY_EXECUTION',
    'AI_RESPONSE',
    'ERROR',
    'CACHE_HIT',
    'CACHE_MISS'
  )),
  operation_name TEXT, -- For errors, stores the operation that failed
  question TEXT, -- User's question (for intent and response logs)
  answer TEXT, -- AI's answer (for response logs)
  sql_query TEXT, -- SQL query executed (for query logs)
  intent_category TEXT, -- Intent category (for intent logs)
  intent_tables TEXT[], -- Tables involved (for intent logs)
  intent_filters JSONB, -- Filters applied (for intent logs)
  intent_aggregation_type TEXT, -- Aggregation type (for intent logs)
  mode TEXT CHECK (mode IN ('COACH', 'QUERY')), -- Mode for AI responses
  confidence NUMERIC, -- Confidence score (0.0 to 1.0)
  execution_time_ms INTEGER, -- Execution time in milliseconds
  row_count INTEGER, -- Number of rows returned (for query logs)
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT, -- Error message if operation failed
  metadata JSONB, -- Additional metadata (flexible JSON structure)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_operation_logs_user_id ON ai_operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_operation_logs_operation_type ON ai_operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_ai_operation_logs_created_at ON ai_operation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_operation_logs_success ON ai_operation_logs(success);
CREATE INDEX IF NOT EXISTS idx_ai_operation_logs_intent_category ON ai_operation_logs(intent_category);
CREATE INDEX IF NOT EXISTS idx_ai_operation_logs_mode ON ai_operation_logs(mode);

-- Composite index for daily summary queries
-- Using simple column index (date filtering will use created_at index)
CREATE INDEX IF NOT EXISTS idx_ai_operation_logs_date_type ON ai_operation_logs(
  operation_type,
  created_at DESC
);

-- Index for error tracking
CREATE INDEX IF NOT EXISTS idx_ai_operation_logs_errors ON ai_operation_logs(created_at DESC)
WHERE operation_type = 'ERROR';

-- Index for performance metrics
CREATE INDEX IF NOT EXISTS idx_ai_operation_logs_performance ON ai_operation_logs(created_at, execution_time_ms)
WHERE execution_time_ms IS NOT NULL;

-- Function to get daily summary (optional, can be used for faster aggregations)
CREATE OR REPLACE FUNCTION get_ai_daily_summary(target_date DATE)
RETURNS TABLE (
  date DATE,
  total_operations BIGINT,
  intent_classifications BIGINT,
  query_executions BIGINT,
  ai_responses BIGINT,
  errors BIGINT,
  avg_intent_confidence NUMERIC,
  avg_query_time NUMERIC,
  avg_response_time NUMERIC,
  error_rate NUMERIC,
  cache_hit_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    target_date as date,
    COUNT(*)::BIGINT as total_operations,
    COUNT(*) FILTER (WHERE operation_type = 'INTENT_CLASSIFICATION')::BIGINT as intent_classifications,
    COUNT(*) FILTER (WHERE operation_type = 'QUERY_EXECUTION')::BIGINT as query_executions,
    COUNT(*) FILTER (WHERE operation_type = 'AI_RESPONSE')::BIGINT as ai_responses,
    COUNT(*) FILTER (WHERE operation_type = 'ERROR')::BIGINT as errors,
    AVG(confidence) FILTER (WHERE operation_type = 'INTENT_CLASSIFICATION') as avg_intent_confidence,
    AVG(execution_time_ms) FILTER (WHERE operation_type = 'QUERY_EXECUTION') as avg_query_time,
    AVG(execution_time_ms) FILTER (WHERE operation_type = 'AI_RESPONSE') as avg_response_time,
    (COUNT(*) FILTER (WHERE operation_type = 'ERROR')::NUMERIC / NULLIF(COUNT(*), 0) * 100) as error_rate,
    (COUNT(*) FILTER (WHERE operation_type = 'CACHE_HIT')::NUMERIC / 
     NULLIF(COUNT(*) FILTER (WHERE operation_type IN ('CACHE_HIT', 'CACHE_MISS')), 0) * 100) as cache_hit_rate
  FROM ai_operation_logs
  WHERE date_trunc('day', created_at) = target_date::timestamp;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old logs (optional, can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_ai_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_operation_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE ai_operation_logs IS 'Logs all AI operations for monitoring, performance tracking, and analytics';
COMMENT ON COLUMN ai_operation_logs.operation_type IS 'Type of operation: INTENT_CLASSIFICATION, QUERY_EXECUTION, AI_RESPONSE, ERROR, CACHE_HIT, CACHE_MISS';
COMMENT ON COLUMN ai_operation_logs.confidence IS 'Confidence score from 0.0 to 1.0';
COMMENT ON COLUMN ai_operation_logs.execution_time_ms IS 'Execution time in milliseconds';
COMMENT ON COLUMN ai_operation_logs.metadata IS 'Flexible JSON structure for additional operation-specific data';

