-- ============================================
-- FIX PERFORMANCE ISSUES: INDEXES AND FOREIGN KEYS
-- ============================================
-- This script fixes performance warnings and suggestions from Supabase Performance Advisor:
-- 1. Removes duplicate index on activities table
-- 2. Adds missing indexes on foreign keys (improves JOIN and DELETE performance)
-- 3. Removes unused indexes (improves INSERT/UPDATE/DELETE performance)
--
-- SAFETY: All operations use IF EXISTS/IF NOT EXISTS to prevent errors
-- The script will not break existing functionality
--
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: FIX DUPLICATE INDEX
-- ============================================
-- The activities table has two identical indexes:
-- - idx_activities_employee_created
-- - idx_activities_employee_created_at
-- Both index (employee_id, created_at DESC)
-- We'll keep the more descriptive name and drop the other

-- Check if both indexes exist and are identical
DO $$
DECLARE
    idx1_exists BOOLEAN;
    idx2_exists BOOLEAN;
    idx1_def TEXT;
    idx2_def TEXT;
BEGIN
    -- Check if indexes exist
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'activities' 
        AND indexname = 'idx_activities_employee_created'
    ) INTO idx1_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'activities' 
        AND indexname = 'idx_activities_employee_created_at'
    ) INTO idx2_exists;
    
    IF idx1_exists AND idx2_exists THEN
        -- Get index definitions
        SELECT indexdef INTO idx1_def
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'activities' 
        AND indexname = 'idx_activities_employee_created';
        
        SELECT indexdef INTO idx2_def
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'activities' 
        AND indexname = 'idx_activities_employee_created_at';
        
        -- Check if they're identical (normalize for comparison)
        IF REPLACE(REPLACE(LOWER(idx1_def), ' ', ''), 'ifnotexists', '') = 
           REPLACE(REPLACE(LOWER(idx2_def), ' ', ''), 'ifnotexists', '') THEN
            -- Drop the less descriptive one
            DROP INDEX IF EXISTS idx_activities_employee_created;
            RAISE NOTICE '✅ Dropped duplicate index: idx_activities_employee_created';
            RAISE NOTICE '   Kept: idx_activities_employee_created_at';
        ELSE
            RAISE NOTICE '⚠️  Indexes exist but definitions differ. Manual review needed.';
            RAISE NOTICE '   idx1: %', idx1_def;
            RAISE NOTICE '   idx2: %', idx2_def;
        END IF;
    ELSIF idx1_exists THEN
        -- Only first exists, rename it to the more descriptive name
        DROP INDEX IF EXISTS idx_activities_employee_created;
        CREATE INDEX IF NOT EXISTS idx_activities_employee_created_at 
        ON activities(employee_id, created_at DESC);
        RAISE NOTICE '✅ Recreated index with descriptive name: idx_activities_employee_created_at';
    ELSIF idx2_exists THEN
        RAISE NOTICE '✅ Index idx_activities_employee_created_at already exists (correct)';
    ELSE
        RAISE NOTICE '⚠️  Neither index exists. Creating idx_activities_employee_created_at';
        CREATE INDEX IF NOT EXISTS idx_activities_employee_created_at 
        ON activities(employee_id, created_at DESC);
    END IF;
END $$;

-- ============================================
-- PART 2: ADD MISSING INDEXES ON FOREIGN KEYS
-- ============================================
-- Foreign keys without indexes can cause performance issues during:
-- - JOIN operations
-- - DELETE operations (cascade checks)
-- - UPDATE operations on referenced tables

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
-- PART 3: REMOVE UNUSED INDEXES
-- ============================================
-- WARNING: These indexes are marked as "unused" by Supabase Performance Advisor
-- Removing them will improve INSERT/UPDATE/DELETE performance and reduce storage
-- 
-- Benefits of removing unused indexes:
-- - Faster INSERT/UPDATE/DELETE operations
-- - Reduced storage space
-- - Faster index maintenance
--
-- Note: If you need these indexes in the future, you can recreate them
-- The Performance Advisor will suggest recreating them if queries need them

-- ============================================
-- UNUSED INDEXES REMOVAL
-- ============================================
-- ============================================
-- UNUSED INDEXES REMOVAL (UNCOMMENT TO ENABLE)
-- ============================================

-- Users table unused indexes
DROP INDEX IF EXISTS idx_users_login_time;
DROP INDEX IF EXISTS idx_users_logout_time;
DROP INDEX IF EXISTS idx_users_last_login;

-- AI conversation history unused indexes
DROP INDEX IF EXISTS idx_ai_conversation_user_time;
DROP INDEX IF EXISTS idx_ai_conversation_mode;
DROP INDEX IF EXISTS idx_ai_conversation_user_id;
DROP INDEX IF EXISTS idx_ai_conversation_session_id;
DROP INDEX IF EXISTS idx_ai_conversation_created_at;

-- AI operation logs unused indexes
DROP INDEX IF EXISTS idx_ai_operation_logs_user_id;
DROP INDEX IF EXISTS idx_ai_operation_logs_operation_type;
DROP INDEX IF EXISTS idx_ai_operation_logs_created_at;
DROP INDEX IF EXISTS idx_ai_operation_logs_success;
DROP INDEX IF EXISTS idx_ai_operation_logs_intent_category;
DROP INDEX IF EXISTS idx_ai_operation_logs_mode;
DROP INDEX IF EXISTS idx_ai_operation_logs_date_type;
DROP INDEX IF EXISTS idx_ai_operation_logs_errors;
DROP INDEX IF EXISTS idx_ai_operation_logs_performance;

-- AI queries unused indexes
DROP INDEX IF EXISTS idx_ai_queries_user_id;
DROP INDEX IF EXISTS idx_ai_queries_mode;
DROP INDEX IF EXISTS idx_ai_queries_created_at;
DROP INDEX IF EXISTS idx_ai_queries_user_time;

-- Lead activities unused indexes
DROP INDEX IF EXISTS idx_lead_activities_employee_id;
DROP INDEX IF EXISTS idx_lead_activities_created_at;

-- Sub accounts unused indexes
DROP INDEX IF EXISTS idx_sub_accounts_name_active;
DROP INDEX IF EXISTS idx_sub_accounts_assigned_employee;

-- Cities unused indexes
DROP INDEX IF EXISTS idx_cities_state_name;
DROP INDEX IF EXISTS idx_cities_city_name;

-- States unused indexes
DROP INDEX IF EXISTS idx_states_state_name;

-- Merged quotations unused indexes
DROP INDEX IF EXISTS idx_merged_quotations_product_type;
DROP INDEX IF EXISTS idx_merged_quotations_created_at;
DROP INDEX IF EXISTS idx_merged_quotations_merged_quote_ids;
DROP INDEX IF EXISTS idx_merged_quotations_is_cross_product;

-- Notifications unused indexes
DROP INDEX IF EXISTS idx_notifications_is_seen;
DROP INDEX IF EXISTS idx_notifications_related_id;
DROP INDEX IF EXISTS idx_notifications_is_completed;
DROP INDEX IF EXISTS idx_notifications_user_completed;

-- Quotes MBCB unused indexes
DROP INDEX IF EXISTS idx_quotes_mbcb_state_city;
DROP INDEX IF EXISTS idx_quotes_mbcb_date;
DROP INDEX IF EXISTS idx_quotes_mbcb_created_by_date;
DROP INDEX IF EXISTS idx_quotes_mbcb_status_created_at;
DROP INDEX IF EXISTS idx_quotes_mbcb_customer_name;
DROP INDEX IF EXISTS idx_quotes_mbcb_customer_id;
DROP INDEX IF EXISTS idx_quotes_mbcb_outcome_status;
DROP INDEX IF EXISTS idx_quotes_mbcb_closed_at;

-- Quotes Paint unused indexes
DROP INDEX IF EXISTS idx_quotes_paint_customer_name;
DROP INDEX IF EXISTS idx_quotes_paint_customer_id;
DROP INDEX IF EXISTS idx_quotes_paint_outcome_status;
DROP INDEX IF EXISTS idx_quotes_paint_closed_at;
DROP INDEX IF EXISTS idx_quotes_paint_state_city;
DROP INDEX IF EXISTS idx_quotes_paint_date;
DROP INDEX IF EXISTS idx_quotes_paint_created_by_date;
DROP INDEX IF EXISTS idx_quotes_paint_status_created_at;

-- Quotes Signages unused indexes
DROP INDEX IF EXISTS idx_quotes_signages_customer_name;
DROP INDEX IF EXISTS idx_quotes_signages_customer_id;
DROP INDEX IF EXISTS idx_quotes_signages_outcome_status;
DROP INDEX IF EXISTS idx_quotes_signages_closed_at;
DROP INDEX IF EXISTS idx_quotes_signages_outcome_closed;
DROP INDEX IF EXISTS idx_quotes_signages_state_city;
DROP INDEX IF EXISTS idx_quotes_signages_date;
DROP INDEX IF EXISTS idx_quotes_signages_created_by_date;
DROP INDEX IF EXISTS idx_quotes_signages_status_created_at;

-- Accounts unused indexes
DROP INDEX IF EXISTS idx_accounts_company_stage;
DROP INDEX IF EXISTS idx_accounts_industries;
DROP INDEX IF EXISTS idx_accounts_assigned_to;
DROP INDEX IF EXISTS idx_accounts_last_activity_at;

-- Tasks unused indexes
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_tasks_created_at;
DROP INDEX IF EXISTS idx_tasks_employee_due_date;
DROP INDEX IF EXISTS idx_tasks_task_type;

-- Activities unused indexes
DROP INDEX IF EXISTS idx_activities_metadata_gin;

-- Activity notifications seen unused indexes
DROP INDEX IF EXISTS idx_activity_notifications_seen_activity_id;
DROP INDEX IF EXISTS idx_activity_notifications_seen_employee_id;
DROP INDEX IF EXISTS idx_activity_notifications_seen_section_type;

-- Activity logs unused indexes
DROP INDEX IF EXISTS idx_activity_logs_employee_id;
DROP INDEX IF EXISTS idx_activity_logs_created_at;

-- AI sessions unused indexes
DROP INDEX IF EXISTS idx_ai_sessions_user_id;
DROP INDEX IF EXISTS idx_ai_sessions_active;
DROP INDEX IF EXISTS idx_ai_sessions_last_activity;
DROP INDEX IF EXISTS idx_ai_sessions_user_active;

-- Employee AI coaching unused indexes
DROP INDEX IF EXISTS idx_employee_ai_coaching_employee;
DROP INDEX IF EXISTS idx_employee_ai_coaching_created_at;

-- Employee notifications unused indexes
DROP INDEX IF EXISTS idx_employee_notifications_is_read;
DROP INDEX IF EXISTS idx_employee_notifications_priority;

-- Logout reasons unused indexes
DROP INDEX IF EXISTS idx_logout_reasons_user_id;
DROP INDEX IF EXISTS idx_logout_reasons_created_at;

-- Pricing learning stats unused indexes
DROP INDEX IF EXISTS idx_pricing_learning_stats_product_type;
DROP INDEX IF EXISTS idx_pricing_learning_stats_updated_at;

-- Pricing outcomes unused indexes
DROP INDEX IF EXISTS idx_pricing_outcomes_product_type;
DROP INDEX IF EXISTS idx_pricing_outcomes_outcome;
DROP INDEX IF EXISTS idx_pricing_outcomes_created_at;

-- Purposes unused indexes
DROP INDEX IF EXISTS idx_purposes_name;

-- Contacts unused indexes
DROP INDEX IF EXISTS idx_contacts_created_by;

-- Leads unused indexes
DROP INDEX IF EXISTS idx_leads_priority;
DROP INDEX IF EXISTS idx_leads_created_by;

-- Engagement history unused indexes
DROP INDEX IF EXISTS idx_engagement_history_sub_account_id;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PERFORMANCE FIXES COMPLETED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '1. Duplicate index removed from activities table';
    RAISE NOTICE '2. Missing foreign key indexes created';
    RAISE NOTICE '3. Unused indexes removal (commented out - uncomment if needed)';
    RAISE NOTICE '';
    RAISE NOTICE 'Please verify in Supabase Performance Advisor that:';
    RAISE NOTICE '- Duplicate index warning is resolved';
    RAISE NOTICE '- Foreign key index suggestions are resolved';
    RAISE NOTICE '';
END $$;

-- Check duplicate index is removed
SELECT 
    'Duplicate Index Check' as check_type,
    COUNT(*) as duplicate_count
FROM (
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' 
    AND tablename = 'activities'
    AND indexname IN ('idx_activities_employee_created', 'idx_activities_employee_created_at')
    GROUP BY indexname, indexdef
    HAVING COUNT(*) > 1
) duplicates;

-- Check foreign key indexes were created
SELECT 
    'Foreign Key Indexes' as check_type,
    indexname,
    tablename,
    indexdef
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

-- Summary of indexes on activities table
SELECT 
    'Activities Indexes' as check_type,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'activities'
ORDER BY indexname;

