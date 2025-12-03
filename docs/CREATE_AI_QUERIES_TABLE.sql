-- ============================================
-- CREATE AI QUERIES LOGGING TABLE
-- ============================================
-- This table logs all AI assistant interactions for analytics and debugging
-- Run this SQL in your Supabase SQL Editor

-- Drop existing table if it exists (optional, remove if you want to preserve data)
-- DROP TABLE IF EXISTS ai_queries;

-- ============================================
-- CREATE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                              -- Username who made the query
  mode TEXT NOT NULL CHECK (mode IN ('coach', 'query')), -- 'coach' = AI reasoning, 'query' = database lookup
  question TEXT NOT NULL,                             -- Original user question
  result JSONB,                                       -- Response data (reply + query results)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()   -- When the query was made
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_ai_queries_user_id ON ai_queries(user_id);

-- Index for mode filtering
CREATE INDEX IF NOT EXISTS idx_ai_queries_mode ON ai_queries(mode);

-- Index for time-based queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_ai_queries_created_at ON ai_queries(created_at DESC);

-- Composite index for user + time (common query pattern)
CREATE INDEX IF NOT EXISTS idx_ai_queries_user_time ON ai_queries(user_id, created_at DESC);

-- ============================================
-- EXAMPLE QUERIES
-- ============================================

-- Get recent queries for a specific user
-- SELECT * FROM ai_queries WHERE user_id = 'Employee1' ORDER BY created_at DESC LIMIT 20;

-- Get query statistics by mode
-- SELECT mode, COUNT(*) as count FROM ai_queries GROUP BY mode;

-- Get most common questions (last 7 days)
-- SELECT question, COUNT(*) as count 
-- FROM ai_queries 
-- WHERE created_at > NOW() - INTERVAL '7 days'
-- GROUP BY question 
-- ORDER BY count DESC 
-- LIMIT 10;

-- Get user activity summary
-- SELECT 
--   user_id, 
--   COUNT(*) as total_queries,
--   COUNT(CASE WHEN mode = 'coach' THEN 1 END) as coach_queries,
--   COUNT(CASE WHEN mode = 'query' THEN 1 END) as data_queries
-- FROM ai_queries 
-- WHERE created_at > NOW() - INTERVAL '30 days'
-- GROUP BY user_id 
-- ORDER BY total_queries DESC;

-- ============================================
-- CLEANUP OLD LOGS (OPTIONAL)
-- ============================================
-- Uncomment and run periodically to clean old logs

-- Delete logs older than 90 days
-- DELETE FROM ai_queries WHERE created_at < NOW() - INTERVAL '90 days';

-- ============================================
-- ROW LEVEL SECURITY (OPTIONAL)
-- ============================================
-- If you want to restrict access based on user roles

-- ALTER TABLE ai_queries ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own queries
-- CREATE POLICY "Users can view own queries"
--   ON ai_queries FOR SELECT
--   USING (auth.uid()::text = user_id);

-- Allow admins to see all queries
-- CREATE POLICY "Admins can view all queries"
--   ON ai_queries FOR SELECT
--   USING (EXISTS (
--     SELECT 1 FROM users 
--     WHERE users.username = auth.uid()::text 
--     AND users.role = 'admin'
--   ));

-- ============================================
-- DONE! ✅
-- ============================================
-- The ai_queries table is now ready to log AI assistant interactions
