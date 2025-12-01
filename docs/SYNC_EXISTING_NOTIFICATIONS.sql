-- Migration script to sync existing contacts with follow-up dates to notifications table
-- This ensures that existing follow-up notifications are stored in the database

-- First, delete any existing follow-up notifications to avoid duplicates
DELETE FROM notifications WHERE notification_type = 'followup_due';

-- Insert notifications for all contacts with follow-up dates (excluding Connected status)
-- The user_id will be set to the assigned_employee of the sub-account, or 'Admin' if none
INSERT INTO notifications (
  user_id,
  notification_type,
  title,
  message,
  contact_id,
  account_id,
  is_seen,
  is_completed,
  created_at
)
SELECT 
  COALESCE(sa.assigned_employee, 'Admin') as user_id,
  'followup_due'::notification_type_enum as notification_type,
  'Follow up with ' || c.name as title,
  'Follow up with ' || c.name || 
    CASE 
      WHEN a.account_name IS NOT NULL AND sa.sub_account_name IS NOT NULL 
        THEN ' from ' || a.account_name || ' - ' || sa.sub_account_name
      WHEN a.account_name IS NOT NULL 
        THEN ' from ' || a.account_name
      ELSE ''
    END as message,
  c.id as contact_id,
  c.account_id,
  false as is_seen,
  false as is_completed,
  NOW() as created_at
FROM contacts c
LEFT JOIN sub_accounts sa ON c.sub_account_id = sa.id
LEFT JOIN accounts a ON c.account_id = a.id
WHERE 
  c.follow_up_date IS NOT NULL
  AND c.call_status != 'Connected'
  AND c.follow_up_date >= CURRENT_DATE; -- Only future follow-ups

-- Verify the migration
SELECT COUNT(*) as total_notifications_created 
FROM notifications 
WHERE notification_type = 'followup_due';






