-- =====================================================
-- SINGLE SQL UPDATE SCRIPT FOR ALL RECENT CHANGES
-- Fixes sub-accounts page database errors
-- Updates schema to match current codebase requirements
-- =====================================================

-- STEP 1: Make accounts.state_id and accounts.city_id nullable (parent accounts don't need location)
DO $$
BEGIN
    -- Drop NOT NULL constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'state_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE accounts ALTER COLUMN state_id DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'city_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE accounts ALTER COLUMN city_id DROP NOT NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not alter accounts table columns. Error: %', SQLERRM;
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
    END IF;

    -- Add city_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'city_id'
    ) THEN
        ALTER TABLE sub_accounts 
        ADD COLUMN city_id INTEGER REFERENCES cities(id);
        
        RAISE NOTICE 'Added city_id column to sub_accounts table';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding columns to sub_accounts: %', SQLERRM;
END $$;

-- STEP 3: For existing sub_accounts with NULL state_id/city_id, set default values (optional - only if you have existing data)
-- Uncomment and modify if you need to set defaults for existing records:
-- DO $$
-- DECLARE
--     default_state_id INTEGER;
--     default_city_id INTEGER;
-- BEGIN
--     -- Get default state and city IDs (using first available)
--     SELECT id INTO default_state_id FROM states ORDER BY id LIMIT 1;
--     SELECT id INTO default_city_id FROM cities ORDER BY id LIMIT 1;
--     
--     -- Update NULL values only if defaults exist
--     IF default_state_id IS NOT NULL AND default_city_id IS NOT NULL THEN
--         UPDATE sub_accounts 
--         SET state_id = default_state_id, city_id = default_city_id 
--         WHERE state_id IS NULL OR city_id IS NULL;
--         
--         RAISE NOTICE 'Updated existing sub_accounts with default state_id and city_id';
--     END IF;
-- END $$;

-- STEP 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sub_accounts_state_id ON sub_accounts(state_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_city_id ON sub_accounts(city_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_account_id ON sub_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_assigned_employee ON sub_accounts(assigned_employee);

-- STEP 5: Add foreign key constraints if they don't exist (for state_id and city_id)
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

-- STEP 6: Ensure engagement_score column exists in sub_accounts (if needed)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'engagement_score'
    ) THEN
        ALTER TABLE sub_accounts 
        ADD COLUMN engagement_score NUMERIC(10,2) DEFAULT 0;
        
        RAISE NOTICE 'Added engagement_score column to sub_accounts table';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding engagement_score column: %', SQLERRM;
END $$;

-- STEP 7: Verify the schema changes
DO $$
BEGIN
    RAISE NOTICE '=== SCHEMA UPDATE COMPLETE ===';
    RAISE NOTICE 'Checking sub_accounts table structure...';
    
    -- Display column information
    RAISE NOTICE 'sub_accounts columns:';
    FOR rec IN 
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'sub_accounts'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - % (type: %, nullable: %)', rec.column_name, rec.data_type, rec.is_nullable;
    END LOOP;
END $$;

-- Verification query (uncomment to run manually)
-- SELECT 
--     table_name,
--     column_name,
--     is_nullable,
--     data_type,
--     column_default
-- FROM information_schema.columns
-- WHERE table_name IN ('accounts', 'sub_accounts')
--   AND column_name IN ('state_id', 'city_id', 'engagement_score')
-- ORDER BY table_name, column_name;

