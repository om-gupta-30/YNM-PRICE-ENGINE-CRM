-- ============================================
-- ACTIVITY NOTIFICATIONS SETUP
-- This script creates the table to track activity notification seen status
-- Run this in your Supabase SQL Editor
-- ============================================

-- Create table to track which activity notifications have been seen by which users
CREATE TABLE IF NOT EXISTS activity_notifications_seen (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  section_type TEXT NOT NULL CHECK (section_type IN ('accounts', 'tasks', 'leads')),
  seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(activity_id, employee_id, section_type)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_notifications_seen_activity_id ON activity_notifications_seen(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_notifications_seen_employee_id ON activity_notifications_seen(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_notifications_seen_section_type ON activity_notifications_seen(section_type);
CREATE INDEX IF NOT EXISTS idx_activity_notifications_seen_employee_section ON activity_notifications_seen(employee_id, section_type);

-- Add comments for documentation
COMMENT ON TABLE activity_notifications_seen IS 'Tracks which activity notifications have been seen by which employees for dashboard notifications';
COMMENT ON COLUMN activity_notifications_seen.activity_id IS 'Reference to the activity that generated the notification';
COMMENT ON COLUMN activity_notifications_seen.employee_id IS 'Username of the employee who saw the notification';
COMMENT ON COLUMN activity_notifications_seen.section_type IS 'Dashboard section: accounts, tasks, or leads';

