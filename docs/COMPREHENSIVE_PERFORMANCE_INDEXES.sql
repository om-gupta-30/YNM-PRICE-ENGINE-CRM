-- ============================================
-- COMPREHENSIVE PERFORMANCE INDEXES
-- ============================================
-- This file contains ALL critical indexes for optimal query performance
-- Run this in your Supabase SQL Editor to dramatically improve website speed
-- ============================================

-- ============================================
-- QUOTES TABLES - CRITICAL INDEXES
-- ============================================
-- These indexes are essential for fast quote lookups and filtering

-- Quotes MBCB indexes
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_state_city ON quotes_mbcb(state_id, city_id) WHERE state_id IS NOT NULL AND city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_date ON quotes_mbcb(date DESC) WHERE date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_sub_account_id ON quotes_mbcb(sub_account_id) WHERE sub_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_created_by ON quotes_mbcb(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_created_at ON quotes_mbcb(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_status ON quotes_mbcb(status);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_contact_id ON quotes_mbcb(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_created_by_date ON quotes_mbcb(created_by, date DESC) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_status_created_at ON quotes_mbcb(status, created_at DESC);

-- Quotes Signages indexes
CREATE INDEX IF NOT EXISTS idx_quotes_signages_state_city ON quotes_signages(state_id, city_id) WHERE state_id IS NOT NULL AND city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_signages_date ON quotes_signages(date DESC) WHERE date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_signages_sub_account_id ON quotes_signages(sub_account_id) WHERE sub_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_signages_created_by ON quotes_signages(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_signages_created_at ON quotes_signages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_status ON quotes_signages(status);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_contact_id ON quotes_signages(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_signages_created_by_date ON quotes_signages(created_by, date DESC) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_signages_status_created_at ON quotes_signages(status, created_at DESC);

-- Quotes Paint indexes
CREATE INDEX IF NOT EXISTS idx_quotes_paint_state_city ON quotes_paint(state_id, city_id) WHERE state_id IS NOT NULL AND city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_paint_date ON quotes_paint(date DESC) WHERE date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_paint_sub_account_id ON quotes_paint(sub_account_id) WHERE sub_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_paint_created_by ON quotes_paint(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_paint_created_at ON quotes_paint(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_status ON quotes_paint(status);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_contact_id ON quotes_paint(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_paint_created_by_date ON quotes_paint(created_by, date DESC) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_paint_status_created_at ON quotes_paint(status, created_at DESC);

-- ============================================
-- ACCOUNTS TABLE - CRITICAL INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accounts_assigned_employee ON accounts(assigned_employee) WHERE assigned_employee IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_assigned_to ON accounts(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_last_activity_at ON accounts(last_activity_at DESC) WHERE last_activity_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_account_name ON accounts(account_name);
CREATE INDEX IF NOT EXISTS idx_accounts_employee_active ON accounts(assigned_employee, is_active) WHERE is_active = true AND assigned_employee IS NOT NULL;

-- ============================================
-- SUB_ACCOUNTS TABLE - CRITICAL INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sub_accounts_account_id ON sub_accounts(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sub_accounts_assigned_employee ON sub_accounts(assigned_employee) WHERE assigned_employee IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sub_accounts_is_active ON sub_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sub_accounts_name ON sub_accounts(sub_account_name);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_account_active ON sub_accounts(account_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sub_accounts_name_active ON sub_accounts(sub_account_name, is_active) WHERE is_active = true;

-- ============================================
-- TASKS TABLE - CRITICAL INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employee ON tasks(assigned_employee) WHERE assigned_employee IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_account_id ON tasks(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_employee_status ON tasks(assigned_employee, status) WHERE assigned_employee IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_employee_due_date ON tasks(assigned_employee, due_date) WHERE assigned_employee IS NOT NULL AND due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type) WHERE task_type IS NOT NULL;

-- ============================================
-- LEADS TABLE - CRITICAL INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_assigned_employee ON leads(assigned_employee) WHERE assigned_employee IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON leads(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ============================================
-- CONTACTS TABLE - CRITICAL INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_sub_account_id ON contacts(sub_account_id) WHERE sub_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_call_status ON contacts(call_status) WHERE call_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_follow_up_date ON contacts(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- ============================================
-- ACTIVITIES TABLE - CRITICAL INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_activities_account_id ON activities(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_employee_id ON activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_employee_created ON activities(employee_id, created_at DESC);

-- ============================================
-- NOTIFICATIONS TABLE - CRITICAL INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_related_id ON notifications(related_id, related_type) WHERE related_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_is_completed ON notifications(is_completed) WHERE is_completed = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_completed ON notifications(user_id, is_completed) WHERE user_id IS NOT NULL AND is_completed = false;

-- ============================================
-- STATES AND CITIES - CRITICAL INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_states_state_name ON states(state_name);
CREATE INDEX IF NOT EXISTS idx_cities_city_name ON cities(city_name);
CREATE INDEX IF NOT EXISTS idx_cities_state_id ON cities(state_id) WHERE state_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cities_state_name ON cities(state_id, city_name) WHERE state_id IS NOT NULL;

-- ============================================
-- ANALYZE ALL TABLES FOR QUERY OPTIMIZER
-- ============================================
-- This updates table statistics for better query planning
-- Only analyze tables that exist (safe to run even if some don't exist)
DO $$
BEGIN
  -- Analyze quotes tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_mbcb') THEN
    ANALYZE quotes_mbcb;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_signages') THEN
    ANALYZE quotes_signages;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_paint') THEN
    ANALYZE quotes_paint;
  END IF;
  
  -- Analyze CRM tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
    ANALYZE accounts;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sub_accounts') THEN
    ANALYZE sub_accounts;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ANALYZE tasks;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
    ANALYZE leads;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    ANALYZE contacts;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
    ANALYZE activities;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    ANALYZE notifications;
  END IF;
  
  -- Analyze location tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'states') THEN
    ANALYZE states;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cities') THEN
    ANALYZE cities;
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this query to verify all indexes were created:
-- 
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
--   AND tablename IN (
--     'quotes_mbcb', 'quotes_signages', 'quotes_paint',
--     'accounts', 'sub_accounts', 'tasks', 'leads', 
--     'contacts', 'activities', 'notifications', 
--     'states', 'cities'
--   )
-- ORDER BY tablename, indexname;

