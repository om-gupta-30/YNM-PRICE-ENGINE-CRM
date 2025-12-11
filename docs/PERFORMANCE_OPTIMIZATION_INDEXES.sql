-- ============================================================
-- PERFORMANCE OPTIMIZATION: Database Index Suggestions
-- ============================================================
-- 
-- These indexes should be run manually in Supabase SQL Editor
-- to dramatically improve query speed for the CRM.
-- 
-- IMPORTANT: These are safe, additive indexes that will NOT
-- break any existing functionality. They only improve query
-- performance.
-- 
-- Run these one at a time or all together in Supabase SQL Editor.
-- ============================================================

-- Index for notifications queries (most common filter pattern)
-- Improves: /api/notifications/follow-ups route
CREATE INDEX IF NOT EXISTS notif_user_seen_idx 
ON notifications(user_id, is_seen);

-- Index for leads follow-up date queries
-- Improves: Lead follow-up filtering and sorting
CREATE INDEX IF NOT EXISTS leads_follow_idx 
ON leads(follow_up_date);

-- Index for contacts follow-up date queries
-- Improves: Contact follow-up filtering and sorting
CREATE INDEX IF NOT EXISTS contacts_follow_idx 
ON contacts(follow_up_date);

-- Index for leads assigned employee queries
-- Improves: /api/crm/leads/list route filtering
-- Note: Leads table may use assigned_employee OR assigned_to - check both
DO $$
BEGIN
  -- Check if assigned_employee column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'assigned_employee'
  ) THEN
    CREATE INDEX IF NOT EXISTS leads_assigned_employee_idx 
    ON leads(assigned_employee);
  END IF;
  
  -- Check if assigned_to column exists (some leads queries use this)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'assigned_to'
  ) THEN
    CREATE INDEX IF NOT EXISTS leads_assigned_to_idx 
    ON leads(assigned_to);
  END IF;
END $$;

-- Index for contacts assigned employee queries
-- Improves: Contact filtering by employee
-- Note: Contacts table may not have assigned_employee column
DO $$
BEGIN
  -- Check if assigned_employee column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'assigned_employee'
  ) THEN
    CREATE INDEX IF NOT EXISTS contacts_assigned_employee_idx 
    ON contacts(assigned_employee);
  END IF;
  
  -- Check if assigned_to column exists (some contacts queries may use this)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'assigned_to'
  ) THEN
    CREATE INDEX IF NOT EXISTS contacts_assigned_to_idx 
    ON contacts(assigned_to);
  END IF;
END $$;

-- Index for accounts assigned employee queries
-- Improves: /api/accounts route filtering
-- Note: Accounts table uses assigned_employee
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'assigned_employee'
  ) THEN
    CREATE INDEX IF NOT EXISTS accounts_assigned_employee_idx 
    ON accounts(assigned_employee);
  END IF;
END $$;

-- Index for accounts active status queries
-- Improves: Account filtering by is_active
CREATE INDEX IF NOT EXISTS accounts_active_idx 
ON accounts(is_active);

-- Index for sub_accounts active status queries
-- Improves: Sub-account filtering by is_active
CREATE INDEX IF NOT EXISTS sub_accounts_active_idx 
ON sub_accounts(is_active);

-- Index for sub_accounts account_id queries (foreign key)
-- Improves: Sub-account lookups by account
CREATE INDEX IF NOT EXISTS sub_accounts_account_idx 
ON sub_accounts(account_id);

-- Index for notifications type and completion status
-- Improves: Notification filtering by type and completion
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'notification_type'
  ) THEN
    CREATE INDEX IF NOT EXISTS notif_type_completed_idx 
    ON notifications(notification_type, is_completed);
  END IF;
END $$;

-- Index for tasks assigned_to queries (tasks use assigned_to, not assigned_employee)
-- Improves: Task filtering by employee
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'assigned_to'
  ) THEN
    CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx 
    ON tasks(assigned_to);
  END IF;
  
  -- Also check for assigned_employee in tasks (some code may use both)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'assigned_employee'
  ) THEN
    CREATE INDEX IF NOT EXISTS tasks_assigned_employee_idx 
    ON tasks(assigned_employee);
  END IF;
END $$;

-- ============================================================
-- Notes:
-- - All indexes use IF NOT EXISTS to prevent errors if already present
-- - These indexes will speed up the most common query patterns
-- - Indexes are automatically maintained by PostgreSQL
-- - They may slightly slow down INSERT/UPDATE operations but
--   dramatically speed up SELECT queries
-- ============================================================
