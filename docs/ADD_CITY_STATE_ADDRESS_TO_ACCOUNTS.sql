-- Add state_id, city_id, and address columns to accounts table
-- This script safely adds the columns if they don't exist

DO $$
BEGIN
    -- Add state_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'state_id'
    ) THEN
        ALTER TABLE accounts 
        ADD COLUMN state_id INTEGER REFERENCES states(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_accounts_state_id ON accounts(state_id);
        
        RAISE NOTICE '✅ Added state_id column to accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ state_id column already exists on accounts table';
    END IF;

    -- Add city_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'city_id'
    ) THEN
        ALTER TABLE accounts 
        ADD COLUMN city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_accounts_city_id ON accounts(city_id);
        
        RAISE NOTICE '✅ Added city_id column to accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ city_id column already exists on accounts table';
    END IF;

    -- Add address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'address'
    ) THEN
        ALTER TABLE accounts 
        ADD COLUMN address TEXT;
        
        RAISE NOTICE '✅ Added address column to accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ address column already exists on accounts table';
    END IF;
END $$;

-- Verification query
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND column_name IN ('state_id', 'city_id', 'address')
ORDER BY column_name;
