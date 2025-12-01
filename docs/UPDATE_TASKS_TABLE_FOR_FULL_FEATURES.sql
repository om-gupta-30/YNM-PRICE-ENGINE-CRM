-- ============================================
-- UPDATE TASKS TABLE FOR FULL FEATURES
-- Adds account_id, sub_account_id, and due_date time support
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add account_id and sub_account_id if they don't exist
DO $$ 
BEGIN
  -- Add account_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_account_id ON tasks(account_id);
    RAISE NOTICE 'account_id column added to tasks table';
  ELSE
    RAISE NOTICE 'account_id column already exists in tasks table';
  END IF;

  -- Add sub_account_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'sub_account_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_sub_account_id ON tasks(sub_account_id);
    RAISE NOTICE 'sub_account_id column added to tasks table';
  ELSE
    RAISE NOTICE 'sub_account_id column already exists in tasks table';
  END IF;

  -- Change due_date from DATE to TIMESTAMP to support time
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'due_date' 
    AND data_type = 'date'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN due_date TYPE TIMESTAMP WITH TIME ZONE USING due_date::timestamp with time zone;
    RAISE NOTICE 'due_date column changed to TIMESTAMP WITH TIME ZONE';
  ELSE
    RAISE NOTICE 'due_date column is already TIMESTAMP or does not exist';
  END IF;
END $$;

-- Verify all changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- Show success message
SELECT '✅ Tasks table updated successfully! account_id, sub_account_id added, due_date supports time.' as result;

