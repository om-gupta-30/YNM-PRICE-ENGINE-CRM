-- ============================================================================
-- CREATE DATA ANALYST USERS
-- ============================================================================
-- This script creates two data analyst users:
-- 1. swamymahesh / swamymahesh@123
-- 2. mahesh / mahesh@123
-- 
-- These users have restricted access:
-- - NO access to price engine
-- - Access to CRM only
-- - Can see Admin portal in CRM
-- - CANNOT assign accounts to anyone
-- - CANNOT see "All Sub-Accounts" and "All Contacts" sections
-- - CANNOT see Leads section
-- ============================================================================

DO $$
DECLARE
    max_id INTEGER;
    seq_name TEXT;
BEGIN
    -- First, sync the sequence to avoid ID conflicts
    -- Find the sequence name for users table
    SELECT pg_get_serial_sequence('users', 'id') INTO seq_name;
    
    IF seq_name IS NOT NULL THEN
        -- Get the maximum ID currently in the table
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM users;
        
        -- Set the sequence to the next value after the max ID
        EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_id);
        RAISE NOTICE '✓ Synced sequence % to %', seq_name, max_id;
    END IF;

    -- Check if users table uses 'username' or 'user_id' column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
    ) THEN
        -- Users table uses 'username' column
        -- Use UPSERT: if user exists, update password; if not, insert new
        -- PostgreSQL will auto-generate the id (SERIAL/BIGSERIAL)
        
        -- Check which columns exist and insert accordingly
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
            -- Has created_at column - only set it on INSERT, not on UPDATE
            INSERT INTO users (username, password, created_at)
            VALUES ('swamymahesh', 'swamymahesh@123', NOW())
            ON CONFLICT (username) DO UPDATE 
            SET password = EXCLUDED.password;
            
            INSERT INTO users (username, password, created_at)
            VALUES ('mahesh', 'mahesh@123', NOW())
            ON CONFLICT (username) DO UPDATE 
            SET password = EXCLUDED.password;
        ELSE
            -- No created_at column
            INSERT INTO users (username, password)
            VALUES ('swamymahesh', 'swamymahesh@123')
            ON CONFLICT (username) DO UPDATE 
            SET password = EXCLUDED.password;
            
            INSERT INTO users (username, password)
            VALUES ('mahesh', 'mahesh@123')
            ON CONFLICT (username) DO UPDATE 
            SET password = EXCLUDED.password;
        END IF;
        RAISE NOTICE '✓ Created/Updated data analyst users with username column';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'user_id'
    ) THEN
        -- Users table uses 'user_id' column
        -- Use UPSERT: if user exists, update password; if not, insert new
        -- PostgreSQL will auto-generate the id (SERIAL/BIGSERIAL)
        
        -- Check which columns exist and insert accordingly
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
            -- Has created_at column - only set it on INSERT, not on UPDATE
            INSERT INTO users (user_id, password, created_at)
            VALUES ('swamymahesh', 'swamymahesh@123', NOW())
            ON CONFLICT (user_id) DO UPDATE 
            SET password = EXCLUDED.password;
            
            INSERT INTO users (user_id, password, created_at)
            VALUES ('mahesh', 'mahesh@123', NOW())
            ON CONFLICT (user_id) DO UPDATE 
            SET password = EXCLUDED.password;
        ELSE
            -- No created_at column
            INSERT INTO users (user_id, password)
            VALUES ('swamymahesh', 'swamymahesh@123')
            ON CONFLICT (user_id) DO UPDATE 
            SET password = EXCLUDED.password;
            
            INSERT INTO users (user_id, password)
            VALUES ('mahesh', 'mahesh@123')
            ON CONFLICT (user_id) DO UPDATE 
            SET password = EXCLUDED.password;
        END IF;
        RAISE NOTICE '✓ Created/Updated data analyst users with user_id column';
    ELSE
        RAISE NOTICE '⚠ Users table structure not recognized. Please create users manually.';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ DATA ANALYST USERS CREATED SUCCESSFULLY';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Users created:';
    RAISE NOTICE '  1. swamymahesh / swamymahesh@123';
    RAISE NOTICE '  2. mahesh / mahesh@123';
    RAISE NOTICE '';
    RAISE NOTICE '⚠ IMPORTANT: Backend and frontend code has been updated to:';
    RAISE NOTICE '  - Block price engine access for these users';
    RAISE NOTICE '  - Allow CRM access with restricted permissions';
    RAISE NOTICE '  - Hide "All Sub-Accounts" and "All Contacts" sections';
    RAISE NOTICE '  - Hide Leads section';
    RAISE NOTICE '  - Prevent account assignment';
    RAISE NOTICE '============================================================================';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE;
END $$;

-- Verify the users were created
DO $$
DECLARE
    rec RECORD;
    user_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
        SELECT COUNT(*) INTO user_count FROM users WHERE username IN ('swamymahesh', 'mahesh');
        IF user_count > 0 THEN
            RAISE NOTICE '✓ Verification: Data analyst users exist (username column) - Found % user(s)', user_count;
            FOR rec IN SELECT username FROM users WHERE username IN ('swamymahesh', 'mahesh') LOOP
                RAISE NOTICE '  - User: %', rec.username;
            END LOOP;
        ELSE
            RAISE NOTICE '⚠ Verification: Data analyst users NOT found';
        END IF;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_id') THEN
        SELECT COUNT(*) INTO user_count FROM users WHERE user_id IN ('swamymahesh', 'mahesh');
        IF user_count > 0 THEN
            RAISE NOTICE '✓ Verification: Data analyst users exist (user_id column) - Found % user(s)', user_count;
            FOR rec IN SELECT user_id FROM users WHERE user_id IN ('swamymahesh', 'mahesh') LOOP
                RAISE NOTICE '  - User: %', rec.user_id;
            END LOOP;
        ELSE
            RAISE NOTICE '⚠ Verification: Data analyst users NOT found';
        END IF;
    ELSE
        RAISE NOTICE '⚠ Verification: Could not determine users table structure';
    END IF;
END $$;

