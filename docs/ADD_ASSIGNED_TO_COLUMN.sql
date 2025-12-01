-- Add assigned_to column to accounts table
-- This column is an alias for assigned_employee for compatibility
-- Run this SQL in your Supabase SQL Editor

-- Check if assigned_to column exists, if not add it
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'accounts' 
        AND column_name = 'assigned_to'
    ) THEN
        -- Add the column
        ALTER TABLE accounts 
        ADD COLUMN assigned_to TEXT;
        
        -- Copy existing data from assigned_employee to assigned_to
        UPDATE accounts 
        SET assigned_to = assigned_employee 
        WHERE assigned_employee IS NOT NULL;
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_accounts_assigned_to ON accounts(assigned_to);
        
        RAISE NOTICE 'assigned_to column added to accounts table';
    ELSE
        RAISE NOTICE 'assigned_to column already exists in accounts table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND column_name IN ('assigned_employee', 'assigned_to')
ORDER BY column_name;
