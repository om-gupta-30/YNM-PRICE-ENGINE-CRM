-- ============================================
-- COMPLETE SQL MIGRATION: Accounts & Sub-Accounts Schema Update
-- This script implements ALL recent changes:
-- 1. Removes location fields (state_id, city_id, address) from accounts table
-- 2. Adds industry_projects (JSONB) to accounts table
-- 3. Adds pincode (TEXT) to sub_accounts table
-- 4. Adds is_headquarter (BOOLEAN) to sub_accounts table
-- 
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: UPDATE ACCOUNTS TABLE
-- ============================================

-- 1.1 Add industry_projects column to accounts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'industry_projects'
  ) THEN
    ALTER TABLE accounts ADD COLUMN industry_projects JSONB DEFAULT '{}'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_accounts_industry_projects ON accounts USING GIN (industry_projects);
    RAISE NOTICE '✅ Added industry_projects column to accounts table';
  ELSE
    RAISE NOTICE 'ℹ️ industry_projects column already exists on accounts table';
  END IF;
END $$;

-- 1.2 Remove location fields from accounts (state_id, city_id, address)
-- NOTE: These columns are being removed as location is now only stored in sub_accounts
DO $$ 
BEGIN
  -- Drop state_id column and its index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'state_id'
  ) THEN
    DROP INDEX IF EXISTS idx_accounts_state_id;
    ALTER TABLE accounts DROP COLUMN IF EXISTS state_id;
    RAISE NOTICE '✅ Removed state_id column from accounts table';
  ELSE
    RAISE NOTICE 'ℹ️ state_id column does not exist on accounts table';
  END IF;

  -- Drop city_id column and its index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'city_id'
  ) THEN
    DROP INDEX IF EXISTS idx_accounts_city_id;
    ALTER TABLE accounts DROP COLUMN IF EXISTS city_id;
    RAISE NOTICE '✅ Removed city_id column from accounts table';
  ELSE
    RAISE NOTICE 'ℹ️ city_id column does not exist on accounts table';
  END IF;

  -- Drop address column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'address'
  ) THEN
    ALTER TABLE accounts DROP COLUMN IF EXISTS address;
    RAISE NOTICE '✅ Removed address column from accounts table';
  ELSE
    RAISE NOTICE 'ℹ️ address column does not exist on accounts table';
  END IF;
END $$;

-- ============================================
-- PART 2: UPDATE SUB_ACCOUNTS TABLE
-- ============================================

-- 2.1 Add pincode column to sub_accounts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sub_accounts' AND column_name = 'pincode'
  ) THEN
    ALTER TABLE sub_accounts ADD COLUMN pincode TEXT;
    CREATE INDEX IF NOT EXISTS idx_sub_accounts_pincode ON sub_accounts(pincode);
    RAISE NOTICE '✅ Added pincode column to sub_accounts table';
  ELSE
    RAISE NOTICE 'ℹ️ pincode column already exists on sub_accounts table';
  END IF;
END $$;

-- 2.2 Add is_headquarter column to sub_accounts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sub_accounts' AND column_name = 'is_headquarter'
  ) THEN
    ALTER TABLE sub_accounts ADD COLUMN is_headquarter BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_sub_accounts_is_headquarter ON sub_accounts(is_headquarter);
    RAISE NOTICE '✅ Added is_headquarter column to sub_accounts table';
  ELSE
    RAISE NOTICE 'ℹ️ is_headquarter column already exists on sub_accounts table';
  END IF;
END $$;

-- ============================================
-- PART 3: ADD COLUMN COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON COLUMN accounts.industry_projects IS 'JSONB object storing number of projects per industry/sub-industry combination. Format: {"industry_id-sub_industry_id": number_of_projects}. Example: {"1-5": 10, "2-8": 5} means 10 projects for industry 1 sub-industry 5, and 5 projects for industry 2 sub-industry 8';

COMMENT ON COLUMN sub_accounts.pincode IS 'Pincode/postal code for the sub-account location';

COMMENT ON COLUMN sub_accounts.is_headquarter IS 'Boolean flag indicating if this sub-account is a headquarter location. Used for filtering and identification purposes';

-- ============================================
-- PART 4: VERIFY ALL CHANGES
-- ============================================
-- This query shows the current state of both tables

-- Check accounts table changes
SELECT 
  'accounts' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'accounts' 
  AND (
    column_name = 'industry_projects'
    OR column_name IN ('state_id', 'city_id', 'address') -- These should NOT exist after migration
  )
ORDER BY 
  CASE 
    WHEN column_name = 'industry_projects' THEN 1
    ELSE 2
  END,
  column_name;

-- Check sub_accounts table changes
SELECT 
  'sub_accounts' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'sub_accounts' 
  AND column_name IN ('pincode', 'is_headquarter')
ORDER BY column_name;

-- ============================================
-- PART 5: SUMMARY REPORT
-- ============================================
DO $$
DECLARE
  accounts_industry_projects_exists BOOLEAN;
  accounts_state_id_exists BOOLEAN;
  accounts_city_id_exists BOOLEAN;
  accounts_address_exists BOOLEAN;
  sub_accounts_pincode_exists BOOLEAN;
  sub_accounts_headquarter_exists BOOLEAN;
BEGIN
  -- Check accounts table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'industry_projects'
  ) INTO accounts_industry_projects_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'state_id'
  ) INTO accounts_state_id_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'city_id'
  ) INTO accounts_city_id_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'address'
  ) INTO accounts_address_exists;
  
  -- Check sub_accounts table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sub_accounts' AND column_name = 'pincode'
  ) INTO sub_accounts_pincode_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sub_accounts' AND column_name = 'is_headquarter'
  ) INTO sub_accounts_headquarter_exists;
  
  -- Print summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION SUMMARY REPORT';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'ACCOUNTS TABLE:';
  RAISE NOTICE '  ✅ industry_projects: %', CASE WHEN accounts_industry_projects_exists THEN 'ADDED' ELSE 'MISSING' END;
  RAISE NOTICE '  % state_id: %', 
    CASE WHEN accounts_state_id_exists THEN '❌ STILL EXISTS' ELSE '✅ REMOVED' END,
    CASE WHEN accounts_state_id_exists THEN '(should be removed)' ELSE '' END;
  RAISE NOTICE '  % city_id: %', 
    CASE WHEN accounts_city_id_exists THEN '❌ STILL EXISTS' ELSE '✅ REMOVED' END,
    CASE WHEN accounts_city_id_exists THEN '(should be removed)' ELSE '' END;
  RAISE NOTICE '  % address: %', 
    CASE WHEN accounts_address_exists THEN '❌ STILL EXISTS' ELSE '✅ REMOVED' END,
    CASE WHEN accounts_address_exists THEN '(should be removed)' ELSE '' END;
  RAISE NOTICE '';
  RAISE NOTICE 'SUB_ACCOUNTS TABLE:';
  RAISE NOTICE '  ✅ pincode: %', CASE WHEN sub_accounts_pincode_exists THEN 'ADDED' ELSE 'MISSING' END;
  RAISE NOTICE '  ✅ is_headquarter: %', CASE WHEN sub_accounts_headquarter_exists THEN 'ADDED' ELSE 'MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
  -- Final status
  IF accounts_industry_projects_exists 
     AND NOT accounts_state_id_exists 
     AND NOT accounts_city_id_exists 
     AND NOT accounts_address_exists
     AND sub_accounts_pincode_exists 
     AND sub_accounts_headquarter_exists THEN
    RAISE NOTICE '✅ ALL CHANGES APPLIED SUCCESSFULLY!';
  ELSE
    RAISE NOTICE '⚠️  SOME CHANGES MAY BE INCOMPLETE. Please review the report above.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
