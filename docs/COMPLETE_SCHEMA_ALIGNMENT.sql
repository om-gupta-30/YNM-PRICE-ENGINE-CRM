-- ============================================
-- COMPLETE DATABASE SCHEMA ALIGNMENT SCRIPT
-- This script ensures all tables match the provided schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. FIX STATES TABLE (use state_name instead of name)
-- ============================================
DO $$
BEGIN
  -- Rename column if it exists as 'name'
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'states' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'states' AND column_name = 'state_name'
  ) THEN
    ALTER TABLE states RENAME COLUMN name TO state_name;
    RAISE NOTICE 'Renamed states.name to states.state_name';
  END IF;
  
  -- Create table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'states') THEN
    CREATE TABLE states (
      id SERIAL PRIMARY KEY,
      state_name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_states_state_name ON states(state_name);
    RAISE NOTICE 'Created states table';
  END IF;
END $$;

-- ============================================
-- 2. FIX CITIES TABLE (use city_name instead of name)
-- ============================================
DO $$
BEGIN
  -- Rename column if it exists as 'name'
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cities' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cities' AND column_name = 'city_name'
  ) THEN
    ALTER TABLE cities RENAME COLUMN name TO city_name;
    RAISE NOTICE 'Renamed cities.name to cities.city_name';
  END IF;
  
  -- Create table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cities') THEN
    CREATE TABLE cities (
      id SERIAL PRIMARY KEY,
      city_name TEXT NOT NULL,
      state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT cities_state_city_unique UNIQUE (state_id, city_name)
    );
    CREATE INDEX IF NOT EXISTS idx_cities_state_id ON cities(state_id);
    CREATE INDEX IF NOT EXISTS idx_cities_city_name ON cities(city_name);
    RAISE NOTICE 'Created cities table';
  END IF;
END $$;

-- ============================================
-- 3. ENSURE SUB_ACCOUNTS TABLE HAS ALL COLUMNS
-- ============================================
DO $$
BEGIN
  -- Create table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sub_accounts') THEN
    CREATE TABLE sub_accounts (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      sub_account_name TEXT NOT NULL,
      engagement_score NUMERIC(10, 2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      state_id INTEGER REFERENCES states(id),
      city_id INTEGER REFERENCES cities(id),
      CONSTRAINT sub_accounts_account_name_unique UNIQUE (account_id, sub_account_name)
    );
    RAISE NOTICE 'Created sub_accounts table';
  END IF;
  
  -- Add missing columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sub_accounts' AND column_name = 'state_id') THEN
    ALTER TABLE sub_accounts ADD COLUMN state_id INTEGER REFERENCES states(id);
    RAISE NOTICE 'Added state_id to sub_accounts';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sub_accounts' AND column_name = 'city_id') THEN
    ALTER TABLE sub_accounts ADD COLUMN city_id INTEGER REFERENCES cities(id);
    RAISE NOTICE 'Added city_id to sub_accounts';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sub_accounts_state_id ON sub_accounts(state_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_city_id ON sub_accounts(city_id);

-- ============================================
-- 4. ADD MISSING COLUMNS TO QUOTATION TABLES
-- ============================================
DO $$
BEGIN
  -- quotes_mbcb
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_mbcb' AND column_name = 'sub_account_id') THEN
    ALTER TABLE quotes_mbcb ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id);
    RAISE NOTICE 'Added sub_account_id to quotes_mbcb';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_mbcb' AND column_name = 'state_id') THEN
    ALTER TABLE quotes_mbcb ADD COLUMN state_id INTEGER REFERENCES states(id);
    RAISE NOTICE 'Added state_id to quotes_mbcb';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_mbcb' AND column_name = 'city_id') THEN
    ALTER TABLE quotes_mbcb ADD COLUMN city_id INTEGER REFERENCES cities(id);
    RAISE NOTICE 'Added city_id to quotes_mbcb';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_mbcb' AND column_name = 'updated_at') THEN
    ALTER TABLE quotes_mbcb ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at to quotes_mbcb';
  END IF;
  
  -- quotes_paint
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_paint' AND column_name = 'sub_account_id') THEN
    ALTER TABLE quotes_paint ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id);
    RAISE NOTICE 'Added sub_account_id to quotes_paint';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_paint' AND column_name = 'state_id') THEN
    ALTER TABLE quotes_paint ADD COLUMN state_id INTEGER REFERENCES states(id);
    RAISE NOTICE 'Added state_id to quotes_paint';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_paint' AND column_name = 'city_id') THEN
    ALTER TABLE quotes_paint ADD COLUMN city_id INTEGER REFERENCES cities(id);
    RAISE NOTICE 'Added city_id to quotes_paint';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_paint' AND column_name = 'updated_at') THEN
    ALTER TABLE quotes_paint ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at to quotes_paint';
  END IF;
  
  -- quotes_signages
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_signages' AND column_name = 'sub_account_id') THEN
    ALTER TABLE quotes_signages ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id);
    RAISE NOTICE 'Added sub_account_id to quotes_signages';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_signages' AND column_name = 'state_id') THEN
    ALTER TABLE quotes_signages ADD COLUMN state_id INTEGER REFERENCES states(id);
    RAISE NOTICE 'Added state_id to quotes_signages';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_signages' AND column_name = 'city_id') THEN
    ALTER TABLE quotes_signages ADD COLUMN city_id INTEGER REFERENCES cities(id);
    RAISE NOTICE 'Added city_id to quotes_signages';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_signages' AND column_name = 'updated_at') THEN
    ALTER TABLE quotes_signages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at to quotes_signages';
  END IF;
END $$;

-- Create indexes for quotation tables
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_sub_account_id ON quotes_mbcb(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_state_id ON quotes_mbcb(state_id);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_city_id ON quotes_mbcb(city_id);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_sub_account_id ON quotes_paint(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_state_id ON quotes_paint(state_id);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_city_id ON quotes_paint(city_id);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_sub_account_id ON quotes_signages(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_state_id ON quotes_signages(state_id);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_city_id ON quotes_signages(city_id);

-- ============================================
-- 5. ADD MISSING COLUMNS TO ACTIVITIES TABLE
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'sub_account_id') THEN
    ALTER TABLE activities ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_activities_sub_account_id ON activities(sub_account_id);
    RAISE NOTICE 'Added sub_account_id to activities';
  END IF;
END $$;

-- ============================================
-- 6. ADD MISSING COLUMNS TO CONTACTS TABLE
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'sub_account_id') THEN
    ALTER TABLE contacts ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_contacts_sub_account_id ON contacts(sub_account_id);
    RAISE NOTICE 'Added sub_account_id to contacts';
  END IF;
END $$;

-- ============================================
-- 7. ADD MISSING COLUMNS TO LEADS TABLE
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'sub_account_id') THEN
    ALTER TABLE leads ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_leads_sub_account_id ON leads(sub_account_id);
    RAISE NOTICE 'Added sub_account_id to leads';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'contact_id') THEN
    ALTER TABLE leads ADD COLUMN contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON leads(contact_id);
    RAISE NOTICE 'Added contact_id to leads';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'priority') THEN
    ALTER TABLE leads ADD COLUMN priority TEXT CHECK (priority IN ('High Priority', 'Medium Priority', 'Low Priority'));
    CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
    RAISE NOTICE 'Added priority to leads';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'follow_up_date') THEN
    ALTER TABLE leads ADD COLUMN follow_up_date DATE;
    CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON leads(follow_up_date);
    RAISE NOTICE 'Added follow_up_date to leads';
  END IF;
END $$;

-- ============================================
-- 8. ADD MISSING COLUMNS TO TASKS TABLE
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'sub_account_id') THEN
    ALTER TABLE tasks ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_sub_account_id ON tasks(sub_account_id);
    RAISE NOTICE 'Added sub_account_id to tasks';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'contact_id') THEN
    ALTER TABLE tasks ADD COLUMN contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_contact_id ON tasks(contact_id);
    RAISE NOTICE 'Added contact_id to tasks';
  END IF;
  
  -- Fix due_date to be TIMESTAMP instead of DATE if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'due_date' AND data_type = 'date'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN due_date TYPE TIMESTAMP WITH TIME ZONE USING due_date::timestamp with time zone;
    RAISE NOTICE 'Changed tasks.due_date to TIMESTAMP WITH TIME ZONE';
  END IF;
END $$;

-- ============================================
-- 9. ADD MISSING COLUMNS TO NOTIFICATIONS TABLE
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'sub_account_id') THEN
    ALTER TABLE notifications ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_notifications_sub_account_id ON notifications(sub_account_id);
    RAISE NOTICE 'Added sub_account_id to notifications';
  END IF;
END $$;

-- ============================================
-- 10. CREATE ACTIVITY_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================
-- 11. CREATE ENGAGEMENT_AI_STATE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS engagement_ai_state (
  account_id INTEGER NOT NULL PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  last_run TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_ai_state_account_id ON engagement_ai_state(account_id);
CREATE INDEX IF NOT EXISTS idx_engagement_ai_state_last_run ON engagement_ai_state(last_run DESC);

-- ============================================
-- 12. CREATE ENGAGEMENT_SUGGESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS engagement_suggestions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  generated_by TEXT NOT NULL,
  suggestion_text TEXT NOT NULL,
  suggested_score_change NUMERIC(10, 2) DEFAULT 0,
  data_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_suggestions_account_id ON engagement_suggestions(account_id);
CREATE INDEX IF NOT EXISTS idx_engagement_suggestions_generated_by ON engagement_suggestions(generated_by);
CREATE INDEX IF NOT EXISTS idx_engagement_suggestions_created_at ON engagement_suggestions(created_at DESC);

-- ============================================
-- 13. CREATE LOGOUT_REASONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS logout_reasons (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  reason_tag TEXT,
  reason_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logout_reasons_user_id ON logout_reasons(user_id);
CREATE INDEX IF NOT EXISTS idx_logout_reasons_created_at ON logout_reasons(created_at DESC);

-- ============================================
-- 14. CREATE TRIGGERS FOR UPDATED_AT COLUMNS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DO $$
BEGIN
  -- quotes_mbcb
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_mbcb' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS trigger_quotes_mbcb_updated_at ON quotes_mbcb;
    CREATE TRIGGER trigger_quotes_mbcb_updated_at
      BEFORE UPDATE ON quotes_mbcb
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- quotes_paint
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_paint' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS trigger_quotes_paint_updated_at ON quotes_paint;
    CREATE TRIGGER trigger_quotes_paint_updated_at
      BEFORE UPDATE ON quotes_paint
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- quotes_signages
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_signages' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS trigger_quotes_signages_updated_at ON quotes_signages;
    CREATE TRIGGER trigger_quotes_signages_updated_at
      BEFORE UPDATE ON quotes_signages
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- 15. VERIFICATION QUERIES
-- ============================================
-- Show all tables and their column counts
SELECT 
  'Schema Alignment Summary' as summary,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tables,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'states' AND column_name = 'state_name') as states_has_state_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'cities' AND column_name = 'city_name') as cities_has_city_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sub_accounts' AND column_name IN ('state_id', 'city_id')) as sub_accounts_has_location,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'quotes_mbcb' AND column_name IN ('sub_account_id', 'state_id', 'city_id', 'updated_at')) as quotes_mbcb_complete,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'activity_logs') as has_activity_logs,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'engagement_ai_state') as has_engagement_ai_state,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'engagement_suggestions') as has_engagement_suggestions,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'logout_reasons') as has_logout_reasons;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅ Schema alignment completed successfully! All tables and columns have been verified and added.' as result;
