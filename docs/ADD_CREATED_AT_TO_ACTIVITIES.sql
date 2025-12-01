-- Add created_at column to activities table if it doesn't exist
-- Run this in your Supabase SQL Editor

DO $$
BEGIN
  -- Check if created_at column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'created_at'
  ) THEN
    -- Check if createdAt exists (camelCase version)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'activities' AND column_name = 'createdAt'
    ) THEN
      -- Neither exists, add created_at
      ALTER TABLE activities ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      RAISE NOTICE '✅ Added created_at column to activities table';
    ELSE
      RAISE NOTICE 'ℹ️ activities table already has createdAt column';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ activities table already has created_at column';
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);

-- Verify the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activities' 
AND column_name IN ('created_at', 'createdAt');
