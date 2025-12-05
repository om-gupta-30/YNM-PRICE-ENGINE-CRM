-- ====================================================
-- CROSS-PRODUCT QUOTATION MERGE SCHEMA UPDATE
-- ====================================================
-- Run this SQL in Supabase SQL Editor
-- This adds contact_id to quotes tables and creates/updates merged_quotations for cross-product merging

-- ====================================================
-- STEP 1: Add contact_id to quotes_mbcb table
-- ====================================================
ALTER TABLE quotes_mbcb 
ADD COLUMN IF NOT EXISTS contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_contact_id ON quotes_mbcb(contact_id);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_sub_account_id ON quotes_mbcb(sub_account_id);

-- ====================================================
-- STEP 2: Add contact_id to quotes_signages table
-- ====================================================
ALTER TABLE quotes_signages 
ADD COLUMN IF NOT EXISTS contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotes_signages_contact_id ON quotes_signages(contact_id);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_sub_account_id ON quotes_signages(sub_account_id);

-- ====================================================
-- STEP 3: Add contact_id to quotes_paint table
-- ====================================================
ALTER TABLE quotes_paint 
ADD COLUMN IF NOT EXISTS contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotes_paint_contact_id ON quotes_paint(contact_id);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_sub_account_id ON quotes_paint(sub_account_id);

-- ====================================================
-- STEP 4: CREATE merged_quotations table (if not exists)
-- ====================================================
CREATE TABLE IF NOT EXISTS merged_quotations (
  id SERIAL PRIMARY KEY,
  merged_quote_ids INTEGER[] NOT NULL,
  product_type VARCHAR(50),
  is_cross_product BOOLEAN DEFAULT false,
  product_types TEXT[] DEFAULT NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  account_name TEXT,
  sub_account_name TEXT,
  contact_name TEXT,
  customer_name VARCHAR(255),
  place_of_supply VARCHAR(255),
  state_id INTEGER REFERENCES states(id) ON DELETE SET NULL,
  city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
  purpose TEXT,
  date VARCHAR(50),
  final_total_cost NUMERIC(15, 2),
  created_by VARCHAR(255),
  is_saved BOOLEAN DEFAULT true,
  quote_sources JSONB DEFAULT '[]'::JSONB,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================
-- STEP 5: Add indexes to merged_quotations
-- ====================================================
CREATE INDEX IF NOT EXISTS idx_merged_quotations_product_type ON merged_quotations(product_type);
CREATE INDEX IF NOT EXISTS idx_merged_quotations_created_at ON merged_quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merged_quotations_merged_quote_ids ON merged_quotations USING GIN(merged_quote_ids);
CREATE INDEX IF NOT EXISTS idx_merged_quotations_account_id ON merged_quotations(account_id);
CREATE INDEX IF NOT EXISTS idx_merged_quotations_sub_account_id ON merged_quotations(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_merged_quotations_contact_id ON merged_quotations(contact_id);
CREATE INDEX IF NOT EXISTS idx_merged_quotations_is_cross_product ON merged_quotations(is_cross_product);

-- ====================================================
-- STEP 6: Backfill contact_id from raw_payload if exists
-- ====================================================

-- Update quotes_mbcb with contact_id from raw_payload
UPDATE quotes_mbcb 
SET contact_id = (raw_payload->>'contactId')::INTEGER 
WHERE contact_id IS NULL 
  AND raw_payload->>'contactId' IS NOT NULL 
  AND raw_payload->>'contactId' != 'null'
  AND raw_payload->>'contactId' != ''
  AND (raw_payload->>'contactId')::TEXT ~ '^[0-9]+$';

-- Update quotes_signages with contact_id from raw_payload  
UPDATE quotes_signages 
SET contact_id = (raw_payload->>'contactId')::INTEGER 
WHERE contact_id IS NULL 
  AND raw_payload->>'contactId' IS NOT NULL 
  AND raw_payload->>'contactId' != 'null'
  AND raw_payload->>'contactId' != ''
  AND (raw_payload->>'contactId')::TEXT ~ '^[0-9]+$';

-- Update quotes_paint with contact_id from raw_payload
UPDATE quotes_paint 
SET contact_id = (raw_payload->>'contactId')::INTEGER 
WHERE contact_id IS NULL 
  AND raw_payload->>'contactId' IS NOT NULL 
  AND raw_payload->>'contactId' != 'null'
  AND raw_payload->>'contactId' != ''
  AND (raw_payload->>'contactId')::TEXT ~ '^[0-9]+$';

-- ====================================================
-- STEP 7: Add comments for documentation
-- ====================================================
COMMENT ON TABLE merged_quotations IS 'Stores merged quotations with references to original quote IDs. Supports both single-product and cross-product merging.';
COMMENT ON COLUMN quotes_mbcb.contact_id IS 'Reference to the contact this quotation is for';
COMMENT ON COLUMN quotes_signages.contact_id IS 'Reference to the contact this quotation is for';
COMMENT ON COLUMN quotes_paint.contact_id IS 'Reference to the contact this quotation is for';
COMMENT ON COLUMN merged_quotations.is_cross_product IS 'True if this merge contains quotations from different product types';
COMMENT ON COLUMN merged_quotations.product_types IS 'Array of product types included in cross-product merge (e.g., ["mbcb", "signages"])';
COMMENT ON COLUMN merged_quotations.quote_sources IS 'JSON array mapping quote IDs to their source tables';
COMMENT ON COLUMN merged_quotations.account_id IS 'Account ID - all merged quotations must belong to same account';
COMMENT ON COLUMN merged_quotations.sub_account_id IS 'Sub-account ID - all merged quotations must belong to same sub-account';
COMMENT ON COLUMN merged_quotations.contact_id IS 'Contact ID - all merged quotations must belong to same contact';

-- ====================================================
-- DONE! 
-- ====================================================
-- Summary of changes:
-- 1. contact_id column added to quotes_mbcb, quotes_signages, quotes_paint
-- 2. merged_quotations table created with full cross-product support
-- 3. Indexes created for faster queries
-- 4. Existing contact_id backfilled from raw_payload where available
-- ====================================================
