-- ============================================
-- FIX FINAL PERFORMANCE ISSUES
-- ============================================
-- This script fixes the remaining 9 performance suggestions:
-- 1. Adds missing indexes on 6 foreign keys (city_id and state_id columns)
-- 2. Removes 3 unused state_id indexes on quotes tables
--
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- ============================================
-- These 6 foreign keys need indexes for better performance:
-- 1. merged_quotations.city_id
-- 2. merged_quotations.state_id
-- 3. notifications.sub_account_id
-- 4. quotes_mbcb.city_id
-- 5. quotes_paint.city_id
-- 6. quotes_signages.city_id

-- Index for merged_quotations.city_id
CREATE INDEX IF NOT EXISTS idx_merged_quotations_city_id 
ON merged_quotations(city_id);

-- Index for merged_quotations.state_id
CREATE INDEX IF NOT EXISTS idx_merged_quotations_state_id 
ON merged_quotations(state_id);

-- Index for notifications.sub_account_id
CREATE INDEX IF NOT EXISTS idx_notifications_sub_account_id 
ON notifications(sub_account_id);

-- Index for quotes_mbcb.city_id
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_city_id 
ON quotes_mbcb(city_id);

-- Index for quotes_paint.city_id
CREATE INDEX IF NOT EXISTS idx_quotes_paint_city_id 
ON quotes_paint(city_id);

-- Index for quotes_signages.city_id
CREATE INDEX IF NOT EXISTS idx_quotes_signages_city_id 
ON quotes_signages(city_id);

-- ============================================
-- PART 2: REMOVE UNUSED STATE_ID INDEXES
-- ============================================
-- The Performance Advisor marks these 3 indexes as "unused":
-- - idx_quotes_mbcb_state_id
-- - idx_quotes_paint_state_id
-- - idx_quotes_signages_state_id
--
-- These were created earlier but aren't being used in queries.
-- We'll remove them to clean up the unused index suggestions.
-- Note: merged_quotations.state_id index is kept (it's needed for the foreign key).

-- Remove unused state_id indexes
DROP INDEX IF EXISTS idx_quotes_mbcb_state_id;
DROP INDEX IF EXISTS idx_quotes_paint_state_id;
DROP INDEX IF EXISTS idx_quotes_signages_state_id;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FINAL PERFORMANCE FIXES COMPLETED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '1. Added 6 missing foreign key indexes';
    RAISE NOTICE '2. Removed 3 unused state_id indexes';
    RAISE NOTICE '';
    RAISE NOTICE 'All 9 performance suggestions should now be resolved!';
    RAISE NOTICE '';
END $$;

-- Check all foreign key indexes were created
SELECT 
    'Foreign Key Indexes Status' as check_type,
    tablename,
    indexname,
    CASE 
        WHEN indexname LIKE '%_city_id' THEN 'city_id'
        WHEN indexname LIKE '%_state_id' THEN 'state_id'
        WHEN indexname LIKE '%_sub_account_id' THEN 'sub_account_id'
        ELSE 'other'
    END as index_type,
    CASE 
        WHEN indexname IN ('idx_quotes_mbcb_state_id', 'idx_quotes_paint_state_id', 'idx_quotes_signages_state_id') 
        THEN '❌ Should be removed'
        ELSE '✅ Should exist'
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_merged_quotations_city_id',
    'idx_merged_quotations_state_id',
    'idx_notifications_sub_account_id',
    'idx_quotes_mbcb_city_id',
    'idx_quotes_paint_city_id',
    'idx_quotes_signages_city_id',
    'idx_quotes_mbcb_state_id',
    'idx_quotes_paint_state_id',
    'idx_quotes_signages_state_id'
)
ORDER BY tablename, indexname;

-- Summary of foreign key indexes by table
SELECT 
    'Index Summary by Table' as check_type,
    tablename,
    COUNT(*) as total_indexes,
    string_agg(indexname, ', ' ORDER BY indexname) as indexes
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('merged_quotations', 'notifications', 'quotes_mbcb', 'quotes_paint', 'quotes_signages')
AND (indexname LIKE '%_city_id' OR indexname LIKE '%_state_id' OR indexname LIKE '%_sub_account_id')
GROUP BY tablename
ORDER BY tablename;

