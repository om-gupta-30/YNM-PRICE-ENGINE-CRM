-- ============================================
-- DELETE ALL DATA EXCEPT USERS, STATES, AND CITIES
-- ============================================
-- This script deletes all data from all tables except:
--   - users
--   - states
--   - cities
--
-- WARNING: This will permanently delete all data!
-- Use this script only for testing purposes.
-- ============================================

-- We'll delete in reverse dependency order to avoid foreign key constraint errors
-- Using conditional deletion to handle tables that may not exist

BEGIN;

-- Delete from tables that reference other tables first (child tables)
-- Then delete from parent tables

-- Helper function to safely delete from a table if it exists
-- IMPORTANT: Quotation tables must be deleted BEFORE sub_accounts due to foreign key constraints
DO $$
BEGIN
    -- 1. Delete from junction/relationship tables first (if they exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_customer') THEN
        DELETE FROM employee_customer;
        RAISE NOTICE 'Deleted from employee_customer';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'logout_reasons') THEN
        DELETE FROM logout_reasons;
        RAISE NOTICE 'Deleted from logout_reasons';
    END IF;

    -- 2. Delete from quotation tables FIRST (they reference sub_accounts)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_mbcb') THEN
        DELETE FROM quotes_mbcb;
        RAISE NOTICE 'Deleted from quotes_mbcb';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_signages') THEN
        DELETE FROM quotes_signages;
        RAISE NOTICE 'Deleted from quotes_signages';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_paint') THEN
        DELETE FROM quotes_paint;
        RAISE NOTICE 'Deleted from quotes_paint';
    END IF;

    -- 3. Delete from contacts (references sub_accounts)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        DELETE FROM contacts;
        RAISE NOTICE 'Deleted from contacts';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DELETE FROM notifications;
        RAISE NOTICE 'Deleted from notifications';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
        DELETE FROM activities;
        RAISE NOTICE 'Deleted from activities';
    END IF;

    -- 4. Delete from sub_accounts (references accounts) - AFTER quotes are deleted
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sub_accounts') THEN
        DELETE FROM sub_accounts;
        RAISE NOTICE 'Deleted from sub_accounts';
    END IF;

    -- 5. Delete from accounts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
        DELETE FROM accounts;
        RAISE NOTICE 'Deleted from accounts';
    END IF;

    -- 6. Delete from leads
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        DELETE FROM leads;
        RAISE NOTICE 'Deleted from leads';
    END IF;

    -- 7. Delete from tasks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        DELETE FROM tasks;
        RAISE NOTICE 'Deleted from tasks';
    END IF;

    -- 8. Delete from customers and places_of_supply
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        DELETE FROM customers;
        RAISE NOTICE 'Deleted from customers';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'places_of_supply') THEN
        DELETE FROM places_of_supply;
        RAISE NOTICE 'Deleted from places_of_supply';
    END IF;
END $$;

-- 9. Reset sequences for tables that use SERIAL (auto-increment)
-- This ensures new records start from 1
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    -- Reset sequences for all tables that use SERIAL
    FOR seq_record IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
        AND sequence_name NOT LIKE '%users%'
        AND sequence_name NOT LIKE '%states%'
        AND sequence_name NOT LIKE '%cities%'
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || seq_record.sequence_name || ' RESTART WITH 1';
        RAISE NOTICE 'Reset sequence: %', seq_record.sequence_name;
    END LOOP;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify the deletion:

-- SELECT 'accounts' as table_name, COUNT(*) as row_count FROM accounts
-- UNION ALL
-- SELECT 'sub_accounts', COUNT(*) FROM sub_accounts
-- UNION ALL
-- SELECT 'contacts', COUNT(*) FROM contacts
-- UNION ALL
-- SELECT 'leads', COUNT(*) FROM leads
-- UNION ALL
-- SELECT 'tasks', COUNT(*) FROM tasks
-- UNION ALL
-- SELECT 'activities', COUNT(*) FROM activities
-- UNION ALL
-- SELECT 'logout_reasons', COUNT(*) FROM logout_reasons
-- UNION ALL
-- SELECT 'notifications', COUNT(*) FROM notifications
-- UNION ALL
-- SELECT 'quotes_mbcb', COUNT(*) FROM quotes_mbcb
-- UNION ALL
-- SELECT 'quotes_signages', COUNT(*) FROM quotes_signages
-- UNION ALL
-- SELECT 'quotes_paint', COUNT(*) FROM quotes_paint
-- UNION ALL
-- SELECT 'customers', COUNT(*) FROM customers
-- UNION ALL
-- SELECT 'places_of_supply', COUNT(*) FROM places_of_supply
-- UNION ALL
-- SELECT 'employee_customer', COUNT(*) FROM employee_customer
-- UNION ALL
-- SELECT 'users', COUNT(*) FROM users
-- UNION ALL
-- SELECT 'states', COUNT(*) FROM states
-- UNION ALL
-- SELECT 'cities', COUNT(*) FROM cities;

-- ============================================
-- Expected Results:
-- ============================================
-- All tables should show 0 rows EXCEPT:
--   - users: should still have your user records
--   - states: should still have state records
--   - cities: should still have city records
-- ============================================
