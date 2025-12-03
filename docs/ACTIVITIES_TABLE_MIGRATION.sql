-- Activities Table Migration
-- This script ensures the activities table has all required columns and types
-- Run this in your Supabase SQL Editor

-- Step 1: Add missing columns to activities table if they don't exist
DO $$
BEGIN
    -- Add sub_account_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activities' AND column_name = 'sub_account_id'
    ) THEN
        ALTER TABLE activities ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_activities_sub_account_id ON activities(sub_account_id);
        RAISE NOTICE 'Added sub_account_id column to activities table';
    END IF;

    -- Add lead_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activities' AND column_name = 'lead_id'
    ) THEN
        ALTER TABLE activities ADD COLUMN lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);
        RAISE NOTICE 'Added lead_id column to activities table';
    END IF;

    -- Add task_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activities' AND column_name = 'task_id'
    ) THEN
        ALTER TABLE activities ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_activities_task_id ON activities(task_id);
        RAISE NOTICE 'Added task_id column to activities table';
    END IF;

    -- Add created_at column if not exists (alias for timestamp)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activities' AND column_name = 'created_at'
    ) THEN
        -- Check if timestamp column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'activities' AND column_name = 'timestamp'
        ) THEN
            -- Rename timestamp to created_at
            ALTER TABLE activities RENAME COLUMN timestamp TO created_at;
            RAISE NOTICE 'Renamed timestamp column to created_at';
        ELSE
            ALTER TABLE activities ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Added created_at column to activities table';
        END IF;
    END IF;

    -- Add created_by column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activities' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE activities ADD COLUMN created_by TEXT;
        RAISE NOTICE 'Added created_by column to activities table';
    END IF;
END $$;

-- Step 2: Update activity_type enum to include new types
DO $$
BEGIN
    -- Check if 'return_from_inactive' type exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'return_from_inactive' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')
    ) THEN
        ALTER TYPE activity_type_enum ADD VALUE IF NOT EXISTS 'return_from_inactive';
        RAISE NOTICE 'Added return_from_inactive to activity_type_enum';
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'activity_type_enum does not exist, using TEXT for activity_type';
END $$;

-- Step 3: Create index for faster activity lookups
CREATE INDEX IF NOT EXISTS idx_activities_employee_id ON activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
CREATE INDEX IF NOT EXISTS idx_activities_account_id ON activities(account_id);

-- Step 4: Create logout_reasons table if it doesn't exist
CREATE TABLE IF NOT EXISTS logout_reasons (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    reason_tag TEXT NOT NULL,
    reason_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logout_reasons_user_id ON logout_reasons(user_id);
CREATE INDEX IF NOT EXISTS idx_logout_reasons_created_at ON logout_reasons(created_at);

-- Step 5: Grant permissions
GRANT ALL ON activities TO authenticated;
GRANT ALL ON activities TO service_role;
GRANT ALL ON logout_reasons TO authenticated;
GRANT ALL ON logout_reasons TO service_role;

-- Notify success
DO $$
BEGIN
    RAISE NOTICE '✅ Activities table migration completed successfully!';
    RAISE NOTICE 'The following changes were made (if needed):';
    RAISE NOTICE '  - Added sub_account_id column for sub-account activity tracking';
    RAISE NOTICE '  - Added lead_id column for lead activity tracking';
    RAISE NOTICE '  - Added task_id column for task activity tracking';
    RAISE NOTICE '  - Added/renamed created_at column for timestamp';
    RAISE NOTICE '  - Added created_by column for audit trail';
    RAISE NOTICE '  - Created logout_reasons table for logout tracking';
    RAISE NOTICE '  - Created indexes for faster lookups';
END $$;
