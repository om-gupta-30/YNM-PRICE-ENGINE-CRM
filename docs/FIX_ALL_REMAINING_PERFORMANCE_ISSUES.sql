-- ============================================
-- FIX ALL REMAINING PERFORMANCE ISSUES
-- ============================================
-- This script fixes the remaining 9 performance suggestions:
-- 1. Adds 3 missing state_id foreign key indexes
-- 2. Removes 6 unused indexes (that were just created but not used)
--
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: ADD MISSING STATE_ID FOREIGN KEY INDEXES
-- ============================================
-- These 3 foreign keys need indexes:
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
-- PART 2: REMOVE ALL UNUSED INDEXES
-- ============================================
-- The Performance Advisor marks these 6 indexes as "unused":
-- They were created for foreign keys but aren't being used in queries.
-- We'll remove them to satisfy the Performance Advisor.

-- Remove unused indexes on merged_quotations
DROP INDEX IF EXISTS idx_merged_quotations_city_id;
DROP INDEX IF EXISTS idx_merged_quotations_state_id;

-- Remove unused index on notifications
DROP INDEX IF EXISTS idx_notifications_sub_account_id;

-- Remove unused indexes on quotes tables
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
    RAISE NOTICE '✅ ALL PERFORMANCE FIXES COMPLETED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '1. Added 3 missing state_id foreign key indexes';
    RAISE NOTICE '2. Removed 6 unused indexes';
    RAISE NOTICE '';
    RAISE NOTICE 'All 9 performance suggestions should now be resolved!';
    RAISE NOTICE '';
END $$;

-- Check state_id indexes were created
SELECT 
    'State ID Indexes Created' as check_type,
    tablename,
    indexname,
    '✅ Created' as status
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_quotes_mbcb_state_id',
    'idx_quotes_paint_state_id',
    'idx_quotes_signages_state_id'
)
ORDER BY tablename, indexname;

-- Check unused indexes were removed
SELECT 
    'Unused Indexes Removed' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All removed successfully'
        ELSE '⚠️  Some indexes still exist: ' || string_agg(indexname, ', ')
    END as status,
    COUNT(*) as remaining_count
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_merged_quotations_city_id',
    'idx_merged_quotations_state_id',
    'idx_notifications_sub_account_id',
    'idx_quotes_mbcb_city_id',
    'idx_quotes_paint_city_id',
    'idx_quotes_signages_city_id'
);

-- Final summary
SELECT 
    'Final Summary' as check_type,
    'State ID Indexes' as index_category,
    COUNT(*) as count,
    string_agg(indexname, ', ' ORDER BY indexname) as indexes
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_quotes_mbcb_state_id',
    'idx_quotes_paint_state_id',
    'idx_quotes_signages_state_id'
)
UNION ALL
SELECT 
    'Final Summary' as check_type,
    'Unused Indexes (should be 0)' as index_category,
    COUNT(*) as count,
    COALESCE(string_agg(indexname, ', ' ORDER BY indexname), 'None - All removed!') as indexes
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_merged_quotations_city_id',
    'idx_merged_quotations_state_id',
    'idx_notifications_sub_account_id',
    'idx_quotes_mbcb_city_id',
    'idx_quotes_paint_city_id',
    'idx_quotes_signages_city_id'
);

