-- ============================================
-- CRM AI + Engagement Schema Updates
-- ============================================

-- 1. Add AI suggestion storage on accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS ai_engagement_tips TEXT;

-- 2. Allow system activities (login/logout) without an account link
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'activities'
      AND column_name = 'account_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE activities
      ALTER COLUMN account_id DROP NOT NULL;
  END IF;
END $$;

-- 3. Extend activity enum for login/logout
ALTER TYPE activity_type_enum ADD VALUE IF NOT EXISTS 'login';
ALTER TYPE activity_type_enum ADD VALUE IF NOT EXISTS 'logout';

-- ============================================
-- Data Reset Script (keep users/states/cities)
-- ============================================

TRUNCATE TABLE
  notifications,
  activities,
  tasks,
  leads,
  contacts,
  sub_accounts,
  accounts,
  quotes_mbcb,
  quotes_signages,
  quotes_paint
RESTART IDENTITY CASCADE;

