-- ============================================
-- CRM ACCOUNTS STRUCTURE UPDATE
-- This script updates the accounts structure for parent/child accounts
-- ============================================

-- ============================================
-- 1. CREATE STATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS states (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_states_name ON states(name);

-- ============================================
-- 2. CREATE CITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT cities_state_name_unique UNIQUE (state_id, name)
);

CREATE INDEX IF NOT EXISTS idx_cities_state_id ON cities(state_id);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);

-- ============================================
-- 3. MIGRATE STATES FROM places_of_supply TO states
-- ============================================
-- Insert 28 Indian States into states table
INSERT INTO states (name) VALUES
  ('Andhra Pradesh'),
  ('Arunachal Pradesh'),
  ('Assam'),
  ('Bihar'),
  ('Chhattisgarh'),
  ('Goa'),
  ('Gujarat'),
  ('Haryana'),
  ('Himachal Pradesh'),
  ('Jharkhand'),
  ('Karnataka'),
  ('Kerala'),
  ('Madhya Pradesh'),
  ('Maharashtra'),
  ('Manipur'),
  ('Meghalaya'),
  ('Mizoram'),
  ('Nagaland'),
  ('Odisha'),
  ('Punjab'),
  ('Rajasthan'),
  ('Sikkim'),
  ('Tamil Nadu'),
  ('Telangana'),
  ('Tripura'),
  ('Uttar Pradesh'),
  ('Uttarakhand'),
  ('West Bengal')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. ADD COLUMNS TO ACCOUNTS TABLE
-- ============================================
-- Add state_id and city_id to accounts table
ALTER TABLE accounts 
  ADD COLUMN IF NOT EXISTS state_id INTEGER REFERENCES states(id),
  ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id);

-- Remove assigned_employee from accounts (sub-accounts will have it)
-- Note: We'll keep the column for now but won't use it for parent accounts
-- ALTER TABLE accounts DROP COLUMN IF EXISTS assigned_employee;

-- ============================================
-- 5. CREATE SUB_ACCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sub_accounts (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sub_account_name TEXT NOT NULL,
  assigned_employee TEXT NOT NULL,
  engagement_score DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT sub_accounts_account_name_unique UNIQUE (account_id, sub_account_name)
);

CREATE INDEX IF NOT EXISTS idx_sub_accounts_account_id ON sub_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_assigned_employee ON sub_accounts(assigned_employee);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_engagement_score ON sub_accounts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_is_active ON sub_accounts(is_active);

-- ============================================
-- 6. ADD COMMON CITIES FOR EACH STATE
-- ============================================
-- This is a sample - you can expand this
DO $$
DECLARE
  state_rec RECORD;
  city_names TEXT[] := ARRAY['City 1', 'City 2', 'City 3'];
  city_name TEXT;
BEGIN
  FOR state_rec IN SELECT id, name FROM states LOOP
    -- Add major cities for each state (customize as needed)
    CASE state_rec.name
      WHEN 'Karnataka' THEN
        INSERT INTO cities (state_id, name) VALUES
          (state_rec.id, 'Bangalore'),
          (state_rec.id, 'Mysore'),
          (state_rec.id, 'Hubli')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Maharashtra' THEN
        INSERT INTO cities (state_id, name) VALUES
          (state_rec.id, 'Mumbai'),
          (state_rec.id, 'Pune'),
          (state_rec.id, 'Nagpur')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Tamil Nadu' THEN
        INSERT INTO cities (state_id, name) VALUES
          (state_rec.id, 'Chennai'),
          (state_rec.id, 'Coimbatore'),
          (state_rec.id, 'Madurai')
        ON CONFLICT (state_id, name) DO NOTHING;
      WHEN 'Delhi' THEN
        INSERT INTO cities (state_id, name) VALUES
          (state_rec.id, 'New Delhi'),
          (state_rec.id, 'Delhi')
        ON CONFLICT (state_id, name) DO NOTHING;
      ELSE
        -- For other states, add a default city
        INSERT INTO cities (state_id, name) VALUES
          (state_rec.id, 'Capital City')
        ON CONFLICT (state_id, name) DO NOTHING;
    END CASE;
  END LOOP;
END $$;

-- ============================================
-- 7. UPDATE QUOTATIONS TO USE sub_account_id
-- ============================================
-- Add sub_account_id to quotation tables
ALTER TABLE quotes_mbcb 
  ADD COLUMN IF NOT EXISTS sub_account_id INTEGER REFERENCES sub_accounts(id);

ALTER TABLE quotes_signages 
  ADD COLUMN IF NOT EXISTS sub_account_id INTEGER REFERENCES sub_accounts(id);

ALTER TABLE quotes_paint 
  ADD COLUMN IF NOT EXISTS sub_account_id INTEGER REFERENCES sub_accounts(id);

CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_sub_account_id ON quotes_mbcb(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_sub_account_id ON quotes_signages(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_sub_account_id ON quotes_paint(sub_account_id);

-- ============================================
-- END OF SCRIPT
-- ============================================

