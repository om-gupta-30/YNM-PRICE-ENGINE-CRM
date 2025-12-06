-- ============================================
-- CREATE AI SESSIONS TABLE
-- ============================================
-- This table stores session metadata for AI assistant conversations
-- Run this SQL in your Supabase SQL Editor

-- Drop existing table if it exists (optional, remove if you want to preserve data)
-- DROP TABLE IF EXISTS ai_sessions;

-- ============================================
-- CREATE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                              -- User identifier (matches users table)
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- When the session started
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Last activity timestamp
  ended_at TIMESTAMP WITH TIME ZONE,                   -- When the session ended (NULL if active)
  metadata JSONB,                                      -- Additional session metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()    -- When the record was created
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_id ON ai_sessions(user_id);

-- Index for active sessions (ended_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_ai_sessions_active ON ai_sessions(ended_at) WHERE ended_at IS NULL;

-- Index for last activity (for cleanup)
CREATE INDEX IF NOT EXISTS idx_ai_sessions_last_activity ON ai_sessions(last_activity_at);

-- Composite index for user + active sessions
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_active ON ai_sessions(user_id, ended_at) WHERE ended_at IS NULL;

-- ============================================
-- EXAMPLE QUERIES
-- ============================================

-- Get active session for a user
-- SELECT * FROM ai_sessions 
-- WHERE user_id = 'Employee1' AND ended_at IS NULL 
-- ORDER BY last_activity_at DESC 
-- LIMIT 1;

-- Get all sessions for a user
-- SELECT * FROM ai_sessions 
-- WHERE user_id = 'Employee1' 
-- ORDER BY started_at DESC;

-- Get expired sessions (inactive for more than 30 minutes)
-- SELECT * FROM ai_sessions 
-- WHERE ended_at IS NULL 
-- AND last_activity_at < NOW() - INTERVAL '30 minutes';

-- ============================================
-- CLEANUP OLD SESSIONS (OPTIONAL)
-- ============================================
-- Uncomment and run periodically to clean old sessions

-- End sessions older than 30 days
-- UPDATE ai_sessions 
-- SET ended_at = NOW() 
-- WHERE ended_at IS NULL 
-- AND last_activity_at < NOW() - INTERVAL '30 days';

-- ============================================
-- DONE! ✅
-- ============================================
-- The ai_sessions table is now ready to store session metadata

