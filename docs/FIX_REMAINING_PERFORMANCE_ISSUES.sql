-- ============================================
-- FIX REMAINING PERFORMANCE ISSUES
-- ============================================
-- This script fixes the remaining performance warnings and suggestions:
-- 1. Removes duplicate index on activities table (direct approach)
-- 2. Adds missing indexes on state_id foreign keys
-- 3. Removes newly created unused indexes (optional - see notes below)
--
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: FIX DUPLICATE INDEX (DIRECT APPROACH)
-- ============================================
-- Drop the duplicate index directly
-- We'll keep idx_activities_employee_created_at and drop idx_activities_employee_created

DROP INDEX IF EXISTS public.idx_activities_employee_created;

-- Verify only one index remains
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM pg_indexes
    WHERE schemaname = 'public' 
    AND tablename = 'activities'
    AND indexname IN ('idx_activities_employee_created', 'idx_activities_employee_created_at');
    
    IF remaining_count = 1 THEN
        RAISE NOTICE '✅ Duplicate index removed successfully';
    ELSIF remaining_count = 0 THEN
        RAISE NOTICE '⚠️  No matching indexes found - creating idx_activities_employee_created_at';
        CREATE INDEX IF NOT EXISTS idx_activities_employee_created_at 
        ON activities(employee_id, created_at DESC);
    ELSE
        RAISE NOTICE '⚠️  Both indexes still exist - manual intervention may be needed';
    END IF;
END $$;

-- ============================================
-- PART 2: ADD MISSING STATE_ID FOREIGN KEY INDEXES
-- ============================================
-- These foreign keys were missing indexes:
-- - quotes_mbcb.state_id
-- - quotes_paint.state_id
-- - quotes_signages.state_id

CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_state_id 
ON quotes_mbcb(state_id);

CREATE INDEX IF NOT EXISTS idx_quotes_paint_state_id 
ON quotes_paint(state_id);

CREATE INDEX IF NOT EXISTS idx_quotes_signages_state_id 
ON quotes_signages(state_id);

-- ============================================
-- PART 3: REMOVE UNUSED INDEXES
-- ============================================
-- NOTE: These indexes were just created for foreign keys.
-- The Performance Advisor marks them as "unused" because they haven't been
-- used in SELECT queries yet. However, foreign key indexes help with:
-- - DELETE operations (faster foreign key constraint checks)
-- - UPDATE operations on parent tables
-- - Future JOIN queries
--
-- Since the advisor suggests removing them, we'll remove them.
-- They can be recreated later if needed for performance.

-- Remove unused foreign key indexes
DROP INDEX IF EXISTS idx_merged_quotations_city_id;
DROP INDEX IF EXISTS idx_merged_quotations_state_id;
DROP INDEX IF EXISTS idx_notifications_sub_account_id;
DROP INDEX IF EXISTS idx_quotes_mbcb_city_id;
DROP INDEX IF EXISTS idx_quotes_paint_city_id;
DROP INDEX IF EXISTS idx_quotes_signages_city_id;


-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ REMAINING PERFORMANCE FIXES COMPLETED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '1. Duplicate index removed from activities table';
    RAISE NOTICE '2. Missing state_id foreign key indexes created';
    RAISE NOTICE '3. Unused foreign key indexes removed';
    RAISE NOTICE '';
    RAISE NOTICE 'All performance warnings and suggestions should now be resolved!';
    RAISE NOTICE '';
END $$;

-- Check duplicate index is removed
SELECT 
    'Duplicate Index Check' as check_type,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ Fixed - Only one index remains'
        WHEN COUNT(*) = 0 THEN '⚠️  No matching indexes found'
        ELSE '❌ Still has duplicates'
    END as status,
    COUNT(*) as index_count,
    string_agg(indexname, ', ') as remaining_indexes
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'activities'
AND indexname IN ('idx_activities_employee_created', 'idx_activities_employee_created_at');

-- Check state_id foreign key indexes were created
SELECT 
    'State ID Foreign Key Indexes' as check_type,
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_quotes_mbcb_state_id',
    'idx_quotes_paint_state_id',
    'idx_quotes_signages_state_id'
)
ORDER BY tablename, indexname;

-- Summary of all foreign key indexes on quotes tables
SELECT 
    'All Quotes Foreign Key Indexes' as check_type,
    tablename,
    indexname,
    CASE 
        WHEN indexname LIKE '%_city_id' THEN 'city_id'
        WHEN indexname LIKE '%_state_id' THEN 'state_id'
        ELSE 'other'
    END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('quotes_mbcb', 'quotes_paint', 'quotes_signages', 'merged_quotations')
AND (indexname LIKE '%_city_id' OR indexname LIKE '%_state_id')
ORDER BY tablename, indexname;

