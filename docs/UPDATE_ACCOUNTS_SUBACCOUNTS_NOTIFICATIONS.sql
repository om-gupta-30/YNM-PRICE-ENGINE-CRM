-- ============================================
-- COMPLETE UPDATE: Accounts, Sub-Accounts, and Notifications
-- This script adds city, state, and address columns to accounts and sub_accounts
-- Also ensures notifications table exists with proper structure
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ADD STATE_ID, CITY_ID, AND ADDRESS TO ACCOUNTS TABLE
-- ============================================
DO $$
BEGIN
    -- Add state_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'state_id'
    ) THEN
        ALTER TABLE accounts 
        ADD COLUMN state_id INTEGER REFERENCES states(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_accounts_state_id ON accounts(state_id);
        
        RAISE NOTICE '✅ Added state_id column to accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ state_id column already exists on accounts table';
    END IF;

    -- Add city_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'city_id'
    ) THEN
        ALTER TABLE accounts 
        ADD COLUMN city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_accounts_city_id ON accounts(city_id);
        
        RAISE NOTICE '✅ Added city_id column to accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ city_id column already exists on accounts table';
    END IF;

    -- Add address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'address'
    ) THEN
        ALTER TABLE accounts 
        ADD COLUMN address TEXT;
        
        RAISE NOTICE '✅ Added address column to accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ address column already exists on accounts table';
    END IF;
END $$;

-- ============================================
-- 2. ADD ADDRESS TO SUB_ACCOUNTS TABLE
-- ============================================
DO $$
BEGIN
    -- Add address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'address'
    ) THEN
        ALTER TABLE sub_accounts 
        ADD COLUMN address TEXT;
        
        RAISE NOTICE '✅ Added address column to sub_accounts table';
    ELSE
        RAISE NOTICE 'ℹ️ address column already exists on sub_accounts table';
    END IF;
END $$;

-- ============================================
-- 3. CREATE OR UPDATE NOTIFICATIONS TABLE
-- ============================================
-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'followup_due',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    is_seen BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns that might not exist (safe to run multiple times)
DO $$
BEGIN
    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE notifications 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE '✅ Added updated_at column to notifications table';
    END IF;

    -- Add notification_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'notification_type'
    ) THEN
        ALTER TABLE notifications 
        ADD COLUMN notification_type TEXT NOT NULL DEFAULT 'followup_due';
        
        RAISE NOTICE '✅ Added notification_type column to notifications table';
    END IF;

    -- Add is_seen if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'is_seen'
    ) THEN
        ALTER TABLE notifications 
        ADD COLUMN is_seen BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE '✅ Added is_seen column to notifications table';
    END IF;

    -- Add is_completed if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'is_completed'
    ) THEN
        ALTER TABLE notifications 
        ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE '✅ Added is_completed column to notifications table';
    END IF;
END $$;

-- ============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================
-- Accounts indexes
CREATE INDEX IF NOT EXISTS idx_accounts_state_id ON accounts(state_id);
CREATE INDEX IF NOT EXISTS idx_accounts_city_id ON accounts(city_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_contact_id ON notifications(contact_id);
CREATE INDEX IF NOT EXISTS idx_notifications_account_id ON notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_completed ON notifications(is_completed);
CREATE INDEX IF NOT EXISTS idx_notifications_seen ON notifications(is_seen);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- 5. CREATE TRIGGER FOR AUTO-UPDATE TIMESTAMP
-- ============================================
-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- ============================================
-- 6. VERIFICATION QUERIES
-- ============================================
-- Verify accounts table columns
SELECT 
    'ACCOUNTS TABLE' as table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND column_name IN ('state_id', 'city_id', 'address')
ORDER BY column_name;

-- Verify sub_accounts table columns
SELECT 
    'SUB_ACCOUNTS TABLE' as table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sub_accounts' 
AND column_name = 'address';

-- Verify notifications table structure
SELECT 
    'NOTIFICATIONS TABLE' as table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Show notifications indexes
SELECT 
    'NOTIFICATIONS INDEXES' as info,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'notifications'
ORDER BY indexname;
