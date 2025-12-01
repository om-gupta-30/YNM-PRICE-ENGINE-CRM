-- ============================================
-- COMPLETE LEADS SECTION UPGRADE
-- Adds Follow-Up Date, Activities Table, and All Required Features
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ADD FOLLOW_UP_DATE TO LEADS TABLE
-- ============================================
DO $$ 
BEGIN
  -- Add follow_up_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'follow_up_date'
  ) THEN
    ALTER TABLE leads ADD COLUMN follow_up_date DATE;
    CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON leads(follow_up_date);
    RAISE NOTICE 'follow_up_date column added to leads table';
  ELSE
    RAISE NOTICE 'follow_up_date column already exists in leads table';
  END IF;
END $$;

-- ============================================
-- 2. CREATE LEAD_ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lead_activities (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'call', 'status_change', 'follow_up_set', 'follow_up_completed', 'employee_reassigned', 'email_sent', 'meeting_scheduled')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for lead_activities
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_activity_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_by ON lead_activities(created_by);

-- ============================================
-- 3. CREATE UPDATED_AT TRIGGER FOR LEAD_ACTIVITIES
-- ============================================
-- (No updated_at needed for activities, they're immutable)

-- ============================================
-- 4. VERIFY ALL CHANGES
-- ============================================
-- Verify leads table has follow_up_date
SELECT 
  'Leads Table - Follow-Up Date Column' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'leads' AND column_name = 'follow_up_date'
    ) THEN '✅ follow_up_date column exists'
    ELSE '❌ follow_up_date column missing'
  END as status;

-- Verify lead_activities table exists
SELECT 
  'Lead Activities Table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'lead_activities'
    ) THEN '✅ lead_activities table exists'
    ELSE '❌ lead_activities table missing'
  END as status;

-- Show all columns in leads table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'leads' 
ORDER BY ordinal_position;

-- Show all columns in lead_activities table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'lead_activities' 
ORDER BY ordinal_position;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅ Migration completed successfully! Follow-up date added to leads, lead_activities table created.' as result;

