-- ============================================
-- FIX ACTIVITY TYPE TRIGGER
-- ============================================
-- This script fixes the "case not found" error by:
-- 1. Adding all activity types to the enum
-- 2. Updating the trigger with an ELSE clause
-- 
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add all activity types to the enum (if they don't exist)
DO $$
BEGIN
    -- Add 'login' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'login' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')) THEN
        ALTER TYPE activity_type_enum ADD VALUE 'login';
        RAISE NOTICE 'Added "login" to activity_type_enum';
    END IF;
    
    -- Add 'logout' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'logout' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')) THEN
        ALTER TYPE activity_type_enum ADD VALUE 'logout';
        RAISE NOTICE 'Added "logout" to activity_type_enum';
    END IF;
    
    -- Add 'away' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'away' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')) THEN
        ALTER TYPE activity_type_enum ADD VALUE 'away';
        RAISE NOTICE 'Added "away" to activity_type_enum';
    END IF;
    
    -- Add 'inactive' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'inactive' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')) THEN
        ALTER TYPE activity_type_enum ADD VALUE 'inactive';
        RAISE NOTICE 'Added "inactive" to activity_type_enum';
    END IF;
    
    -- Add 'edit' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'edit' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')) THEN
        ALTER TYPE activity_type_enum ADD VALUE 'edit';
        RAISE NOTICE 'Added "edit" to activity_type_enum';
    END IF;
    
    -- Add 'delete' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'delete' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')) THEN
        ALTER TYPE activity_type_enum ADD VALUE 'delete';
        RAISE NOTICE 'Added "delete" to activity_type_enum';
    END IF;
    
    -- Add 'create' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'create' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')) THEN
        ALTER TYPE activity_type_enum ADD VALUE 'create';
        RAISE NOTICE 'Added "create" to activity_type_enum';
    END IF;
    
    -- Add 'quotation_saved' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'quotation_saved' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')) THEN
        ALTER TYPE activity_type_enum ADD VALUE 'quotation_saved';
        RAISE NOTICE 'Added "quotation_saved" to activity_type_enum';
    END IF;
    
    -- Add 'return_from_inactive' if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'return_from_inactive' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')) THEN
        ALTER TYPE activity_type_enum ADD VALUE 'return_from_inactive';
        RAISE NOTICE 'Added "return_from_inactive" to activity_type_enum';
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'activity_type_enum does not exist, will use TEXT column instead';
END $$;

-- Step 2: Drop existing trigger
DROP TRIGGER IF EXISTS update_engagement_on_activity ON activities;
DROP FUNCTION IF EXISTS update_engagement_score();

-- Step 3: Create updated function with ELSE clause
CREATE OR REPLACE FUNCTION update_engagement_score()
RETURNS TRIGGER AS $$
DECLARE
  score_change INTEGER := 0;
  activity_type_text TEXT;
BEGIN
  -- Get activity type as text (handles both enum and text columns)
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
      END IF;
    WHEN 'followup' THEN
      score_change := 10;
    WHEN 'create' THEN
      -- Creating accounts/contacts/sub-accounts is positive
      score_change := 5;
    WHEN 'edit' THEN
      -- Editing is neutral - just tracking
      score_change := 0;
    WHEN 'delete' THEN
      -- Deleting is neutral - just tracking
      score_change := 0;
    WHEN 'login' THEN
      -- Login/logout don't affect engagement score
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
      -- For any other activity type, no score change (but don't error!)
      score_change := 0;
  END CASE;

  -- Only update if there's a score change
  IF score_change != 0 THEN
    UPDATE accounts
    SET engagement_score = GREATEST(0, COALESCE(engagement_score, 0) + score_change),
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.account_id;
  ELSE
    -- Still update last_activity_at for tracking purposes (except login/logout)
    IF activity_type_text NOT IN ('login', 'logout', 'away', 'inactive') THEN
      UPDATE accounts
      SET last_activity_at = NOW(),
          updated_at = NOW()
      WHERE id = NEW.account_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the trigger
CREATE TRIGGER update_engagement_on_activity
AFTER INSERT ON activities
FOR EACH ROW
EXECUTE FUNCTION update_engagement_score();

-- Step 5: Verify the fix
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Activity type trigger has been fixed!';
    RAISE NOTICE '';
    RAISE NOTICE 'Supported activity types:';
    RAISE NOTICE '  - call (engagement: +10/-5/-10 based on status)';
    RAISE NOTICE '  - note (engagement: +5)';
    RAISE NOTICE '  - quotation (engagement: +15/+20/-20)';
    RAISE NOTICE '  - quotation_saved (engagement: +15)';
    RAISE NOTICE '  - task (engagement: +5 if completed)';
    RAISE NOTICE '  - followup (engagement: +10)';
    RAISE NOTICE '  - create (engagement: +5)';
    RAISE NOTICE '  - edit (tracked, no engagement change)';
    RAISE NOTICE '  - delete (tracked, no engagement change)';
    RAISE NOTICE '  - login (tracked, no engagement change)';
    RAISE NOTICE '  - logout (tracked, no engagement change)';
    RAISE NOTICE '  - away (tracked, no engagement change)';
    RAISE NOTICE '  - inactive (tracked, no engagement change)';
    RAISE NOTICE '  - return_from_inactive (tracked, no engagement change)';
    RAISE NOTICE '  - ANY OTHER (tracked, no engagement change - no error!)';
    RAISE NOTICE '';
END $$;
