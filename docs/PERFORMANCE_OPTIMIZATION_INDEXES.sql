-- Performance Optimization Indexes for Free Tier
-- Run this SQL in your Supabase SQL Editor to improve query performance
-- This is especially important for free tier where resources are limited

-- ============================================
-- CRITICAL INDEXES FOR EDIT/ASSIGNMENT OPERATIONS
-- ============================================

-- Accounts table indexes
CREATE INDEX IF NOT EXISTS idx_accounts_assigned_employee ON accounts(assigned_employee) WHERE assigned_employee IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_assigned_to ON accounts(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_last_activity_at ON accounts(last_activity_at DESC) WHERE last_activity_at IS NOT NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_accounts_employee_active ON accounts(assigned_employee, is_active) WHERE is_active = true AND assigned_employee IS NOT NULL;

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employee ON tasks(assigned_employee) WHERE assigned_employee IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_account_id ON tasks(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Composite indexes for common task queries
CREATE INDEX IF NOT EXISTS idx_tasks_employee_status ON tasks(assigned_employee, status) WHERE assigned_employee IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_employee_due_date ON tasks(assigned_employee, due_date) WHERE assigned_employee IS NOT NULL AND due_date IS NOT NULL;

-- Leads table indexes
CREATE INDEX IF NOT EXISTS idx_leads_assigned_employee ON leads(assigned_employee) WHERE assigned_employee IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON leads(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Sub-accounts table indexes
CREATE INDEX IF NOT EXISTS idx_sub_accounts_account_id ON sub_accounts(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sub_accounts_assigned_employee ON sub_accounts(assigned_employee) WHERE assigned_employee IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sub_accounts_is_active ON sub_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sub_accounts_name ON sub_accounts(sub_account_name);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_account_active ON sub_accounts(account_id, is_active) WHERE is_active = true;

-- Contacts table indexes
-- Note: Contacts table uses 'created_by' column, not 'assigned_to' or 'assigned_employee_id'
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_sub_account_id ON contacts(sub_account_id) WHERE sub_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_call_status ON contacts(call_status) WHERE call_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_follow_up_date ON contacts(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- Activities table indexes (for activity logging)
CREATE INDEX IF NOT EXISTS idx_activities_account_id ON activities(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_employee_id ON activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_employee_created ON activities(employee_id, created_at DESC);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_related_id ON notifications(related_id, related_type) WHERE related_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_is_completed ON notifications(is_completed) WHERE is_completed = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Quotes tables indexes
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_sub_account_id ON quotes_mbcb(sub_account_id) WHERE sub_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_created_by ON quotes_mbcb(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_created_at ON quotes_mbcb(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_status ON quotes_mbcb(status);

CREATE INDEX IF NOT EXISTS idx_quotes_signages_sub_account_id ON quotes_signages(sub_account_id) WHERE sub_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_signages_created_by ON quotes_signages(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_signages_created_at ON quotes_signages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_status ON quotes_signages(status);

CREATE INDEX IF NOT EXISTS idx_quotes_paint_sub_account_id ON quotes_paint(sub_account_id) WHERE sub_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_paint_created_by ON quotes_paint(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_paint_created_at ON quotes_paint(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_status ON quotes_paint(status);

-- States and Cities indexes (for lookup performance)
CREATE INDEX IF NOT EXISTS idx_states_state_name ON states(state_name);
CREATE INDEX IF NOT EXISTS idx_cities_city_name ON cities(city_name);
CREATE INDEX IF NOT EXISTS idx_cities_state_id ON cities(state_id) WHERE state_id IS NOT NULL;

-- ============================================
-- ANALYZE TABLES FOR QUERY OPTIMIZER
-- ============================================
-- Run ANALYZE to update table statistics for better query planning

ANALYZE accounts;
ANALYZE tasks;
ANALYZE leads;
ANALYZE sub_accounts;
ANALYZE contacts;
ANALYZE activities;
ANALYZE notifications;
ANALYZE quotes_mbcb;
ANALYZE quotes_signages;
ANALYZE quotes_paint;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify indexes were created:

-- SELECT tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('accounts', 'tasks', 'leads', 'sub_accounts', 'contacts', 'activities', 'notifications')
-- ORDER BY tablename, indexname;

