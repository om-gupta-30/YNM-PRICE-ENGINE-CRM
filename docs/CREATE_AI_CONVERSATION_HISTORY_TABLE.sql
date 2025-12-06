-- ============================================
-- CREATE AI CONVERSATION HISTORY TABLE
-- ============================================
-- This table stores conversation history for AI assistant interactions
-- Run this SQL in your Supabase SQL Editor

-- Drop existing table if it exists (optional, remove if you want to preserve data)
-- DROP TABLE IF EXISTS ai_conversation_history;

-- ============================================
-- CREATE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ai_conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                              -- User identifier (matches users table)
  session_id UUID NOT NULL DEFAULT gen_random_uuid(), -- Session identifier for grouping conversations
  message TEXT NOT NULL,                              -- User's message
  response TEXT,                                       -- AI's response
  mode TEXT NOT NULL CHECK (mode IN ('COACH', 'QUERY')), -- Conversation mode
  intent JSONB,                                       -- Intent classification data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()   -- When the conversation turn was created
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_ai_conversation_user_id ON ai_conversation_history(user_id);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_ai_conversation_session_id ON ai_conversation_history(session_id);

-- Index for user + session queries (common pattern)
CREATE INDEX IF NOT EXISTS idx_ai_conversation_user_session ON ai_conversation_history(user_id, session_id);

-- Index for time-based queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_ai_conversation_created_at ON ai_conversation_history(created_at DESC);

-- Composite index for user + time (common query pattern)
CREATE INDEX IF NOT EXISTS idx_ai_conversation_user_time ON ai_conversation_history(user_id, created_at DESC);

-- Index for mode filtering
CREATE INDEX IF NOT EXISTS idx_ai_conversation_mode ON ai_conversation_history(mode);

-- ============================================
-- EXAMPLE QUERIES
-- ============================================

-- Get recent conversation history for a user in a session
-- SELECT * FROM ai_conversation_history 
-- WHERE user_id = 'Employee1' AND session_id = '...' 
-- ORDER BY created_at ASC 
-- LIMIT 10;

-- Get all sessions for a user
-- SELECT DISTINCT session_id, MAX(created_at) as last_activity
-- FROM ai_conversation_history 
-- WHERE user_id = 'Employee1'
-- GROUP BY session_id
-- ORDER BY last_activity DESC;

-- Get conversation statistics by mode
-- SELECT mode, COUNT(*) as count 
-- FROM ai_conversation_history 
-- GROUP BY mode;

-- ============================================
-- CLEANUP OLD CONVERSATIONS (OPTIONAL)
-- ============================================
-- Uncomment and run periodically to clean old logs

-- Delete conversations older than 30 days
-- DELETE FROM ai_conversation_history WHERE created_at < NOW() - INTERVAL '30 days';

-- ============================================
-- ROW LEVEL SECURITY (OPTIONAL)
-- ============================================
-- If you want to restrict access based on user roles

-- ALTER TABLE ai_conversation_history ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own conversations
-- CREATE POLICY "Users can view own conversations"
--   ON ai_conversation_history FOR SELECT
--   USING (user_id = current_setting('app.user_id', true));

-- Allow admins to see all conversations
-- CREATE POLICY "Admins can view all conversations"
--   ON ai_conversation_history FOR SELECT
--   USING (EXISTS (
--     SELECT 1 FROM users 
--     WHERE users.id::text = current_setting('app.user_id', true)
--     AND users.role = 'admin'
--   ));

-- ============================================
-- DONE! ✅
-- ============================================
-- The ai_conversation_history table is now ready to store conversation history

