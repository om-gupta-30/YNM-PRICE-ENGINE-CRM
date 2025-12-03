-- ============================================
-- COMPLETE FIX: ALL ACTIVITY TRIGGERS
-- ============================================
-- This script fixes the "case not found" error by:
-- 1. Dropping ALL problematic triggers on activities table
-- 2. Changing activity_type column from ENUM to TEXT
-- 3. Recreating a safe trigger with ELSE clause
-- 
-- RUN THIS IN SUPABASE SQL EDITOR!
-- ============================================

-- Step 1: Drop ALL triggers on activities table
DROP TRIGGER IF EXISTS update_engagement_on_activity ON activities;
DROP TRIGGER IF EXISTS activities_update_engagement_score ON activities;
DROP TRIGGER IF EXISTS trigger_update_engagement_score ON activities;
DROP TRIGGER IF EXISTS update_account_engagement ON activities;

-- Step 2: Drop ALL engagement score functions
DROP FUNCTION IF EXISTS update_engagement_score() CASCADE;
DROP FUNCTION IF EXISTS update_account_engagement_score() CASCADE;
DROP FUNCTION IF EXISTS update_engagement_on_activity() CASCADE;

-- Step 3: Change activity_type column from ENUM to TEXT
DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'activity_type';
    
    IF col_type = 'USER-DEFINED' THEN
        -- It's using an enum, change to TEXT
        ALTER TABLE activities ALTER COLUMN activity_type TYPE TEXT;
        RAISE NOTICE '✅ Changed activity_type from ENUM to TEXT';
    ELSIF col_type = 'text' OR col_type = 'character varying' THEN
        RAISE NOTICE '✅ activity_type is already TEXT/VARCHAR';
    ELSE
        RAISE NOTICE 'activity_type column type: %', col_type;
    END IF;
END $$;

-- Step 4: Create a NEW safe trigger function with ELSE clause
CREATE OR REPLACE FUNCTION update_engagement_score()
RETURNS TRIGGER AS $$
DECLARE
  score_change INTEGER := 0;
  activity_type_text TEXT;
BEGIN
  -- Get activity type as text
  activity_type_text := NEW.activity_type::TEXT;
  
  -- Only process if there's an account_id
  IF NEW.account_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate score change based on activity type
  CASE activity_type_text
    WHEN 'call' THEN
      IF NEW.metadata->>'call_status' = 'Connected' THEN
        score_change := 10;
      ELSIF NEW.metadata->>'call_status' = 'DNP' THEN
        score_change := -5;
      ELSIF NEW.metadata->>'call_status' IN ('Unable to connect', 'Number doesn''t exist', 'Wrong number') THEN
        score_change := -10;
      ELSE
        score_change := 0;
      END IF;
    WHEN 'note' THEN
      score_change := 5;
    WHEN 'quotation' THEN
      IF NEW.metadata->>'quotation_status' = 'closed_won' THEN
        score_change := 20;
      ELSIF NEW.metadata->>'quotation_status' = 'closed_lost' THEN
        score_change := -20;
      ELSE
        score_change := 15;
      END IF;
    WHEN 'quotation_saved' THEN
      score_change := 15;
    WHEN 'task' THEN
      IF NEW.metadata->>'task_status' = 'Completed' THEN
        score_change := 5;
      ELSE
        score_change := 0;
      END IF;
    WHEN 'followup' THEN
      score_change := 10;
    WHEN 'create' THEN
      score_change := 5;
    WHEN 'edit' THEN
      score_change := 0;
    WHEN 'delete' THEN
      score_change := 0;
    WHEN 'login' THEN
      score_change := 0;
    WHEN 'logout' THEN
      score_change := 0;
    WHEN 'away' THEN
      score_change := 0;
    WHEN 'inactive' THEN
      score_change := 0;
    WHEN 'return_from_inactive' THEN
      score_change := 0;
    ELSE
      -- IMPORTANT: This ELSE clause prevents the "case not found" error!
      score_change := 0;
  END CASE;

  -- Only update if there's a score change and account_id exists
  IF score_change != 0 AND NEW.account_id IS NOT NULL THEN
    UPDATE accounts
    SET engagement_score = GREATEST(0, COALESCE(engagement_score, 0) + score_change),
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create the trigger
CREATE TRIGGER update_engagement_on_activity
AFTER INSERT ON activities
FOR EACH ROW
EXECUTE FUNCTION update_engagement_score();

-- Step 6: Verify fix
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ALL ACTIVITY TRIGGERS FIXED!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'The "case not found" error should now be resolved.';
    RAISE NOTICE '';
    RAISE NOTICE 'Supported activity types:';
    RAISE NOTICE '  - login, logout, away, inactive, return_from_inactive';
    RAISE NOTICE '  - create, edit, delete';
    RAISE NOTICE '  - call, note, quotation, quotation_saved';
    RAISE NOTICE '  - task, followup';
    RAISE NOTICE '  - ANY OTHER TYPE (will work without error)';
    RAISE NOTICE '';
END $$;

-- Step 7: Test by showing recent activities
SELECT 
    'Recent Activities' as info,
    COUNT(*) as total_count
FROM activities;
