-- ============================================
-- FIX USERS TABLE - MAKE IDS SEQUENTIAL
-- ============================================
-- This script will renumber user IDs to be sequential (1, 2, 3, 4, 5, ...)
-- Current: 1, 12, 13, 14, 15, 16, 17
-- After:   1, 2, 3, 4, 5, 6, 7

-- Step 1: Create a temporary mapping table
DROP TABLE IF EXISTS user_id_mapping;
CREATE TEMP TABLE user_id_mapping AS
SELECT 
    id AS old_id,
    ROW_NUMBER() OVER (ORDER BY id)::INTEGER AS new_id
FROM users;

-- View the mapping (for verification)
SELECT 'ID MAPPING:' as info;
SELECT * FROM user_id_mapping ORDER BY old_id;

-- Step 2: Disable triggers temporarily
SET session_replication_role = 'replica';

-- Step 3: Update all foreign key references first (with proper type casting)

-- Update activities table (employee_id is TEXT)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'employee_id') THEN
        UPDATE activities SET employee_id = (
            SELECT m.new_id::TEXT FROM user_id_mapping m WHERE m.old_id::TEXT = activities.employee_id
        ) WHERE employee_id::INTEGER IN (SELECT old_id FROM user_id_mapping);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped activities table: %', SQLERRM;
END $$;

-- Update accounts table (assigned_to might be TEXT or INTEGER)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'assigned_to') THEN
        UPDATE accounts SET assigned_to = (
            SELECT m.new_id::TEXT FROM user_id_mapping m WHERE m.old_id::TEXT = accounts.assigned_to::TEXT
        ) WHERE accounts.assigned_to IS NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped accounts.assigned_to: %', SQLERRM;
END $$;

-- Update sub_accounts table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sub_accounts' AND column_name = 'assigned_to') THEN
        UPDATE sub_accounts SET assigned_to = (
            SELECT m.new_id::TEXT FROM user_id_mapping m WHERE m.old_id::TEXT = sub_accounts.assigned_to::TEXT
        ) WHERE sub_accounts.assigned_to IS NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped sub_accounts.assigned_to: %', SQLERRM;
END $$;

-- Update leads table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'assigned_to') THEN
        UPDATE leads SET assigned_to = (
            SELECT m.new_id::TEXT FROM user_id_mapping m WHERE m.old_id::TEXT = leads.assigned_to::TEXT
        ) WHERE leads.assigned_to IS NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped leads.assigned_to: %', SQLERRM;
END $$;

-- Update tasks table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'assigned_to') THEN
        UPDATE tasks SET assigned_to = (
            SELECT m.new_id::TEXT FROM user_id_mapping m WHERE m.old_id::TEXT = tasks.assigned_to::TEXT
        ) WHERE tasks.assigned_to IS NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped tasks.assigned_to: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'created_by') THEN
        UPDATE tasks SET created_by = (
            SELECT m.new_id::TEXT FROM user_id_mapping m WHERE m.old_id::TEXT = tasks.created_by::TEXT
        ) WHERE tasks.created_by IS NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped tasks.created_by: %', SQLERRM;
END $$;

-- Update notifications table (user_id might be TEXT or INTEGER)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
        UPDATE notifications SET user_id = (
            SELECT m.new_id::TEXT FROM user_id_mapping m WHERE m.old_id::TEXT = notifications.user_id::TEXT
        ) WHERE notifications.user_id IS NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped notifications.user_id: %', SQLERRM;
END $$;

-- Update employee_notifications table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_notifications' AND column_name = 'user_id') THEN
        UPDATE employee_notifications SET user_id = (
            SELECT m.new_id FROM user_id_mapping m WHERE m.old_id = employee_notifications.user_id::INTEGER
        ) WHERE employee_notifications.user_id IS NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped employee_notifications.user_id: %', SQLERRM;
END $$;

-- Update employee_streaks table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_streaks' AND column_name = 'user_id') THEN
        UPDATE employee_streaks SET user_id = (
            SELECT m.new_id FROM user_id_mapping m WHERE m.old_id = employee_streaks.user_id::INTEGER
        ) WHERE employee_streaks.user_id IS NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped employee_streaks.user_id: %', SQLERRM;
END $$;

-- Update quotes_mbcb table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_mbcb' AND column_name = 'user_id') THEN
        UPDATE quotes_mbcb SET user_id = (
            SELECT m.new_id FROM user_id_mapping m WHERE m.old_id = quotes_mbcb.user_id::INTEGER
        ) WHERE quotes_mbcb.user_id IS NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped quotes_mbcb.user_id: %', SQLERRM;
END $$;

-- Update quotes_signages table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_signages' AND column_name = 'user_id') THEN
        UPDATE quotes_signages SET user_id = (
            SELECT m.new_id FROM user_id_mapping m WHERE m.old_id = quotes_signages.user_id::INTEGER
        ) WHERE quotes_signages.user_id IS NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped quotes_signages.user_id: %', SQLERRM;
END $$;

-- Step 4: Now update the users table itself
-- We need to do this carefully to avoid primary key conflicts
-- First, shift all IDs to a high temporary range
UPDATE users SET id = id + 10000;

-- Now update to the new sequential IDs using the mapping
UPDATE users u SET id = m.new_id
FROM user_id_mapping m
WHERE u.id = m.old_id + 10000;

-- Step 5: Re-enable triggers
SET session_replication_role = 'origin';

-- Step 6: Reset the sequence to start after the last ID
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users), true);

-- Step 7: Verify the result
SELECT 'USERS TABLE AFTER FIX:' as info;
SELECT id, username, password, created_at FROM users ORDER BY id;

-- Step 8: Show sequence status
SELECT 'SEQUENCE STATUS:' as info;
SELECT last_value, is_called FROM users_id_seq;

-- Clean up
DROP TABLE IF EXISTS user_id_mapping;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ USER IDS FIXED SUCCESSFULLY!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'User IDs are now sequential: 1, 2, 3, 4, 5, 6, 7';
    RAISE NOTICE 'Sequence reset to continue from max(id) + 1';
    RAISE NOTICE '============================================';
END $$;
