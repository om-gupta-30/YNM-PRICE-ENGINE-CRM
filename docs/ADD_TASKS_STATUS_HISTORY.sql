-- ============================================
-- ADD STATUS HISTORY TO TASKS TABLE
-- This script adds status_history column to track all status changes
-- ============================================

-- Add status_history column to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'status_history'
  ) THEN
    ALTER TABLE tasks 
    ADD COLUMN status_history JSONB DEFAULT '[]'::jsonb;
    
    RAISE NOTICE 'Added status_history column to tasks table';
  ELSE
    RAISE NOTICE 'status_history column already exists in tasks table';
  END IF;
END $$;

-- Create index for status_history queries
CREATE INDEX IF NOT EXISTS idx_tasks_status_history ON tasks USING GIN (status_history);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  'Tasks Table - Status History Column' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'status_history'
    ) THEN '✅ status_history column exists'
    ELSE '❌ status_history column missing'
  END as status;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅ Status history column added successfully to tasks table!' as result;
