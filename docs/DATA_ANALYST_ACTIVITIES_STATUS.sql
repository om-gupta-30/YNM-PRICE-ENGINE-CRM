-- ============================================================================
-- DATA ANALYST ACTIVITIES & STATUS TRACKING
-- ============================================================================
-- This script documents the database schema support for tracking activities
-- and status for both employees and data analysts.
--
-- Changes implemented:
-- 1. Login/logout activities now tracked for data analysts (in addition to employees)
-- 2. Logout reasons now required and tracked for data analysts
-- 3. Status tracking (online/away/inactive) now works for data analysts
-- 4. Activities section shows login/logout for data analysts
-- 5. Status display shows data analysts alongside employees
--
-- ============================================================================
-- EXISTING TABLES (No schema changes needed)
-- ============================================================================

-- The existing 'activities' table already supports tracking for all users:
-- - employee_id column stores username (works for employees and data analysts)
-- - activity_type includes 'login', 'logout', 'away', 'inactive'
-- - No changes needed to this table

-- The existing 'logout_reasons' table already supports all users:
-- - user_id column stores username (works for employees and data analysts)
-- - No changes needed to this table

-- The existing 'users' table already has all necessary columns:
-- - username column identifies users (employees, data analysts, admin)
-- - login_time, logout_time columns track login/logout times
-- - No changes needed to this table

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Verify activities table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'activities'
ORDER BY ordinal_position;

-- 2. Verify logout_reasons table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'logout_reasons'
ORDER BY ordinal_position;

-- 3. Check recent login activities (should include data analysts)
SELECT 
    employee_id,
    activity_type,
    description,
    created_at,
    metadata
FROM activities
WHERE activity_type = 'login'
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check recent logout activities with reasons (should include data analysts)
SELECT 
    a.employee_id,
    a.activity_type,
    a.description,
    a.created_at,
    lr.reason_tag,
    lr.reason_text
FROM activities a
LEFT JOIN logout_reasons lr ON lr.user_id = a.employee_id 
    AND ABS(EXTRACT(EPOCH FROM (lr.created_at - a.created_at))) < 60
WHERE a.activity_type = 'logout'
ORDER BY a.created_at DESC
LIMIT 20;

-- 5. Check status change activities (should include data analysts)
-- NOTE: This query requires 'away' and 'inactive' to be added to activity_type_enum first
-- Run docs/ADD_AWAY_INACTIVE_TO_ACTIVITY_TYPE_ENUM.sql before running this query
SELECT 
    employee_id,
    activity_type,
    description,
    created_at,
    metadata->>'status' as status
FROM activities
WHERE activity_type IN ('away', 'inactive')
ORDER BY created_at DESC
LIMIT 20;

-- 6. List all users (employees and data analysts)
SELECT 
    username,
    login_time,
    logout_time,
    last_login
FROM users
WHERE username != 'Admin'
ORDER BY username;

-- ============================================================================
-- IMPORTANT: UPDATE ENUM TYPE FIRST
-- ============================================================================
-- Before running queries with 'away' and 'inactive', you must add these values
-- to the activity_type_enum. Run this script first:
-- 
-- Run: docs/ADD_AWAY_INACTIVE_TO_ACTIVITY_TYPE_ENUM.sql
--
-- ============================================================================
-- OPTIONAL: INDEXES FOR PERFORMANCE (if not already exists)
-- ============================================================================

-- Index on activities table for faster queries by employee_id and activity_type
CREATE INDEX IF NOT EXISTS idx_activities_employee_type 
ON activities(employee_id, activity_type);

-- Index on activities table for faster date range queries
CREATE INDEX IF NOT EXISTS idx_activities_created_at 
ON activities(created_at DESC);

-- Index on logout_reasons for faster lookups
CREATE INDEX IF NOT EXISTS idx_logout_reasons_user_created 
ON logout_reasons(user_id, created_at DESC);

-- ============================================================================
-- TEST QUERIES
-- ============================================================================

-- Test: Get all activities for a specific data analyst
-- Replace 'swamymahesh' or 'mahesh' with actual data analyst username
SELECT 
    activity_type,
    description,
    created_at,
    metadata
FROM activities
WHERE employee_id = 'swamymahesh'  -- or 'mahesh'
ORDER BY created_at DESC
LIMIT 10;

-- Test: Get logout reasons for data analysts
SELECT 
    user_id,
    reason_tag,
    reason_text,
    created_at
FROM logout_reasons
WHERE user_id IN ('swamymahesh', 'mahesh')
ORDER BY created_at DESC;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Data analysts are identified by username: 'swamymahesh' and 'mahesh'
-- 2. Full admin is identified by username: 'Admin'
-- 3. All other users are employees (Employee1, Employee2, Employee3, etc.)
-- 4. The application code handles the distinction between these user types
-- 5. No database schema changes are required - existing tables support all user types
-- 6. Status tracking uses the activities table with activity_type values:
--    - 'online' (implicit, when user is active)
--    - 'away' (after 5 minutes of inactivity)
--    - 'inactive' (after 10 minutes of inactivity)
--    - 'logged_out' (after 15 minutes of inactivity or manual logout)
--
-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
