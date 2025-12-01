-- ============================================
-- MIGRATION: Remove places_of_supply and customers tables
-- Update quotations to use state_id/city_id
-- ============================================
-- Run this AFTER you've already run the initial database setup
-- ============================================

-- STEP 1: Drop old tables
-- ============================================
DROP TABLE IF EXISTS places_of_supply CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS employee_customer CASCADE;

-- STEP 2: Update quotation tables
-- ============================================

-- Add state_id and city_id columns to quotes_mbcb (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_mbcb' AND column_name = 'state_id') THEN
    ALTER TABLE quotes_mbcb ADD COLUMN state_id INTEGER REFERENCES states(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_mbcb' AND column_name = 'city_id') THEN
    ALTER TABLE quotes_mbcb ADD COLUMN city_id INTEGER REFERENCES cities(id);
  END IF;
END $$;

-- Add state_id and city_id columns to quotes_signages (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_signages' AND column_name = 'state_id') THEN
    ALTER TABLE quotes_signages ADD COLUMN state_id INTEGER REFERENCES states(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_signages' AND column_name = 'city_id') THEN
    ALTER TABLE quotes_signages ADD COLUMN city_id INTEGER REFERENCES cities(id);
  END IF;
END $$;

-- Add state_id and city_id columns to quotes_paint (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_paint' AND column_name = 'state_id') THEN
    ALTER TABLE quotes_paint ADD COLUMN state_id INTEGER REFERENCES states(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_paint' AND column_name = 'city_id') THEN
    ALTER TABLE quotes_paint ADD COLUMN city_id INTEGER REFERENCES cities(id);
  END IF;
END $$;

-- Remove place_of_supply column from quotes_mbcb (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_mbcb' AND column_name = 'place_of_supply') THEN
    ALTER TABLE quotes_mbcb DROP COLUMN place_of_supply;
  END IF;
END $$;

-- Remove place_of_supply column from quotes_signages (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_signages' AND column_name = 'place_of_supply') THEN
    ALTER TABLE quotes_signages DROP COLUMN place_of_supply;
  END IF;
END $$;

-- Remove place_of_supply column from quotes_paint (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_paint' AND column_name = 'place_of_supply') THEN
    ALTER TABLE quotes_paint DROP COLUMN place_of_supply;
  END IF;
END $$;

-- Remove customer_id column from quotes_mbcb (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_mbcb' AND column_name = 'customer_id') THEN
    ALTER TABLE quotes_mbcb DROP COLUMN customer_id CASCADE;
  END IF;
END $$;

-- Remove customer_id column from quotes_signages (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_signages' AND column_name = 'customer_id') THEN
    ALTER TABLE quotes_signages DROP COLUMN customer_id CASCADE;
  END IF;
END $$;

-- Remove customer_id column from quotes_paint (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_paint' AND column_name = 'customer_id') THEN
    ALTER TABLE quotes_paint DROP COLUMN customer_id CASCADE;
  END IF;
END $$;

-- STEP 3: Add indexes for new columns
-- ============================================

-- Create indexes for state_id and city_id if they don't exist
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_state_id ON quotes_mbcb(state_id);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_city_id ON quotes_mbcb(city_id);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_state_id ON quotes_signages(state_id);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_city_id ON quotes_signages(city_id);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_state_id ON quotes_paint(state_id);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_city_id ON quotes_paint(city_id);

-- STEP 4: Ensure sub_account_id is NOT NULL (if it exists)
-- ============================================

DO $$
BEGIN
  -- Make sub_account_id NOT NULL if it exists and is nullable
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_mbcb' AND column_name = 'sub_account_id' AND is_nullable = 'YES') THEN
    -- First, set NULL values to a default (you may need to adjust this)
    UPDATE quotes_mbcb SET sub_account_id = (SELECT id FROM sub_accounts LIMIT 1) WHERE sub_account_id IS NULL;
    ALTER TABLE quotes_mbcb ALTER COLUMN sub_account_id SET NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_signages' AND column_name = 'sub_account_id' AND is_nullable = 'YES') THEN
    UPDATE quotes_signages SET sub_account_id = (SELECT id FROM sub_accounts LIMIT 1) WHERE sub_account_id IS NULL;
    ALTER TABLE quotes_signages ALTER COLUMN sub_account_id SET NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_paint' AND column_name = 'sub_account_id' AND is_nullable = 'YES') THEN
    UPDATE quotes_paint SET sub_account_id = (SELECT id FROM sub_accounts LIMIT 1) WHERE sub_account_id IS NULL;
    ALTER TABLE quotes_paint ALTER COLUMN sub_account_id SET NOT NULL;
  END IF;
END $$;

-- ============================================
-- DONE! ✅
-- ============================================
-- Your quotation tables now use state_id/city_id instead of place_of_supply
-- The places_of_supply and customers tables have been removed
-- ============================================

