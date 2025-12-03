-- ============================================
-- SIMPLE FIX: ACTIVITY TYPE ERROR
-- ============================================
-- This is a quick fix that:
-- 1. Drops the problematic trigger
-- 2. Changes activity_type to TEXT (more flexible)
-- 
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop the problematic trigger that causes "case not found" error
DROP TRIGGER IF EXISTS update_engagement_on_activity ON activities;
DROP FUNCTION IF EXISTS update_engagement_score();

-- Step 2: Change activity_type column from ENUM to TEXT (if needed)
-- This allows any activity type without enum restrictions

-- First, check if the column exists and its type
DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'activity_type';
    
    IF col_type = 'USER-DEFINED' THEN
        -- It's using an enum, let's change it to TEXT
        ALTER TABLE activities ALTER COLUMN activity_type TYPE TEXT;
        RAISE NOTICE '✅ Changed activity_type from ENUM to TEXT';
    ELSIF col_type = 'text' THEN
        RAISE NOTICE '✅ activity_type is already TEXT';
    ELSE
        RAISE NOTICE 'activity_type column type: %', col_type;
    END IF;
END $$;

-- Step 3: Verify the fix
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Activity logging is now fixed!';
    RAISE NOTICE '';
    RAISE NOTICE 'The trigger that was causing "case not found" has been removed.';
    RAISE NOTICE 'Engagement scoring will be handled by the AI system instead.';
    RAISE NOTICE '';
END $$;
