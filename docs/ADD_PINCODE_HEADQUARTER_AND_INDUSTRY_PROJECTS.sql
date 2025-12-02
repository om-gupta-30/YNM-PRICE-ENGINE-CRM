-- ============================================
-- SQL Migration: Add Pincode, Headquarter Flag, and Industry Projects
-- This script implements the latest changes:
-- 1. Adds pincode and is_headquarter to sub_accounts
-- 2. Adds industry_projects to accounts
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ADD PINCODE AND IS_HEADQUARTER TO SUB_ACCOUNTS TABLE
-- ============================================
DO $$ 
BEGIN
  -- Add pincode column if it doesn't exist
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

  -- Add is_headquarter column if it doesn't exist
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
-- 2. ADD INDUSTRY_PROJECTS TO ACCOUNTS TABLE
-- ============================================
-- This column stores the number of projects per industry/sub-industry combination
-- Format: {"industry_id-sub_industry_id": number_of_projects}
-- Example: {"1-5": 10, "2-8": 5} means 10 projects for industry 1, sub-industry 5
-- and 5 projects for industry 2, sub-industry 8
DO $$ 
BEGIN
  -- Add industry_projects column if it doesn't exist
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

-- ============================================
-- 3. ADD COLUMN COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON COLUMN sub_accounts.pincode IS 'Pincode/postal code for the sub-account location';
COMMENT ON COLUMN sub_accounts.is_headquarter IS 'Boolean flag indicating if this sub-account is a headquarter location';
COMMENT ON COLUMN accounts.industry_projects IS 'JSONB object storing number of projects per industry/sub-industry combination. Format: {"industry_id-sub_industry_id": number_of_projects}';

-- ============================================
-- 4. VERIFY CHANGES
-- ============================================
-- This query will show you the newly added columns
SELECT 
  'sub_accounts' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'sub_accounts' 
  AND column_name IN ('pincode', 'is_headquarter')
UNION ALL
SELECT 
  'accounts' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'accounts' 
  AND column_name = 'industry_projects'
ORDER BY table_name, column_name;

-- ============================================
-- 5. OPTIONAL: REMOVE LOCATION FIELDS FROM ACCOUNTS
-- ============================================
-- NOTE: We are NOT removing state_id, city_id, and address from accounts table
-- to preserve existing data. However, these fields are no longer used in the application.
-- If you want to completely remove them (after backing up data), uncomment the following:

-- ALTER TABLE accounts DROP COLUMN IF EXISTS state_id;
-- ALTER TABLE accounts DROP COLUMN IF EXISTS city_id;
-- ALTER TABLE accounts DROP COLUMN IF EXISTS address;
-- DROP INDEX IF EXISTS idx_accounts_state_id;
-- DROP INDEX IF EXISTS idx_accounts_city_id;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '  • Added pincode to sub_accounts';
  RAISE NOTICE '  • Added is_headquarter to sub_accounts';
  RAISE NOTICE '  • Added industry_projects to accounts';
  RAISE NOTICE '========================================';
END $$;

