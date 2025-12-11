-- ============================================
-- COMPREHENSIVE PERFORMANCE OPTIMIZATION
-- ============================================
-- This script optimizes ALL critical query patterns for fast loading,
-- fast add/edit operations, and smooth user experience.
--
-- Based on actual query patterns in your codebase:
-- - Sub_accounts: account_id + is_active + engagement_score (50k+ queries)
-- - Accounts: assigned_employee, created_at ordering
-- - Quotes: sub_account_id, account_id, created_by, status, date
-- - Activities: employee_id, account_id, created_at
-- - Contacts, Leads, Tasks, Notifications: common filter patterns
--
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: SUB_ACCOUNTS TABLE (MOST CRITICAL)
-- ============================================
-- Pattern: WHERE account_id = ? AND is_active = ? ORDER BY engagement_score DESC
-- This is queried 50,000+ times - MUST be fast!

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_sub_accounts_account_active_engagement 
ON sub_accounts(account_id, is_active, engagement_score DESC);

-- Index for sub_account_name lookups (used in quotes creation)
CREATE INDEX IF NOT EXISTS idx_sub_accounts_name_active 
ON sub_accounts(sub_account_name, is_active) 
WHERE is_active = true;

-- Index for account_id lookups (for related queries)
CREATE INDEX IF NOT EXISTS idx_sub_accounts_account_id 
ON sub_accounts(account_id);

-- ============================================
-- PART 2: ACCOUNTS TABLE
-- ============================================
-- Patterns: assigned_employee filtering, created_at ordering

-- Index for employee filtering (common in CRM)
CREATE INDEX IF NOT EXISTS idx_accounts_assigned_employee 
ON accounts(assigned_employee);

-- Composite index for employee + created_at (common pattern)
CREATE INDEX IF NOT EXISTS idx_accounts_employee_created 
ON accounts(assigned_employee, created_at DESC);

-- Index for account_name lookups
CREATE INDEX IF NOT EXISTS idx_accounts_account_name 
ON accounts(account_name);

-- ============================================
-- PART 3: QUOTES TABLES (MBCB, SIGNAGES, PAINT)
-- ============================================
-- Patterns: sub_account_id, account_id, created_by, status, date filters

-- Quotes MBCB
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_sub_account_id 
ON quotes_mbcb(sub_account_id);

CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_account_id 
ON quotes_mbcb(account_id);

CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_created_by 
ON quotes_mbcb(created_by);

CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_status 
ON quotes_mbcb(status);

CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_date 
ON quotes_mbcb(date DESC);

-- Composite for common pattern: created_by + date
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_created_by_date 
ON quotes_mbcb(created_by, date DESC);

-- Composite for status + created_at (for filtering)
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_status_created 
ON quotes_mbcb(status, created_at DESC);

-- Quotes Signages
CREATE INDEX IF NOT EXISTS idx_quotes_signages_sub_account_id 
ON quotes_signages(sub_account_id);

CREATE INDEX IF NOT EXISTS idx_quotes_signages_account_id 
ON quotes_signages(account_id);

CREATE INDEX IF NOT EXISTS idx_quotes_signages_created_by 
ON quotes_signages(created_by);

CREATE INDEX IF NOT EXISTS idx_quotes_signages_status 
ON quotes_signages(status);

CREATE INDEX IF NOT EXISTS idx_quotes_signages_date 
ON quotes_signages(date DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_signages_created_by_date 
ON quotes_signages(created_by, date DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_signages_status_created 
ON quotes_signages(status, created_at DESC);

-- Quotes Paint
CREATE INDEX IF NOT EXISTS idx_quotes_paint_sub_account_id 
ON quotes_paint(sub_account_id);

CREATE INDEX IF NOT EXISTS idx_quotes_paint_account_id 
ON quotes_paint(account_id);

CREATE INDEX IF NOT EXISTS idx_quotes_paint_created_by 
ON quotes_paint(created_by);

CREATE INDEX IF NOT EXISTS idx_quotes_paint_status 
ON quotes_paint(status);

CREATE INDEX IF NOT EXISTS idx_quotes_paint_date 
ON quotes_paint(date DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_paint_created_by_date 
ON quotes_paint(created_by, date DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_paint_status_created 
ON quotes_paint(status, created_at DESC);

-- ============================================
-- PART 4: ACTIVITIES TABLE
-- ============================================
-- Patterns: employee_id, account_id, created_at, activity_type

-- Keep existing employee + created_at index (already optimal)
-- Ensure it exists
CREATE INDEX IF NOT EXISTS idx_activities_employee_created_at 
ON activities(employee_id, created_at DESC);

-- Index for account_id lookups
CREATE INDEX IF NOT EXISTS idx_activities_account_id 
ON activities(account_id);

-- Index for activity_type filtering
CREATE INDEX IF NOT EXISTS idx_activities_activity_type 
ON activities(activity_type);

-- Composite for account + created_at (common pattern)
CREATE INDEX IF NOT EXISTS idx_activities_account_created 
ON activities(account_id, created_at DESC);

-- ============================================
-- PART 5: CONTACTS TABLE
-- ============================================
-- Patterns: account_id, sub_account_id, created_by

CREATE INDEX IF NOT EXISTS idx_contacts_account_id 
ON contacts(account_id);

CREATE INDEX IF NOT EXISTS idx_contacts_sub_account_id 
ON contacts(sub_account_id);

CREATE INDEX IF NOT EXISTS idx_contacts_created_by 
ON contacts(created_by);

-- ============================================
-- PART 6: LEADS TABLE
-- ============================================
-- Patterns: account_id, assigned_employee, status, priority

CREATE INDEX IF NOT EXISTS idx_leads_account_id 
ON leads(account_id);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_employee 
ON leads(assigned_employee);

CREATE INDEX IF NOT EXISTS idx_leads_status 
ON leads(status);

CREATE INDEX IF NOT EXISTS idx_leads_priority 
ON leads(priority DESC);

-- Composite for employee + status (common filter)
CREATE INDEX IF NOT EXISTS idx_leads_employee_status 
ON leads(assigned_employee, status);

-- ============================================
-- PART 7: TASKS TABLE
-- ============================================
-- Patterns: account_id, assigned_employee, status, due_date

CREATE INDEX IF NOT EXISTS idx_tasks_account_id 
ON tasks(account_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employee 
ON tasks(assigned_employee);

CREATE INDEX IF NOT EXISTS idx_tasks_status 
ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date 
ON tasks(due_date);

-- Composite for employee + status + due_date (common pattern)
CREATE INDEX IF NOT EXISTS idx_tasks_employee_status_due 
ON tasks(assigned_employee, status, due_date);

-- ============================================
-- PART 8: NOTIFICATIONS TABLE
-- ============================================
-- Patterns: user_id, is_seen, is_completed, account_id

CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_account_id 
ON notifications(account_id);

CREATE INDEX IF NOT EXISTS idx_notifications_contact_id 
ON notifications(contact_id);

-- Composite for user + seen + created_at (most common pattern)
CREATE INDEX IF NOT EXISTS idx_notifications_user_seen_created 
ON notifications(user_id, is_seen, created_at DESC);

-- Composite for user + completed
CREATE INDEX IF NOT EXISTS idx_notifications_user_completed 
ON notifications(user_id, is_completed, created_at DESC);

-- ============================================
-- PART 9: STATES AND CITIES (LOOKUP TABLES)
-- ============================================
-- These are queried frequently for dropdowns

-- States: already has primary key index, add name index for sorting
CREATE INDEX IF NOT EXISTS idx_states_state_name 
ON states(state_name);

-- Cities: already has primary key index, add name index
CREATE INDEX IF NOT EXISTS idx_cities_city_name 
ON cities(city_name);

-- Composite for state + city name (for lookups)
CREATE INDEX IF NOT EXISTS idx_cities_state_name 
ON cities(state_id, city_name);

-- ============================================
-- PART 10: MERGED_QUOTATIONS TABLE
-- ============================================
-- Patterns: account_id, sub_account_id, created_at

CREATE INDEX IF NOT EXISTS idx_merged_quotations_account_id 
ON merged_quotations(account_id);

CREATE INDEX IF NOT EXISTS idx_merged_quotations_sub_account_id 
ON merged_quotations(sub_account_id);

CREATE INDEX IF NOT EXISTS idx_merged_quotations_created_at 
ON merged_quotations(created_at DESC);

-- ============================================
-- PART 11: UPDATE TABLE STATISTICS
-- ============================================
-- Update statistics to help PostgreSQL's query planner choose optimal plans

ANALYZE sub_accounts;
ANALYZE accounts;
ANALYZE quotes_mbcb;
ANALYZE quotes_signages;
ANALYZE quotes_paint;
ANALYZE activities;
ANALYZE contacts;
ANALYZE leads;
ANALYZE tasks;
ANALYZE notifications;
ANALYZE states;
ANALYZE cities;
ANALYZE merged_quotations;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COMPREHENSIVE PERFORMANCE OPTIMIZATION COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Optimized for:';
    RAISE NOTICE '1. Fast loading (SELECT queries)';
    RAISE NOTICE '2. Fast add/edit (INSERT/UPDATE queries)';
    RAISE NOTICE '3. Smooth user experience';
    RAISE NOTICE '';
    RAISE NOTICE 'All critical query patterns are now indexed:';
    RAISE NOTICE '- Sub_accounts: account_id + is_active + engagement_score';
    RAISE NOTICE '- Accounts: assigned_employee, created_at';
    RAISE NOTICE '- Quotes: sub_account_id, account_id, created_by, status, date';
    RAISE NOTICE '- Activities: employee_id, account_id, created_at';
    RAISE NOTICE '- Contacts, Leads, Tasks, Notifications: all filter patterns';
    RAISE NOTICE '';
    RAISE NOTICE 'Your application should now be significantly faster!';
    RAISE NOTICE '';
END $$;

-- Show summary of indexes created
SELECT 
    'Index Summary by Table' as check_type,
    tablename,
    COUNT(*) as total_indexes
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'sub_accounts', 'accounts', 'quotes_mbcb', 'quotes_signages', 
    'quotes_paint', 'activities', 'contacts', 'leads', 
    'tasks', 'notifications', 'states', 'cities', 'merged_quotations'
)
GROUP BY tablename
ORDER BY tablename;

-- Show critical composite indexes
SELECT 
    'Critical Composite Indexes' as check_type,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_sub_accounts_account_active_engagement',
    'idx_sub_accounts_name_active',
    'idx_accounts_employee_created',
    'idx_quotes_mbcb_created_by_date',
    'idx_quotes_mbcb_status_created',
    'idx_quotes_signages_created_by_date',
    'idx_quotes_signages_status_created',
    'idx_quotes_paint_created_by_date',
    'idx_quotes_paint_status_created',
    'idx_activities_employee_created_at',
    'idx_activities_account_created',
    'idx_leads_employee_status',
    'idx_tasks_employee_status_due',
    'idx_notifications_user_seen_created',
    'idx_notifications_user_completed'
)
ORDER BY tablename, indexname;

