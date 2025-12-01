-- =====================================================
-- FIX SUB_ACCOUNTS TABLE - ENSURE ALL COLUMNS EXIST
-- Run this to fix the sub-accounts page error
-- =====================================================

-- STEP 1: Ensure sub_accounts table exists with all required columns
DO $$
BEGIN
    -- Create sub_accounts table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'sub_accounts'
    ) THEN
        CREATE TABLE sub_accounts (
            id SERIAL PRIMARY KEY,
            account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            sub_account_name TEXT NOT NULL,
            assigned_employee TEXT NOT NULL,
            state_id INTEGER REFERENCES states(id),
            city_id INTEGER REFERENCES cities(id),
            engagement_score NUMERIC(10,2) DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created sub_accounts table';
    ELSE
        RAISE NOTICE 'sub_accounts table already exists';
    END IF;
END $$;

-- STEP 2: Add missing columns if they don't exist
DO $$
BEGIN
    -- Add state_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'state_id'
    ) THEN
        ALTER TABLE sub_accounts ADD COLUMN state_id INTEGER REFERENCES states(id);
        RAISE NOTICE 'Added state_id column to sub_accounts';
    END IF;

    -- Add city_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'city_id'
    ) THEN
        ALTER TABLE sub_accounts ADD COLUMN city_id INTEGER REFERENCES cities(id);
        RAISE NOTICE 'Added city_id column to sub_accounts';
    END IF;

    -- Add engagement_score if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'engagement_score'
    ) THEN
        ALTER TABLE sub_accounts ADD COLUMN engagement_score NUMERIC(10,2) DEFAULT 0;
        RAISE NOTICE 'Added engagement_score column to sub_accounts';
    END IF;

    -- Add is_active if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE sub_accounts ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to sub_accounts';
    END IF;

    -- Add created_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE sub_accounts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to sub_accounts';
    END IF;

    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE sub_accounts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to sub_accounts';
    END IF;
END $$;

-- STEP 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sub_accounts_account_id ON sub_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_state_id ON sub_accounts(state_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_city_id ON sub_accounts(city_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_assigned_employee ON sub_accounts(assigned_employee);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_is_active ON sub_accounts(is_active);

-- STEP 4: Create updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sub_accounts_updated_at ON sub_accounts;
CREATE TRIGGER update_sub_accounts_updated_at
    BEFORE UPDATE ON sub_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- STEP 5: Verify table structure
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'sub_accounts';
    
    RAISE NOTICE '=== SUB_ACCOUNTS TABLE VERIFICATION ===';
    RAISE NOTICE 'Total columns in sub_accounts: %', col_count;
    RAISE NOTICE '========================================';
END $$;

-- Final verification query
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sub_accounts'
ORDER BY ordinal_position;

