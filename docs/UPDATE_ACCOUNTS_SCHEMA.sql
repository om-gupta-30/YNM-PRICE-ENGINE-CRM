-- SQL Query to Update Accounts and Sub-Accounts Schema
-- Run this in Supabase SQL Editor
-- This ensures:
-- 1. Main accounts (parent accounts) don't require state/city
-- 2. Sub-accounts require state/city

-- Step 1: Make state_id and city_id nullable for accounts table (parent accounts don't need location)
ALTER TABLE IF EXISTS accounts 
  ALTER COLUMN state_id DROP NOT NULL,
  ALTER COLUMN city_id DROP NOT NULL;

-- Step 2: Ensure sub_accounts table has state_id and city_id as required fields
-- First, check if columns exist, if not add them
DO $$
BEGIN
  -- Add state_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sub_accounts' AND column_name = 'state_id'
  ) THEN
    ALTER TABLE sub_accounts ADD COLUMN state_id INTEGER REFERENCES states(id);
  END IF;

  -- Add city_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sub_accounts' AND column_name = 'city_id'
  ) THEN
    ALTER TABLE sub_accounts ADD COLUMN city_id INTEGER REFERENCES cities(id);
  END IF;
END $$;

-- Step 3: Make state_id and city_id NOT NULL for sub_accounts (sub-accounts need location)
-- Note: This will fail if there are existing sub_accounts without state/city
-- If you have existing data, update them first or set default values
DO $$
BEGIN
  -- Check if there are any NULL values
  IF EXISTS (SELECT 1 FROM sub_accounts WHERE state_id IS NULL OR city_id IS NULL) THEN
    RAISE NOTICE 'Warning: Some sub_accounts have NULL state_id or city_id. Please update them before making these fields required.';
    -- You can set a default state/city for existing records if needed:
    -- UPDATE sub_accounts SET state_id = 1, city_id = 1 WHERE state_id IS NULL OR city_id IS NULL;
  ELSE
    -- Only make NOT NULL if all records have values
    ALTER TABLE sub_accounts 
      ALTER COLUMN state_id SET NOT NULL,
      ALTER COLUMN city_id SET NOT NULL;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not set NOT NULL constraints. Please ensure all sub_accounts have state_id and city_id values first.';
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sub_accounts_state_id ON sub_accounts(state_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_city_id ON sub_accounts(city_id);

-- Step 5: Add comments for documentation
COMMENT ON COLUMN accounts.state_id IS 'State ID (nullable - parent accounts may not have a specific location)';
COMMENT ON COLUMN accounts.city_id IS 'City ID (nullable - parent accounts may not have a specific location)';
COMMENT ON COLUMN sub_accounts.state_id IS 'State ID (required - sub-accounts must have a location)';
COMMENT ON COLUMN sub_accounts.city_id IS 'City ID (required - sub-accounts must have a location)';

-- Verification query (run this to check the schema)
-- SELECT 
--   table_name,
--   column_name,
--   is_nullable,
--   data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('accounts', 'sub_accounts')
--   AND column_name IN ('state_id', 'city_id')
-- ORDER BY table_name, column_name;

