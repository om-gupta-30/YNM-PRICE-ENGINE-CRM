-- ============================================
-- ACCOUNTS MODULE DATABASE SCHEMA
-- This script creates the Accounts table and related structures
-- ============================================

-- ============================================
-- 1. CREATE ENUM TYPES
-- ============================================

-- Company Stage ENUM
CREATE TYPE company_stage_enum AS ENUM (
  'Enterprise',
  'SMB',
  'Pan India',
  'APAC',
  'Middle East & Africa',
  'Europe',
  'North America',
  'LATAM_SouthAmerica'
);

-- Company Tag ENUM
CREATE TYPE company_tag_enum AS ENUM (
  'New',
  'Prospect',
  'Customer',
  'Onboard',
  'Lapsed',
  'Needs Attention',
  'Retention',
  'Renewal',
  'Upselling'
);

-- Related Products ENUM
CREATE TYPE related_product_enum AS ENUM (
  'MBCB',
  'Signages',
  'Paint'
);

-- ============================================
-- 2. ACCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  account_name TEXT NOT NULL,
  company_stage company_stage_enum NOT NULL,
  company_tag company_tag_enum NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  website TEXT,
  gst_number TEXT,
  related_products TEXT[] DEFAULT '{}', -- Array of product names
  assigned_employee TEXT NOT NULL, -- Employee username
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_accounts_account_name ON accounts(account_name);
CREATE INDEX IF NOT EXISTS idx_accounts_company_stage ON accounts(company_stage);
CREATE INDEX IF NOT EXISTS idx_accounts_company_tag ON accounts(company_tag);
CREATE INDEX IF NOT EXISTS idx_accounts_assigned_employee ON accounts(assigned_employee);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_accounts_last_activity ON accounts(last_activity_at DESC);

-- ============================================
-- 3. UPDATE EXISTING TABLES TO LINK TO ACCOUNTS
-- ============================================

-- Add account_id to quotations tables
ALTER TABLE quotes_mbcb 
ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE quotes_signages 
ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE quotes_paint 
ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;

-- Add account_id to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;

-- Add account_id to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;

-- Create indexes for account_id foreign keys
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_account_id ON quotes_mbcb(account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_account_id ON quotes_signages(account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_account_id ON quotes_paint(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON leads(account_id);
CREATE INDEX IF NOT EXISTS idx_tasks_account_id ON tasks(account_id);

-- ============================================
-- 4. ADD COMMENTS
-- ============================================
COMMENT ON TABLE accounts IS 'Accounts module - represents companies/organizations';
COMMENT ON COLUMN accounts.company_stage IS 'Company size/geographic scope';
COMMENT ON COLUMN accounts.company_tag IS 'Relationship stage with YNM Safety';
COMMENT ON COLUMN accounts.related_products IS 'Array of products: MBCB, Signages, Paint';

-- ============================================
-- 5. TRIGGER TO UPDATE updated_at AND last_activity_at
-- ============================================
CREATE OR REPLACE FUNCTION update_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounts_update_timestamp
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION update_accounts_timestamp();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'accounts' 
-- ORDER BY ordinal_position;

