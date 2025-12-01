-- ============================================
-- CREATE SUB_ACCOUNTS TABLE (Standalone Script)
-- Run this in Supabase SQL Editor if you get "database schema mismatch" error
-- ============================================

-- Step 1: Add is_active column to accounts table ONLY if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'accounts' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE accounts ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Step 2: Create sub_accounts table (without foreign key first to avoid errors)
CREATE TABLE IF NOT EXISTS sub_accounts (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL,
  sub_account_name TEXT NOT NULL,
  assigned_employee TEXT NOT NULL,
  engagement_score DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sub_accounts_account_name_unique'
    ) THEN
        ALTER TABLE sub_accounts 
        ADD CONSTRAINT sub_accounts_account_name_unique 
        UNIQUE (account_id, sub_account_name);
    END IF;
END $$;

-- Step 4: Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sub_accounts_account_id_fkey'
    ) THEN
        ALTER TABLE sub_accounts 
        ADD CONSTRAINT sub_accounts_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 5: Create indexes (using IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_sub_accounts_account_id ON sub_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_assigned_employee ON sub_accounts(assigned_employee);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_engagement_score ON sub_accounts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_is_active ON sub_accounts(is_active);

-- ============================================
-- END OF SCRIPT
-- ============================================

