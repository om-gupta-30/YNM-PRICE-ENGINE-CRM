-- ============================================
-- Add AI Insights Column to Sub-Accounts Table
-- This script adds ai_insights column to store AI-generated engagement insights
-- Run this in your Supabase SQL Editor
-- ============================================

DO $$
BEGIN
    -- Add ai_insights column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'ai_insights'
    ) THEN
        ALTER TABLE sub_accounts 
        ADD COLUMN ai_insights TEXT;
        
        RAISE NOTICE '✅ Added ai_insights column to sub_accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ ai_insights column already exists on sub_accounts table';
    END IF;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT 
    'SUB_ACCOUNTS TABLE' as table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sub_accounts' 
AND column_name = 'ai_insights';
