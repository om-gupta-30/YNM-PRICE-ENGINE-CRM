-- =====================================================
-- FINAL SCHEMA UPDATE SCRIPT - ALL RECENT CHANGES
-- Run this single SQL script to apply all updates
-- =====================================================

-- STEP 1: Make accounts.state_id and accounts.city_id nullable (parent accounts don't need location)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'state_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE accounts ALTER COLUMN state_id DROP NOT NULL;
        RAISE NOTICE 'Made accounts.state_id nullable';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'city_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE accounts ALTER COLUMN city_id DROP NOT NULL;
        RAISE NOTICE 'Made accounts.city_id nullable';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Note: Could not alter accounts table columns: %', SQLERRM;
END $$;

-- STEP 2: Add state_id and city_id columns to sub_accounts if they don't exist
DO $$
BEGIN
    -- Add state_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'state_id'
    ) THEN
        ALTER TABLE sub_accounts 
        ADD COLUMN state_id INTEGER REFERENCES states(id);
        RAISE NOTICE 'Added state_id column to sub_accounts table';
    ELSE
        RAISE NOTICE 'state_id column already exists in sub_accounts table';
    END IF;

    -- Add city_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'city_id'
    ) THEN
        ALTER TABLE sub_accounts 
        ADD COLUMN city_id INTEGER REFERENCES cities(id);
        RAISE NOTICE 'Added city_id column to sub_accounts table';
    ELSE
        RAISE NOTICE 'city_id column already exists in sub_accounts table';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding columns to sub_accounts: %', SQLERRM;
END $$;

-- STEP 3: Ensure engagement_score column exists in sub_accounts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'engagement_score'
    ) THEN
        ALTER TABLE sub_accounts 
        ADD COLUMN engagement_score NUMERIC(10,2) DEFAULT 0;
        
        -- Update existing records to have engagement_score = 0 if NULL
        UPDATE sub_accounts SET engagement_score = 0 WHERE engagement_score IS NULL;
        
        RAISE NOTICE 'Added engagement_score column to sub_accounts table';
    ELSE
        RAISE NOTICE 'engagement_score column already exists in sub_accounts table';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding engagement_score column: %', SQLERRM;
END $$;

-- STEP 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sub_accounts_state_id ON sub_accounts(state_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_city_id ON sub_accounts(city_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_account_id ON sub_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_assigned_employee ON sub_accounts(assigned_employee);

-- STEP 5: Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Check and add foreign key for state_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'sub_accounts' 
            AND kcu.column_name = 'state_id'
            AND tc.constraint_type = 'FOREIGN KEY'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'state_id'
    ) THEN
        ALTER TABLE sub_accounts
        ADD CONSTRAINT sub_accounts_state_id_fkey 
        FOREIGN KEY (state_id) REFERENCES states(id);
        RAISE NOTICE 'Added foreign key constraint for sub_accounts.state_id';
    END IF;

    -- Check and add foreign key for city_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'sub_accounts' 
            AND kcu.column_name = 'city_id'
            AND tc.constraint_type = 'FOREIGN KEY'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'city_id'
    ) THEN
        ALTER TABLE sub_accounts
        ADD CONSTRAINT sub_accounts_city_id_fkey 
        FOREIGN KEY (city_id) REFERENCES cities(id);
        RAISE NOTICE 'Added foreign key constraint for sub_accounts.city_id';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding foreign key constraints: %', SQLERRM;
END $$;

-- STEP 6: Verify schema changes
DO $$
DECLARE
    account_state_nullable TEXT;
    account_city_nullable TEXT;
    sub_account_has_state BOOLEAN;
    sub_account_has_city BOOLEAN;
    sub_account_has_engagement BOOLEAN;
BEGIN
    -- Check accounts table
    SELECT is_nullable INTO account_state_nullable
    FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'state_id';
    
    SELECT is_nullable INTO account_city_nullable
    FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'city_id';
    
    -- Check sub_accounts table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'state_id'
    ) INTO sub_account_has_state;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'city_id'
    ) INTO sub_account_has_city;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'engagement_score'
    ) INTO sub_account_has_engagement;
    
    RAISE NOTICE '=== SCHEMA UPDATE SUMMARY ===';
    RAISE NOTICE 'accounts.state_id nullable: %', COALESCE(account_state_nullable, 'N/A');
    RAISE NOTICE 'accounts.city_id nullable: %', COALESCE(account_city_nullable, 'N/A');
    RAISE NOTICE 'sub_accounts.state_id exists: %', sub_account_has_state;
    RAISE NOTICE 'sub_accounts.city_id exists: %', sub_account_has_city;
    RAISE NOTICE 'sub_accounts.engagement_score exists: %', sub_account_has_engagement;
    RAISE NOTICE '================================';
END $$;

-- Final verification query (returns results you can check)
SELECT 
    'accounts' as table_name,
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'accounts'
  AND column_name IN ('state_id', 'city_id')
UNION ALL
SELECT 
    'sub_accounts' as table_name,
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'sub_accounts'
  AND column_name IN ('state_id', 'city_id', 'engagement_score')
ORDER BY table_name, column_name;

