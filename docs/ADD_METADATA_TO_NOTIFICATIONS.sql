-- Add metadata column to notifications table
-- This column is used to store JSON data for lead_id and other notification metadata

-- Add metadata column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE notifications 
        ADD COLUMN metadata jsonb;
        
        RAISE NOTICE '✅ Added metadata column (jsonb) to notifications table';
    ELSE
        RAISE NOTICE 'ℹ️ metadata column already exists in notifications table';
    END IF;
END $$;

-- Create index on metadata for better query performance (using GIN index for jsonb)
CREATE INDEX IF NOT EXISTS idx_notifications_metadata ON notifications USING GIN (metadata);

-- Verification query - show table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
