-- Add updated_at column to notifications table if it does not exist
-- This fixes trigger error: record "new" has no field "updated_at"

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'notifications'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE notifications
      ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    RAISE NOTICE '✅ Added updated_at column to notifications table';
  ELSE
    RAISE NOTICE 'ℹ️ updated_at column already exists on notifications table';
  END IF;
END $$;
