-- Add address column to sub_accounts table
-- This script safely adds the column if it doesn't exist

DO $$
BEGIN
    -- Add address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'address'
    ) THEN
        ALTER TABLE sub_accounts 
        ADD COLUMN address TEXT;
        
        RAISE NOTICE '✅ Added address column to sub_accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ address column already exists on sub_accounts table';
    END IF;
END $$;

-- Verification query
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sub_accounts' 
AND column_name = 'address';
