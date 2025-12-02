-- ============================================
-- SQL Migration: Add Office Type to Sub-Accounts
-- This script adds office_type column to sub_accounts table
-- Office types: 'Headquarter', 'Zonal Office', 'Regional Office', 'Site Office'
-- ============================================

-- Add office_type column to sub_accounts table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sub_accounts' AND column_name = 'office_type'
  ) THEN
    ALTER TABLE sub_accounts ADD COLUMN office_type TEXT;
    CREATE INDEX IF NOT EXISTS idx_sub_accounts_office_type ON sub_accounts(office_type);
    RAISE NOTICE '✅ Added office_type column to sub_accounts table';
  ELSE
    RAISE NOTICE 'ℹ️ office_type column already exists on sub_accounts table';
  END IF;
END $$;

-- Add constraint to ensure office_type is one of the valid values (optional, for data integrity)
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sub_accounts_office_type_check'
  ) THEN
    ALTER TABLE sub_accounts 
    ADD CONSTRAINT sub_accounts_office_type_check 
    CHECK (office_type IS NULL OR office_type IN ('Headquarter', 'Zonal Office', 'Regional Office', 'Site Office'));
    RAISE NOTICE '✅ Added office_type constraint to sub_accounts table';
  ELSE
    RAISE NOTICE 'ℹ️ office_type constraint already exists on sub_accounts table';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN sub_accounts.office_type IS 'Type of office: Headquarter, Zonal Office, Regional Office, or Site Office';

-- Verify the change
SELECT 
  'sub_accounts' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sub_accounts' 
  AND column_name = 'office_type';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Added office_type column to sub_accounts';
  RAISE NOTICE 'Valid values: Headquarter, Zonal Office, Regional Office, Site Office';
  RAISE NOTICE '========================================';
END $$;
