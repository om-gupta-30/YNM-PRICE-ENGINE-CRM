-- ============================================
-- ACTIVITY TRACKING DATABASE SETUP
-- This script ensures all activity tracking tables are properly set up
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. UPDATE ACTIVITY_TYPE_ENUM TO INCLUDE LOGIN/LOGOUT
-- ============================================

-- Add 'login' and 'logout' to activity_type_enum if they don't exist
DO $$
BEGIN
    -- Check if 'login' exists in enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'login' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')
    ) THEN
        ALTER TYPE activity_type_enum ADD VALUE 'login';
        RAISE NOTICE 'Added "login" to activity_type_enum';
    ELSE
        RAISE NOTICE '"login" already exists in activity_type_enum';
    END IF;

    -- Check if 'logout' exists in enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'logout' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')
    ) THEN
        ALTER TYPE activity_type_enum ADD VALUE 'logout';
        RAISE NOTICE 'Added "logout" to activity_type_enum';
    ELSE
        RAISE NOTICE '"logout" already exists in activity_type_enum';
    END IF;
END $$;

-- ============================================
-- 2. ENSURE ACTIVITIES TABLE EXISTS WITH CORRECT STRUCTURE
-- ============================================

CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL,
  activity_type activity_type_enum NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Make account_id nullable (for status-only activities, logout, login, etc.)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'account_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE activities ALTER COLUMN account_id DROP NOT NULL;
        RAISE NOTICE 'Made account_id nullable in activities table';
    ELSE
        RAISE NOTICE 'account_id is already nullable in activities table';
    END IF;
END $$;

-- Ensure created_at column exists (some schemas use 'timestamp' instead)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'created_at'
    ) THEN
        -- Check if 'timestamp' column exists instead
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'activities' 
            AND column_name = 'timestamp'
        ) THEN
            ALTER TABLE activities RENAME COLUMN timestamp TO created_at;
            RAISE NOTICE 'Renamed "timestamp" to "created_at" in activities table';
        ELSE
            ALTER TABLE activities ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Added created_at column to activities table';
        END IF;
    ELSE
        RAISE NOTICE 'created_at column already exists in activities table';
    END IF;
END $$;

-- ============================================
-- 3. CREATE INDEXES FOR ACTIVITIES TABLE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_activities_account_id ON activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_employee_id ON activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_employee_created_at ON activities(employee_id, created_at DESC);

-- ============================================
-- 4. ENSURE LOGOUT_REASONS TABLE EXISTS
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
-- 5. ADD COMMENT COLUMNS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE activities IS 'Stores all employee activities including logins, logouts, status changes, quotations, tasks, leads, contacts, and account updates';
COMMENT ON COLUMN activities.account_id IS 'Can be NULL for system-wide activities like login/logout/status changes';
COMMENT ON COLUMN activities.employee_id IS 'Username of the employee who performed the activity';
COMMENT ON COLUMN activities.activity_type IS 'Type of activity: call, note, followup, quotation, email, task, meeting, login, logout';
COMMENT ON COLUMN activities.metadata IS 'JSONB field storing additional activity data like status, reason, changes, etc.';

COMMENT ON TABLE logout_reasons IS 'Stores logout reasons for employees (not admins) when they manually log out';

-- ============================================
-- 6. VERIFY SETUP
-- ============================================

DO $$
DECLARE
    activity_count INTEGER;
    logout_reasons_count INTEGER;
    enum_values TEXT[];
BEGIN
    -- Count activities
    SELECT COUNT(*) INTO activity_count FROM activities;
    RAISE NOTICE 'Total activities in database: %', activity_count;
    
    -- Count logout reasons
    SELECT COUNT(*) INTO logout_reasons_count FROM logout_reasons;
    RAISE NOTICE 'Total logout reasons in database: %', logout_reasons_count;
    
    -- List all activity types
    SELECT array_agg(enumlabel ORDER BY enumsortorder) INTO enum_values
    FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum');
    
    RAISE NOTICE 'Available activity types: %', array_to_string(enum_values, ', ');
    
    RAISE NOTICE 'Activity tracking database setup completed successfully!';
END $$;

-- ============================================
-- 7. SAMPLE QUERIES FOR VERIFICATION
-- ============================================

-- View all activity types and their counts
-- SELECT activity_type, COUNT(*) as count 
-- FROM activities 
-- GROUP BY activity_type 
-- ORDER BY count DESC;

-- View recent activities for a specific employee
-- SELECT employee_id, activity_type, description, created_at 
-- FROM activities 
-- WHERE employee_id = 'Employee1' 
-- ORDER BY created_at DESC 
-- LIMIT 20;

-- View all logout activities
-- SELECT employee_id, description, metadata, created_at 
-- FROM activities 
-- WHERE activity_type = 'logout' 
-- ORDER BY created_at DESC;

-- View logout reasons
-- SELECT user_id, reason_tag, reason_text, created_at 
-- FROM logout_reasons 
-- ORDER BY created_at DESC 
-- LIMIT 20;

-- View activities for today
-- SELECT employee_id, activity_type, description, created_at 
-- FROM activities 
-- WHERE DATE(created_at) = CURRENT_DATE 
-- ORDER BY created_at DESC;
