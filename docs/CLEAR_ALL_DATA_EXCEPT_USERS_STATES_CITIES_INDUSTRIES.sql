-- ============================================
-- CLEAR ALL DATA EXCEPT USERS, STATES, CITIES, INDUSTRIES, AND SUB_INDUSTRIES
-- ============================================
-- This script deletes all data from all tables except:
--   - users (keeps all user accounts)
--   - states (keeps all state data)
--   - cities (keeps all city data)
--   - industries (keeps all industry data)
--   - sub_industries (keeps all sub-industry data)
--
-- WARNING: This will permanently delete all data!
-- Use this script only for testing/reset purposes.
-- Make sure to backup your data before running this!
-- ============================================

BEGIN;

-- ============================================
-- DELETE DATA IN REVERSE DEPENDENCY ORDER
-- ============================================
-- We delete child tables first, then parent tables
-- This avoids foreign key constraint violations

DO $$
BEGIN
    RAISE NOTICE 'Starting data deletion...';
    
    -- ============================================
    -- 1. DELETE FROM JUNCTION/RELATIONSHIP TABLES
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_customer') THEN
        DELETE FROM employee_customer;
        RAISE NOTICE '✓ Deleted from employee_customer';
    END IF;
    
    -- ============================================
    -- 2. DELETE FROM ACTIVITY TRACKING TABLES
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'logout_reasons') THEN
        DELETE FROM logout_reasons;
        RAISE NOTICE '✓ Deleted from logout_reasons';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        DELETE FROM activity_logs;
        RAISE NOTICE '✓ Deleted from activity_logs';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
        DELETE FROM activities;
        RAISE NOTICE '✓ Deleted from activities';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_activities') THEN
        DELETE FROM lead_activities;
        RAISE NOTICE '✓ Deleted from lead_activities';
    END IF;
    
    -- ============================================
    -- 3. DELETE FROM NOTIFICATIONS
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DELETE FROM notifications;
        RAISE NOTICE '✓ Deleted from notifications';
    END IF;
    
    -- ============================================
    -- 4. DELETE FROM QUOTATION TABLES (must be before sub_accounts)
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_mbcb') THEN
        DELETE FROM quotes_mbcb;
        RAISE NOTICE '✓ Deleted from quotes_mbcb';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_signages') THEN
        DELETE FROM quotes_signages;
        RAISE NOTICE '✓ Deleted from quotes_signages';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_paint') THEN
        DELETE FROM quotes_paint;
        RAISE NOTICE '✓ Deleted from quotes_paint';
    END IF;
    
    -- ============================================
    -- 5. DELETE FROM CONTACTS (references sub_accounts)
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        DELETE FROM contacts;
        RAISE NOTICE '✓ Deleted from contacts';
    END IF;
    
    -- ============================================
    -- 6. DELETE FROM TASKS (references accounts)
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        DELETE FROM tasks;
        RAISE NOTICE '✓ Deleted from tasks';
    END IF;
    
    -- ============================================
    -- 7. DELETE FROM LEADS (references accounts)
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        DELETE FROM leads;
        RAISE NOTICE '✓ Deleted from leads';
    END IF;
    
    -- ============================================
    -- 8. DELETE FROM SUB_ACCOUNTS (references accounts)
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sub_accounts') THEN
        DELETE FROM sub_accounts;
        RAISE NOTICE '✓ Deleted from sub_accounts';
    END IF;
    
    -- ============================================
    -- 9. DELETE FROM ACCOUNTS (parent table)
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
        DELETE FROM accounts;
        RAISE NOTICE '✓ Deleted from accounts';
    END IF;
    
    -- ============================================
    -- 10. DELETE FROM REFERENCE TABLES
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        DELETE FROM customers;
        RAISE NOTICE '✓ Deleted from customers';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'places_of_supply') THEN
        DELETE FROM places_of_supply;
        RAISE NOTICE '✓ Deleted from places_of_supply';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purposes') THEN
        DELETE FROM purposes;
        RAISE NOTICE '✓ Deleted from purposes';
    END IF;
    
    -- NOTE: industries and sub_industries are NOT deleted - they are preserved
    
    -- ============================================
    -- 11. DELETE FROM AI/ENGAGEMENT TABLES
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagement_ai_state') THEN
        DELETE FROM engagement_ai_state;
        RAISE NOTICE '✓ Deleted from engagement_ai_state';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagement_suggestions') THEN
        DELETE FROM engagement_suggestions;
        RAISE NOTICE '✓ Deleted from engagement_suggestions';
    END IF;
    
    RAISE NOTICE 'Data deletion completed successfully!';
END $$;

-- ============================================
-- RESET SEQUENCES
-- ============================================
-- Reset all SERIAL sequences to start from 1
-- This ensures new records start from ID 1
-- EXCEPT for preserved tables (users, states, cities, industries, sub_industries)

DO $$
DECLARE
    seq_record RECORD;
BEGIN
    RAISE NOTICE 'Resetting sequences...';
    
    FOR seq_record IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
        AND sequence_name NOT LIKE '%users%'
        AND sequence_name NOT LIKE '%states%'
        AND sequence_name NOT LIKE '%cities%'
        AND sequence_name NOT LIKE '%industries%'
    LOOP
        BEGIN
            EXECUTE 'ALTER SEQUENCE ' || seq_record.sequence_name || ' RESTART WITH 1';
            RAISE NOTICE '✓ Reset sequence: %', seq_record.sequence_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠ Could not reset sequence %: %', seq_record.sequence_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Sequence reset completed!';
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify the deletion:

DO $$
DECLARE
    table_record RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION: Row counts for all tables';
    RAISE NOTICE '========================================';
    
    -- List of tables to check
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name IN (
            'accounts', 'sub_accounts', 'contacts', 'leads', 'tasks', 
            'activities', 'activity_logs', 'lead_activities', 'logout_reasons', 'notifications', 
            'quotes_mbcb', 'quotes_signages', 'quotes_paint',
            'customers', 'places_of_supply', 'purposes', 'employee_customer',
            'industries', 'sub_industries',
            'engagement_ai_state', 'engagement_suggestions',
            'users', 'states', 'cities'
        )
        ORDER BY table_name
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM %I', table_record.table_name) INTO row_count;
            
            IF table_record.table_name IN ('users', 'states', 'cities', 'industries', 'sub_industries') THEN
                RAISE NOTICE '%: % rows (should have data) ✓', 
                    RPAD(table_record.table_name, 25), row_count;
            ELSE
                IF row_count = 0 THEN
                    RAISE NOTICE '%: % rows (cleared) ✓', 
                        RPAD(table_record.table_name, 25), row_count;
                ELSE
                    RAISE NOTICE '%: % rows (NOT CLEARED!) ✗', 
                        RPAD(table_record.table_name, 25), row_count;
                END IF;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '%: Error checking table - %', 
                    table_record.table_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- All tables should show 0 rows EXCEPT:
--   - users: should still have your user records
--   - states: should still have state records  
--   - cities: should still have city records
--   - industries: should still have industry records
--   - sub_industries: should still have sub-industry records
-- ============================================

-- ============================================
-- ADDITIONAL VERIFICATION (Preserved Data Check)
-- ============================================
-- Check that preserved tables still have data:

DO $$
DECLARE
    users_count INTEGER := 0;
    states_count INTEGER := 0;
    cities_count INTEGER := 0;
    industries_count INTEGER := 0;
    sub_industries_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PRESERVED DATA CHECK';
    RAISE NOTICE '========================================';
    
    -- Check users
    BEGIN
        SELECT COUNT(*) INTO users_count FROM users;
        IF users_count > 0 THEN
            RAISE NOTICE 'users: % rows preserved ✓', users_count;
        ELSE
            RAISE NOTICE 'users: NO DATA FOUND! ✗';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'users: Table does not exist or error: %', SQLERRM;
    END;
    
    -- Check states
    BEGIN
        SELECT COUNT(*) INTO states_count FROM states;
        IF states_count > 0 THEN
            RAISE NOTICE 'states: % rows preserved ✓', states_count;
        ELSE
            RAISE NOTICE 'states: NO DATA FOUND! ✗';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'states: Table does not exist or error: %', SQLERRM;
    END;
    
    -- Check cities
    BEGIN
        SELECT COUNT(*) INTO cities_count FROM cities;
        IF cities_count > 0 THEN
            RAISE NOTICE 'cities: % rows preserved ✓', cities_count;
        ELSE
            RAISE NOTICE 'cities: NO DATA FOUND! ✗';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'cities: Table does not exist or error: %', SQLERRM;
    END;
    
    -- Check industries
    BEGIN
        SELECT COUNT(*) INTO industries_count FROM industries;
        IF industries_count > 0 THEN
            RAISE NOTICE 'industries: % rows preserved ✓', industries_count;
        ELSE
            RAISE NOTICE 'industries: NO DATA FOUND! ✗';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'industries: Table does not exist or error: %', SQLERRM;
    END;
    
    -- Check sub_industries
    BEGIN
        SELECT COUNT(*) INTO sub_industries_count FROM sub_industries;
        IF sub_industries_count > 0 THEN
            RAISE NOTICE 'sub_industries: % rows preserved ✓', sub_industries_count;
        ELSE
            RAISE NOTICE 'sub_industries: NO DATA FOUND! ✗';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'sub_industries: Table does not exist or error: %', SQLERRM;
    END;
    
    RAISE NOTICE '========================================';
END $$;
