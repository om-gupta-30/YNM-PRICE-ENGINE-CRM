-- Migration: Create engagement_history table for tracking engagement score trends
-- This table stores daily snapshots of engagement scores for sub-accounts

DO $$
BEGIN
  -- Create engagement_history table if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'engagement_history'
  ) THEN
    CREATE TABLE engagement_history (
      id SERIAL PRIMARY KEY,
      sub_account_id INTEGER NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
      score NUMERIC NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_engagement_history_sub_account_id 
      ON engagement_history(sub_account_id);
    CREATE INDEX IF NOT EXISTS idx_engagement_history_created_at 
      ON engagement_history(created_at DESC);
    
    -- Create composite index for common query pattern (sub_account_id + date range)
    CREATE INDEX IF NOT EXISTS idx_engagement_history_sub_account_created 
      ON engagement_history(sub_account_id, created_at DESC);
  END IF;
END $$;
