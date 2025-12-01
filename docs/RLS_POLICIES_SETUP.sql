-- ============================================
-- RLS POLICIES SETUP FOR YNM SAFETY CRM
-- Run this script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. USERS TABLE - Allow SELECT and INSERT for service role
-- ============================================

-- First, disable RLS if it's causing issues (recommended for server-side only)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- OR if you want to keep RLS enabled, use these policies:
-- Enable RLS on users table
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
-- DROP POLICY IF EXISTS "Service role can select users" ON users;
-- DROP POLICY IF EXISTS "Service role can insert users" ON users;
-- DROP POLICY IF EXISTS "Allow service role full access" ON users;

-- Policy: Allow service role to SELECT (for login)
-- CREATE POLICY "Service role can select users"
-- ON users
-- FOR SELECT
-- TO service_role
-- USING (true);

-- Policy: Allow service role to INSERT (for user creation)
-- CREATE POLICY "Service role can insert users"
-- ON users
-- FOR INSERT
-- TO service_role
-- WITH CHECK (true);

-- Alternative: Single policy for all operations
-- CREATE POLICY "Allow service role full access"
-- ON users
-- FOR ALL
-- TO service_role
-- USING (true)
-- WITH CHECK (true);

-- ============================================
-- 2. DISABLE RLS ON TABLES USED BY SERVER-SIDE API
-- ============================================
-- Since we're using service_role key on server-side,
-- we can disable RLS on most tables

ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes_mbcb DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes_signages DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes_paint DISABLE ROW LEVEL SECURITY;
ALTER TABLE places_of_supply DISABLE ROW LEVEL SECURITY;
ALTER TABLE purposes DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_customer DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. ALTERNATIVE: ENABLE RLS WITH PERMISSIVE POLICIES
-- ============================================
-- If you want to enable RLS for security, use these policies instead:

/*
-- Customers: Allow all operations for service role
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to customers"
ON customers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Accounts: Allow all operations for service role
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to accounts"
ON accounts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Contacts: Allow all operations for service role
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to contacts"
ON contacts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Activities: Allow all operations for service role
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to activities"
ON activities
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Leads: Allow all operations for service role
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to leads"
ON leads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Tasks: Allow all operations for service role
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to tasks"
ON tasks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Notifications: Allow all operations for service role
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to notifications"
ON notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Quotes tables: Allow all operations for service role
ALTER TABLE quotes_mbcb ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to quotes_mbcb"
ON quotes_mbcb
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

ALTER TABLE quotes_signages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to quotes_signages"
ON quotes_signages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

ALTER TABLE quotes_paint ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to quotes_paint"
ON quotes_paint
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
*/

-- ============================================
-- VERIFICATION
-- ============================================
-- Check RLS status:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;

-- ============================================
-- END OF SCRIPT
-- ============================================

