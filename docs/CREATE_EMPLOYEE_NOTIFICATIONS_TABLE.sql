-- ============================================
-- CREATE EMPLOYEE_NOTIFICATIONS TABLE
-- This script creates the employee_notifications table for AI coaching messages
-- and engagement alerts, or adds missing columns if the table already exists.
-- Run this in your Supabase SQL Editor
-- ============================================

DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'employee_notifications'
    ) THEN
        -- Create the table
        CREATE TABLE employee_notifications (
            id SERIAL PRIMARY KEY,
            employee TEXT NOT NULL,
            message TEXT NOT NULL,
            priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
            target_role TEXT DEFAULT 'employee' CHECK (target_role IN ('employee', 'admin')),
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for better query performance
        CREATE INDEX idx_employee_notifications_employee ON employee_notifications(employee);
        CREATE INDEX idx_employee_notifications_is_read ON employee_notifications(is_read);
        CREATE INDEX idx_employee_notifications_priority ON employee_notifications(priority);
        CREATE INDEX idx_employee_notifications_created_at ON employee_notifications(created_at DESC);

        RAISE NOTICE '✅ Created employee_notifications table';
    ELSE
        RAISE NOTICE 'ℹ️ employee_notifications table already exists, checking for missing columns...';

        -- Add id column if it doesn't exist (should always exist, but check anyway)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'employee_notifications' AND column_name = 'id'
        ) THEN
            ALTER TABLE employee_notifications 
            ADD COLUMN id SERIAL PRIMARY KEY;
            RAISE NOTICE '✅ Added id column to employee_notifications table';
        END IF;

        -- Add employee column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'employee_notifications' AND column_name = 'employee'
        ) THEN
            ALTER TABLE employee_notifications 
            ADD COLUMN employee TEXT NOT NULL;
            RAISE NOTICE '✅ Added employee column to employee_notifications table';
        END IF;

        -- Add message column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'employee_notifications' AND column_name = 'message'
        ) THEN
            ALTER TABLE employee_notifications 
            ADD COLUMN message TEXT NOT NULL;
            RAISE NOTICE '✅ Added message column to employee_notifications table';
        END IF;

        -- Add priority column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'employee_notifications' AND column_name = 'priority'
        ) THEN
            ALTER TABLE employee_notifications 
            ADD COLUMN priority TEXT DEFAULT 'normal';
            
            -- Add check constraint for priority values
            ALTER TABLE employee_notifications 
            ADD CONSTRAINT employee_notifications_priority_check 
            CHECK (priority IN ('low', 'normal', 'high', 'critical'));
            
            RAISE NOTICE '✅ Added priority column to employee_notifications table';
        ELSE
            -- Check if constraint exists, add it if missing
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE table_name = 'employee_notifications' 
                AND constraint_name = 'employee_notifications_priority_check'
            ) THEN
                ALTER TABLE employee_notifications 
                ADD CONSTRAINT employee_notifications_priority_check 
                CHECK (priority IN ('low', 'normal', 'high', 'critical'));
                RAISE NOTICE '✅ Added priority check constraint to employee_notifications table';
            END IF;
        END IF;

        -- Add is_read column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'employee_notifications' AND column_name = 'is_read'
        ) THEN
            ALTER TABLE employee_notifications 
            ADD COLUMN is_read BOOLEAN DEFAULT false;
            RAISE NOTICE '✅ Added is_read column to employee_notifications table';
        END IF;

        -- Add created_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'employee_notifications' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE employee_notifications 
            ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE '✅ Added created_at column to employee_notifications table';
        END IF;

        -- Add target_role column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'employee_notifications' AND column_name = 'target_role'
        ) THEN
            ALTER TABLE employee_notifications 
            ADD COLUMN target_role TEXT DEFAULT 'employee';
            
            -- Add check constraint for target_role values
            ALTER TABLE employee_notifications 
            ADD CONSTRAINT employee_notifications_target_role_check 
            CHECK (target_role IN ('employee', 'admin'));
            
            RAISE NOTICE '✅ Added target_role column to employee_notifications table';
        ELSE
            -- Check if constraint exists, add it if missing
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE table_name = 'employee_notifications' 
                AND constraint_name = 'employee_notifications_target_role_check'
            ) THEN
                ALTER TABLE employee_notifications 
                ADD CONSTRAINT employee_notifications_target_role_check 
                CHECK (target_role IN ('employee', 'admin'));
                RAISE NOTICE '✅ Added target_role check constraint to employee_notifications table';
            END IF;
        END IF;

        -- Create indexes if they don't exist
        CREATE INDEX IF NOT EXISTS idx_employee_notifications_employee ON employee_notifications(employee);
        CREATE INDEX IF NOT EXISTS idx_employee_notifications_is_read ON employee_notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_employee_notifications_priority ON employee_notifications(priority);
        CREATE INDEX IF NOT EXISTS idx_employee_notifications_created_at ON employee_notifications(created_at DESC);

        RAISE NOTICE '✅ Verified all columns and indexes for employee_notifications table';
    END IF;
END $$;

-- Verify the table structure
DO $$
DECLARE
    table_exists BOOLEAN;
    column_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'employee_notifications'
    ) INTO table_exists;

    IF table_exists THEN
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns
        WHERE table_name = 'employee_notifications';

        RAISE NOTICE '✅ Verification: employee_notifications table exists with % columns', column_count;
        RAISE NOTICE '   Expected columns: id, employee, message, priority, target_role, is_read, created_at';
    ELSE
        RAISE WARNING '❌ employee_notifications table was not created';
    END IF;
END $$;
