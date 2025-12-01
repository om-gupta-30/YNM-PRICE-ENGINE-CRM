-- ============================================
-- ACCOUNTS MODULE EXTENSIONS
-- Engagement Score, Contacts, Activities, Notifications
-- ============================================

-- ============================================
-- 1. ADD ENGAGEMENT SCORE TO ACCOUNTS
-- ============================================
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS engagement_score DECIMAL(10, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_accounts_engagement_score ON accounts(engagement_score DESC);

-- ============================================
-- 2. CALL STATUS ENUM
-- ============================================
CREATE TYPE call_status_enum AS ENUM (
  'Connected',
  'DNP',
  'ATCBL',
  'Unable to connect',
  'Number doesn''t exist',
  'Wrong number'
);

-- ============================================
-- 3. CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  email TEXT,
  phone TEXT,
  call_status call_status_enum,
  notes TEXT,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_follow_up_date ON contacts(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_contacts_call_status ON contacts(call_status);

-- ============================================
-- 4. ACTIVITY TYPE ENUM
-- ============================================
CREATE TYPE activity_type_enum AS ENUM (
  'call',
  'note',
  'followup',
  'quotation',
  'email',
  'task',
  'meeting'
);

-- ============================================
-- 5. ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL,
  activity_type activity_type_enum NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_account_id ON activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_employee_id ON activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- ============================================
-- 6. NOTIFICATION TYPE ENUM
-- ============================================
CREATE TYPE notification_type_enum AS ENUM (
  'followup_due',
  'callback_scheduled',
  'task_due',
  'quotation_update'
);

-- ============================================
-- 7. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type notification_type_enum NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  quotation_id INTEGER,
  is_seen BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  is_snoozed BOOLEAN DEFAULT false,
  snooze_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_seen ON notifications(is_seen);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_account_id ON notifications(account_id);

-- ============================================
-- 8. FUNCTION TO UPDATE ENGAGEMENT SCORE
-- ============================================
CREATE OR REPLACE FUNCTION update_account_engagement_score()
RETURNS TRIGGER AS $$
DECLARE
  score_change DECIMAL(10, 2) := 0;
BEGIN
  -- Calculate score change based on activity type
  CASE NEW.activity_type
    WHEN 'call' THEN
      -- Check metadata for call status
      IF NEW.metadata->>'call_status' = 'Connected' THEN
        score_change := 10;
      ELSIF NEW.metadata->>'call_status' = 'DNP' THEN
        score_change := -5;
      ELSIF NEW.metadata->>'call_status' IN ('Unable to connect', 'Number doesn''t exist', 'Wrong number') THEN
        score_change := -10;
      END IF;
    WHEN 'note' THEN
      score_change := 5;
    WHEN 'quotation' THEN
      IF NEW.metadata->>'quotation_status' = 'closed_won' THEN
        score_change := 20;
      ELSIF NEW.metadata->>'quotation_status' = 'closed_lost' THEN
        score_change := -20;
      ELSE
        score_change := 15; -- Quotation created
      END IF;
    WHEN 'task' THEN
      IF NEW.metadata->>'task_status' = 'Completed' THEN
        score_change := 5;
      END IF;
    WHEN 'followup' THEN
      score_change := 10;
  END CASE;

  -- Update engagement score
  UPDATE accounts
  SET engagement_score = COALESCE(engagement_score, 0) + score_change,
      last_activity_at = NOW()
  WHERE id = NEW.account_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activities_update_engagement_score
AFTER INSERT ON activities
FOR EACH ROW
EXECUTE FUNCTION update_account_engagement_score();

-- ============================================
-- 9. FUNCTION TO CREATE FOLLOW-UP NOTIFICATIONS
-- ============================================
CREATE OR REPLACE FUNCTION create_followup_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.follow_up_date IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      notification_type,
      title,
      message,
      account_id,
      contact_id
    ) VALUES (
      NEW.created_by,
      'callback_scheduled',
      'Follow-up Scheduled',
      'Follow up with ' || NEW.name || ' from account (scheduled for ' || 
      TO_CHAR(NEW.follow_up_date, 'DD Mon YYYY HH24:MI') || ')',
      NEW.account_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_create_followup_notification
AFTER INSERT OR UPDATE ON contacts
FOR EACH ROW
WHEN (NEW.follow_up_date IS NOT NULL)
EXECUTE FUNCTION create_followup_notification();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE contacts IS 'Contacts under each account';
COMMENT ON TABLE activities IS 'Activity history for accounts and contacts';
COMMENT ON TABLE notifications IS 'User notifications for follow-ups and alerts';
COMMENT ON COLUMN accounts.engagement_score IS 'Automated engagement score based on activities';

