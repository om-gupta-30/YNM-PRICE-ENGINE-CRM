-- ============================================
-- COMPLETE AI SYSTEM DATABASE SETUP
-- ============================================
-- This script creates ALL tables and columns required for AI features
-- Run this ONCE in Supabase SQL Editor before deployment
-- Safe to run multiple times - uses IF NOT EXISTS patterns
-- ============================================

-- ============================================
-- 1. AI_QUERIES TABLE - Logging all AI interactions
-- ============================================
CREATE TABLE IF NOT EXISTS ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('coach', 'query')),
  question TEXT NOT NULL,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_queries_user_id ON ai_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_queries_mode ON ai_queries(mode);
CREATE INDEX IF NOT EXISTS idx_ai_queries_created_at ON ai_queries(created_at DESC);

-- ============================================
-- 2. EMPLOYEE_NOTIFICATIONS TABLE - AI alerts and coaching
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'employee_notifications'
    ) THEN
        CREATE TABLE employee_notifications (
            id SERIAL PRIMARY KEY,
            employee TEXT NOT NULL,
            message TEXT NOT NULL,
            priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
            target_role TEXT DEFAULT 'employee' CHECK (target_role IN ('employee', 'admin')),
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_employee_notifications_employee ON employee_notifications(employee);
        CREATE INDEX idx_employee_notifications_is_read ON employee_notifications(is_read);
        CREATE INDEX idx_employee_notifications_priority ON employee_notifications(priority);
        CREATE INDEX idx_employee_notifications_target_role ON employee_notifications(target_role);
        CREATE INDEX idx_employee_notifications_created_at ON employee_notifications(created_at DESC);

        RAISE NOTICE '✅ Created employee_notifications table';
    ELSE
        -- Add target_role column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'employee_notifications' AND column_name = 'target_role'
        ) THEN
            ALTER TABLE employee_notifications 
            ADD COLUMN target_role TEXT DEFAULT 'employee';
            
            ALTER TABLE employee_notifications 
            ADD CONSTRAINT employee_notifications_target_role_check 
            CHECK (target_role IN ('employee', 'admin'));
            
            RAISE NOTICE '✅ Added target_role column to employee_notifications';
        END IF;

        -- Add priority column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'employee_notifications' AND column_name = 'priority'
        ) THEN
            ALTER TABLE employee_notifications 
            ADD COLUMN priority TEXT DEFAULT 'normal';
            
            ALTER TABLE employee_notifications 
            ADD CONSTRAINT employee_notifications_priority_check 
            CHECK (priority IN ('low', 'normal', 'high', 'critical'));
            
            RAISE NOTICE '✅ Added priority column to employee_notifications';
        END IF;

        RAISE NOTICE 'ℹ️ employee_notifications table already exists';
    END IF;
END $$;

-- ============================================
-- 3. EMPLOYEE_STREAKS TABLE - Activity streak tracking
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employee_streaks'
    ) THEN
        CREATE TABLE employee_streaks (
            employee TEXT PRIMARY KEY,
            streak_count INTEGER DEFAULT 0,
            last_activity_date DATE
        );

        CREATE INDEX idx_employee_streaks_employee ON employee_streaks(employee);
        
        RAISE NOTICE '✅ Created employee_streaks table';
    ELSE
        RAISE NOTICE 'ℹ️ employee_streaks table already exists';
    END IF;
END $$;

-- ============================================
-- 4. ENGAGEMENT_HISTORY TABLE - Score trend tracking
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'engagement_history'
    ) THEN
        CREATE TABLE engagement_history (
            id SERIAL PRIMARY KEY,
            sub_account_id INTEGER NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
            score NUMERIC NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_engagement_history_sub_account_id ON engagement_history(sub_account_id);
        CREATE INDEX idx_engagement_history_created_at ON engagement_history(created_at DESC);
        CREATE INDEX idx_engagement_history_sub_account_created ON engagement_history(sub_account_id, created_at DESC);
        
        RAISE NOTICE '✅ Created engagement_history table';
    ELSE
        RAISE NOTICE 'ℹ️ engagement_history table already exists';
    END IF;
END $$;

-- ============================================
-- 5. ADD AI_INSIGHTS COLUMN TO SUB_ACCOUNTS
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'ai_insights'
    ) THEN
        ALTER TABLE sub_accounts ADD COLUMN ai_insights TEXT;
        RAISE NOTICE '✅ Added ai_insights column to sub_accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ ai_insights column already exists on sub_accounts';
    END IF;
END $$;

-- ============================================
-- 6. ADD ENGAGEMENT_SCORE TO ACCOUNTS (if missing)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'engagement_score'
    ) THEN
        ALTER TABLE accounts ADD COLUMN engagement_score DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE '✅ Added engagement_score column to accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ engagement_score column already exists on accounts';
    END IF;
END $$;

-- ============================================
-- 7. ADD ENGAGEMENT_SCORE TO SUB_ACCOUNTS (if missing)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'engagement_score'
    ) THEN
        ALTER TABLE sub_accounts ADD COLUMN engagement_score DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE '✅ Added engagement_score column to sub_accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ engagement_score column already exists on sub_accounts';
    END IF;
END $$;

-- ============================================
-- 8. ADD AI_ENGAGEMENT_TIPS TO ACCOUNTS (if missing)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'ai_engagement_tips'
    ) THEN
        ALTER TABLE accounts ADD COLUMN ai_engagement_tips TEXT;
        RAISE NOTICE '✅ Added ai_engagement_tips column to accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ ai_engagement_tips column already exists on accounts';
    END IF;
END $$;

-- ============================================
-- 9. ADD LAST_ACTIVITY_AT TO ACCOUNTS (if missing)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'last_activity_at'
    ) THEN
        ALTER TABLE accounts ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added last_activity_at column to accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ last_activity_at column already exists on accounts';
    END IF;
END $$;

-- ============================================
-- 10. ADD ASSIGNED_EMPLOYEE TO SUB_ACCOUNTS (if missing)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'assigned_employee'
    ) THEN
        ALTER TABLE sub_accounts ADD COLUMN assigned_employee TEXT;
        RAISE NOTICE '✅ Added assigned_employee column to sub_accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ assigned_employee column already exists on sub_accounts';
    END IF;
END $$;

-- ============================================
-- 11. EMPLOYEE_AI_COACHING TABLE - Daily coaching storage
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employee_ai_coaching'
    ) THEN
        CREATE TABLE employee_ai_coaching (
            id SERIAL PRIMARY KEY,
            employee TEXT NOT NULL,
            coaching JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_employee_ai_coaching_employee ON employee_ai_coaching(employee);
        CREATE INDEX idx_employee_ai_coaching_created_at ON employee_ai_coaching(created_at DESC);
        
        RAISE NOTICE '✅ Created employee_ai_coaching table';
    ELSE
        RAISE NOTICE 'ℹ️ employee_ai_coaching table already exists';
    END IF;
END $$;

-- ============================================
-- VERIFICATION - Show all AI-related columns
-- ============================================
SELECT '=== VERIFICATION ===' as status;

SELECT 
    'ai_queries' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'ai_queries'
UNION ALL
SELECT 
    'employee_notifications' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'employee_notifications'
UNION ALL
SELECT 
    'employee_streaks' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'employee_streaks'
UNION ALL
SELECT 
    'engagement_history' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'engagement_history'
UNION ALL
SELECT 
    'employee_ai_coaching' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'employee_ai_coaching';

-- Show AI columns on sub_accounts
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'sub_accounts' 
AND column_name IN ('engagement_score', 'ai_insights', 'assigned_employee');

-- Show AI columns on accounts
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND column_name IN ('engagement_score', 'ai_engagement_tips', 'last_activity_at');

-- ============================================
-- DONE! ✅
-- ============================================
-- All AI tables and columns have been created/verified
-- You can now deploy the application
-- ============================================
