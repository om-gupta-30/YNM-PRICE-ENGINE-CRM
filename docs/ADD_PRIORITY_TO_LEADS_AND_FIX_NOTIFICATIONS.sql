-- ============================================
-- COMPLETE DATABASE MIGRATION SCRIPT
-- Adds Priority to Leads Table and Fixes Notifications
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ADD PRIORITY AND CONTACT_ID COLUMNS TO LEADS TABLE
-- ============================================
DO $$ 
BEGIN
  -- Add priority column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'priority'
  ) THEN
    ALTER TABLE leads ADD COLUMN priority TEXT CHECK (priority IN ('High Priority', 'Medium Priority', 'Low Priority'));
    CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
    RAISE NOTICE 'Priority column added to leads table';
  ELSE
    RAISE NOTICE 'Priority column already exists in leads table';
  END IF;

  -- Add contact_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'contact_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON leads(contact_id);
    RAISE NOTICE 'contact_id column added to leads table';
  ELSE
    RAISE NOTICE 'contact_id column already exists in leads table';
  END IF;
END $$;

-- ============================================
-- 2. ENSURE NOTIFICATIONS TABLE HAS CORRECT STRUCTURE
-- ============================================
-- Check if notifications table exists, if not create it
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  task_id INTEGER,
  quotation_id INTEGER,
  is_seen BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  is_snoozed BOOLEAN DEFAULT false,
  snooze_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add sub_account_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'sub_account_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL;
    RAISE NOTICE 'sub_account_id column added to notifications table';
  END IF;

  -- Add is_snoozed if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'is_snoozed'
  ) THEN
    ALTER TABLE notifications ADD COLUMN is_snoozed BOOLEAN DEFAULT false;
    RAISE NOTICE 'is_snoozed column added to notifications table';
  END IF;

  -- Add snooze_until if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'snooze_until'
  ) THEN
    ALTER TABLE notifications ADD COLUMN snooze_until TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'snooze_until column added to notifications table';
  END IF;
END $$;

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_seen ON notifications(is_seen);
CREATE INDEX IF NOT EXISTS idx_notifications_is_completed ON notifications(is_completed);
CREATE INDEX IF NOT EXISTS idx_notifications_contact_id ON notifications(contact_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sub_account_id ON notifications(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- 3. CREATE UPDATED_AT TRIGGER FOR NOTIFICATIONS
-- ============================================
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- ============================================
-- 4. VERIFY ALL CHANGES
-- ============================================
-- Verify leads table has priority column
SELECT 
  'Leads Table - Priority Column' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'leads' AND column_name = 'priority'
    ) THEN '✅ Priority column exists'
    ELSE '❌ Priority column missing'
  END as status;

-- Verify notifications table structure
SELECT 
  'Notifications Table Structure' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'notifications'
    ) THEN '✅ Notifications table exists'
    ELSE '❌ Notifications table missing'
  END as status;

-- Show all columns in notifications table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Show all columns in leads table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'leads' 
ORDER BY ordinal_position;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅ Migration completed successfully! Priority and contact_id columns added to leads, notifications table verified and updated.' as result;

