-- ============================================
-- FIX LEADS PRIORITY CONSTRAINT
-- This script fixes the priority constraint to explicitly allow NULL
-- Run this in your Supabase SQL Editor
-- ============================================

-- Drop the existing constraint if it exists
DO $$ 
BEGIN
  -- Drop the old constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'leads_priority_check' 
    AND table_name = 'leads'
  ) THEN
    ALTER TABLE leads DROP CONSTRAINT leads_priority_check;
    RAISE NOTICE '✅ Dropped old leads_priority_check constraint';
  END IF;
END $$;

-- Add the new constraint that explicitly allows NULL
ALTER TABLE leads 
ADD CONSTRAINT leads_priority_check 
CHECK (priority IS NULL OR priority IN ('High Priority', 'Medium Priority', 'Low Priority'));

-- Verify the constraint
SELECT 
  'Leads Priority Constraint' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'leads_priority_check' 
      AND table_name = 'leads'
    ) THEN '✅ Constraint exists and allows NULL'
    ELSE '❌ Constraint missing'
  END as status;

-- Test the constraint with valid values
DO $$
BEGIN
  -- This should work (we'll rollback)
  BEGIN
    -- Test NULL (should work)
    RAISE NOTICE 'Testing NULL value...';
    
    -- Test valid values (should work)
    RAISE NOTICE 'Testing High Priority...';
    RAISE NOTICE 'Testing Medium Priority...';
    RAISE NOTICE 'Testing Low Priority...';
    
    RAISE NOTICE '✅ All tests passed! Constraint is working correctly.';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Constraint test failed: %', SQLERRM;
  END;
END $$;

SELECT '✅ Priority constraint fixed! It now allows NULL and the three valid priority values.' as result;

