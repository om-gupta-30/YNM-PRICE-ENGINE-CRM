-- SQL Migration Script: Update Sub-Accounts and Accounts Schema
-- This script adds pincode and is_headquarter to sub_accounts
-- and adds industry_projects to accounts
-- Also removes state_id, city_id, address from accounts (these are now only in sub_accounts)

-- 1. Add pincode and is_headquarter to sub_accounts table
DO $$ 
BEGIN
  -- Add pincode column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sub_accounts' AND column_name = 'pincode'
  ) THEN
    ALTER TABLE sub_accounts ADD COLUMN pincode TEXT;
    CREATE INDEX IF NOT EXISTS idx_sub_accounts_pincode ON sub_accounts(pincode);
  END IF;

  -- Add is_headquarter column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sub_accounts' AND column_name = 'is_headquarter'
  ) THEN
    ALTER TABLE sub_accounts ADD COLUMN is_headquarter BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_sub_accounts_is_headquarter ON sub_accounts(is_headquarter);
  END IF;
END $$;

-- 2. Add industry_projects to accounts table (JSONB to store project counts per industry/sub-industry)
DO $$ 
BEGIN
  -- Add industry_projects column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'industry_projects'
  ) THEN
    ALTER TABLE accounts ADD COLUMN industry_projects JSONB DEFAULT '{}'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_accounts_industry_projects ON accounts USING GIN (industry_projects);
  END IF;
END $$;

-- 3. Remove location fields from accounts (state_id, city_id, address)
-- Note: We don't drop columns to preserve existing data, but they won't be used
-- If you want to completely remove them, uncomment the following:
-- ALTER TABLE accounts DROP COLUMN IF EXISTS state_id;
-- ALTER TABLE accounts DROP COLUMN IF EXISTS city_id;
-- ALTER TABLE accounts DROP COLUMN IF EXISTS address;

-- 4. Add comments for documentation
COMMENT ON COLUMN sub_accounts.pincode IS 'Pincode/postal code for the sub-account location';
COMMENT ON COLUMN sub_accounts.is_headquarter IS 'Boolean flag indicating if this sub-account is a headquarter';
COMMENT ON COLUMN accounts.industry_projects IS 'JSONB object storing number of projects per industry/sub-industry combination. Format: {"industry_id-sub_industry_id": number_of_projects}';

-- Verify changes
SELECT 
  'sub_accounts' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sub_accounts' 
  AND column_name IN ('pincode', 'is_headquarter')
UNION ALL
SELECT 
  'accounts' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'accounts' 
  AND column_name = 'industry_projects';

