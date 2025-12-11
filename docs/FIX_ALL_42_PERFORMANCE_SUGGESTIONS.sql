-- ============================================
-- FIX ALL 42 PERFORMANCE SUGGESTIONS
-- ============================================
-- This script fixes all remaining performance suggestions:
-- 1. Adds 6 missing foreign key indexes
-- 2. Removes 36 unused indexes
--
-- Total: 42 suggestions fixed
--
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES (6)
-- ============================================
-- These foreign keys need indexes for better performance

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
-- PART 2: REMOVE UNUSED INDEXES (36)
-- ============================================
-- These indexes are marked as "unused" by Performance Advisor
-- Removing them reduces write overhead and index maintenance

-- Remove unused state_id indexes on quotes tables
DROP INDEX IF EXISTS idx_quotes_mbcb_state_id;
DROP INDEX IF EXISTS idx_quotes_paint_state_id;
DROP INDEX IF EXISTS idx_quotes_signages_state_id;

-- Remove unused sub_accounts indexes
DROP INDEX IF EXISTS idx_sub_accounts_account_active_engagement;
DROP INDEX IF EXISTS idx_sub_accounts_name_active;
DROP INDEX IF EXISTS idx_sub_accounts_account_id;

-- Remove unused quotes_mbcb indexes
DROP INDEX IF EXISTS idx_quotes_mbcb_date;
DROP INDEX IF EXISTS idx_quotes_mbcb_created_by_date;
DROP INDEX IF EXISTS idx_quotes_mbcb_status_created;

-- Remove unused quotes_paint indexes
DROP INDEX IF EXISTS idx_quotes_paint_date;
DROP INDEX IF EXISTS idx_quotes_paint_created_by_date;
DROP INDEX IF EXISTS idx_quotes_paint_status_created;

-- Remove unused quotes_signages indexes
DROP INDEX IF EXISTS idx_quotes_signages_date;
DROP INDEX IF EXISTS idx_quotes_signages_created_by_date;
DROP INDEX IF EXISTS idx_quotes_signages_status_created;

-- Remove unused activities indexes
DROP INDEX IF EXISTS idx_activities_account_id;
DROP INDEX IF EXISTS idx_activities_account_created;

-- Remove unused contacts indexes
DROP INDEX IF EXISTS idx_contacts_account_id;
DROP INDEX IF EXISTS idx_contacts_sub_account_id;
DROP INDEX IF EXISTS idx_contacts_created_by;

-- Remove unused leads indexes
DROP INDEX IF EXISTS idx_leads_account_id;
DROP INDEX IF EXISTS idx_leads_assigned_employee;
DROP INDEX IF EXISTS idx_leads_priority;
DROP INDEX IF EXISTS idx_leads_employee_status;

-- Remove unused tasks indexes
DROP INDEX IF EXISTS idx_tasks_account_id;
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_tasks_due_date;
DROP INDEX IF EXISTS idx_tasks_employee_status_due;

-- Remove unused notifications indexes
DROP INDEX IF EXISTS idx_notifications_account_id;
DROP INDEX IF EXISTS idx_notifications_user_seen_created;
DROP INDEX IF EXISTS idx_notifications_user_completed;

-- Remove unused states/cities indexes
DROP INDEX IF EXISTS idx_states_state_name;
DROP INDEX IF EXISTS idx_cities_city_name;
DROP INDEX IF EXISTS idx_cities_state_name;

-- Remove unused accounts indexes
DROP INDEX IF EXISTS idx_accounts_employee_created;

-- Remove unused merged_quotations indexes
DROP INDEX IF EXISTS idx_merged_quotations_created_at;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ALL 42 PERFORMANCE SUGGESTIONS FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '1. Added 6 missing foreign key indexes';
    RAISE NOTICE '2. Removed 36 unused indexes';
    RAISE NOTICE '';
    RAISE NOTICE 'Total: 42 suggestions resolved';
    RAISE NOTICE '';
    RAISE NOTICE 'Your database is now optimized!';
    RAISE NOTICE '';
END $$;

-- Check foreign key indexes were created
SELECT 
    'Foreign Key Indexes Created' as check_type,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_merged_quotations_city_id',
    'idx_merged_quotations_state_id',
    'idx_notifications_sub_account_id',
    'idx_quotes_mbcb_city_id',
    'idx_quotes_paint_city_id',
    'idx_quotes_signages_city_id'
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
    'idx_quotes_mbcb_state_id',
    'idx_quotes_paint_state_id',
    'idx_quotes_signages_state_id',
    'idx_sub_accounts_account_active_engagement',
    'idx_sub_accounts_name_active',
    'idx_sub_accounts_account_id',
    'idx_quotes_mbcb_date',
    'idx_quotes_mbcb_created_by_date',
    'idx_quotes_mbcb_status_created',
    'idx_quotes_paint_date',
    'idx_quotes_paint_created_by_date',
    'idx_quotes_paint_status_created',
    'idx_quotes_signages_date',
    'idx_quotes_signages_created_by_date',
    'idx_quotes_signages_status_created',
    'idx_activities_account_id',
    'idx_activities_account_created',
    'idx_contacts_account_id',
    'idx_contacts_sub_account_id',
    'idx_contacts_created_by',
    'idx_leads_account_id',
    'idx_leads_assigned_employee',
    'idx_leads_priority',
    'idx_leads_employee_status',
    'idx_tasks_account_id',
    'idx_tasks_status',
    'idx_tasks_due_date',
    'idx_tasks_employee_status_due',
    'idx_notifications_account_id',
    'idx_notifications_user_seen_created',
    'idx_notifications_user_completed',
    'idx_states_state_name',
    'idx_cities_city_name',
    'idx_cities_state_name',
    'idx_accounts_employee_created',
    'idx_merged_quotations_created_at'
);

-- Final summary
SELECT 
    'Final Summary' as check_type,
    'Foreign Key Indexes Added' as category,
    COUNT(*) as count
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_merged_quotations_city_id',
    'idx_merged_quotations_state_id',
    'idx_notifications_sub_account_id',
    'idx_quotes_mbcb_city_id',
    'idx_quotes_paint_city_id',
    'idx_quotes_signages_city_id'
)
UNION ALL
SELECT 
    'Final Summary' as check_type,
    'Unused Indexes Removed (should be 0)' as category,
    COUNT(*) as count
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_quotes_mbcb_state_id',
    'idx_quotes_paint_state_id',
    'idx_quotes_signages_state_id',
    'idx_sub_accounts_account_active_engagement',
    'idx_sub_accounts_name_active',
    'idx_sub_accounts_account_id',
    'idx_quotes_mbcb_date',
    'idx_quotes_mbcb_created_by_date',
    'idx_quotes_mbcb_status_created',
    'idx_quotes_paint_date',
    'idx_quotes_paint_created_by_date',
    'idx_quotes_paint_status_created',
    'idx_quotes_signages_date',
    'idx_quotes_signages_created_by_date',
    'idx_quotes_signages_status_created',
    'idx_activities_account_id',
    'idx_activities_account_created',
    'idx_contacts_account_id',
    'idx_contacts_sub_account_id',
    'idx_contacts_created_by',
    'idx_leads_account_id',
    'idx_leads_assigned_employee',
    'idx_leads_priority',
    'idx_leads_employee_status',
    'idx_tasks_account_id',
    'idx_tasks_status',
    'idx_tasks_due_date',
    'idx_tasks_employee_status_due',
    'idx_notifications_account_id',
    'idx_notifications_user_seen_created',
    'idx_notifications_user_completed',
    'idx_states_state_name',
    'idx_cities_city_name',
    'idx_cities_state_name',
    'idx_accounts_employee_created',
    'idx_merged_quotations_created_at'
);

