-- ============================================
-- CLEAR ALL DATA AND RESET ID SEQUENCES
-- This script clears all data from tables except:
--   - users
--   - industries
--   - sub_industries
--   - states
--   - cities
-- And resets all ID sequences to start from 1
-- ============================================

-- ============================================
-- STEP 1: DISABLE FOREIGN KEY CHECKS (Temporarily)
-- ============================================
-- Note: PostgreSQL doesn't support disabling foreign keys like MySQL,
-- so we'll use TRUNCATE CASCADE or DELETE in the correct order

-- ============================================
-- STEP 2: DELETE DATA FROM ALL TABLES (except protected ones)
-- ============================================
-- Delete in order to respect foreign key constraints
-- Using DO block to handle tables that may not exist

DO $$
BEGIN
    -- Delete from junction/relationship tables first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_customer') THEN
        TRUNCATE TABLE employee_customer CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_streaks') THEN
        TRUNCATE TABLE employee_streaks CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_notifications') THEN
        TRUNCATE TABLE employee_notifications CASCADE;
    END IF;
    
    -- Delete from activity/engagement tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
        TRUNCATE TABLE activities CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagement_history') THEN
        TRUNCATE TABLE engagement_history CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'logout_reasons') THEN
        TRUNCATE TABLE logout_reasons CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_activities') THEN
        TRUNCATE TABLE lead_activities CASCADE;
    END IF;
    
    -- Delete from notification tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        TRUNCATE TABLE notifications CASCADE;
    END IF;
    
    -- Delete from task tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        TRUNCATE TABLE tasks CASCADE;
    END IF;
    
    -- Delete from lead tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        TRUNCATE TABLE leads CASCADE;
    END IF;
    
    -- Delete from contact tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        TRUNCATE TABLE contacts CASCADE;
    END IF;
    
    -- Delete from quotation tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_mbcb') THEN
        TRUNCATE TABLE quotes_mbcb CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_signages') THEN
        TRUNCATE TABLE quotes_signages CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_paint') THEN
        TRUNCATE TABLE quotes_paint CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merged_quotations') THEN
        TRUNCATE TABLE merged_quotations CASCADE;
    END IF;
    
    -- Delete from account tables (sub_accounts before accounts due to FK)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sub_accounts') THEN
        TRUNCATE TABLE sub_accounts CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
        TRUNCATE TABLE accounts CASCADE;
    END IF;
    
    -- Delete from customer tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        TRUNCATE TABLE customers CASCADE;
    END IF;
    
    -- Delete from reference/lookup tables (except protected ones)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'places_of_supply') THEN
        TRUNCATE TABLE places_of_supply CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purposes') THEN
        TRUNCATE TABLE purposes CASCADE;
    END IF;
END $$;

-- ============================================
-- STEP 3: RESET ALL ID SEQUENCES
-- ============================================
-- Reset sequences for all tables
-- Note: For protected tables (users, industries, sub_industries, states, cities),
--       sequences are set to max(id) + 1 to continue from existing data
--       For cleared tables, sequences are reset to 1 so new records start from 1

-- Protected tables: Set sequence to max(id) + 1 to continue from existing data
DO $$
DECLARE
    max_id INTEGER;
BEGIN
    -- Reset users sequence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM users;
        IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'users_id_seq') THEN
            PERFORM setval('users_id_seq', GREATEST(max_id, 1), false);
        END IF;
    END IF;
    
    -- Reset industries sequence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'industries') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM industries;
        IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'industries_id_seq') THEN
            PERFORM setval('industries_id_seq', GREATEST(max_id, 1), false);
        END IF;
    END IF;
    
    -- Reset sub_industries sequence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sub_industries') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM sub_industries;
        IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'sub_industries_id_seq') THEN
            PERFORM setval('sub_industries_id_seq', GREATEST(max_id, 1), false);
        END IF;
    END IF;
    
    -- Reset states sequence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'states') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM states;
        IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'states_id_seq') THEN
            PERFORM setval('states_id_seq', GREATEST(max_id, 1), false);
        END IF;
    END IF;
    
    -- Reset cities sequence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cities') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM cities;
        IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'cities_id_seq') THEN
            PERFORM setval('cities_id_seq', GREATEST(max_id, 1), false);
        END IF;
    END IF;
END $$;

-- Reset sequences for cleared tables (always restart at 1)
-- Using setval to ensure sequences are properly reset
DO $$
BEGIN
    -- Reset all cleared table sequences to 1 (only if sequence exists)
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'accounts_id_seq') THEN
        PERFORM setval('accounts_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'sub_accounts_id_seq') THEN
        PERFORM setval('sub_accounts_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'contacts_id_seq') THEN
        PERFORM setval('contacts_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'activities_id_seq') THEN
        PERFORM setval('activities_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'leads_id_seq') THEN
        PERFORM setval('leads_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'tasks_id_seq') THEN
        PERFORM setval('tasks_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'notifications_id_seq') THEN
        PERFORM setval('notifications_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'customers_id_seq') THEN
        PERFORM setval('customers_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'places_of_supply_id_seq') THEN
        PERFORM setval('places_of_supply_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'purposes_id_seq') THEN
        PERFORM setval('purposes_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'quotes_mbcb_id_seq') THEN
        PERFORM setval('quotes_mbcb_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'quotes_signages_id_seq') THEN
        PERFORM setval('quotes_signages_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'quotes_paint_id_seq') THEN
        PERFORM setval('quotes_paint_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'employee_customer_id_seq') THEN
        PERFORM setval('employee_customer_id_seq', 1, false);
    END IF;
    
    -- Reset optional table sequences (if they exist)
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'employee_streaks_id_seq') THEN
        PERFORM setval('employee_streaks_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'employee_notifications_id_seq') THEN
        PERFORM setval('employee_notifications_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'engagement_history_id_seq') THEN
        PERFORM setval('engagement_history_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'logout_reasons_id_seq') THEN
        PERFORM setval('logout_reasons_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'lead_activities_id_seq') THEN
        PERFORM setval('lead_activities_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'merged_quotations_id_seq') THEN
        PERFORM setval('merged_quotations_id_seq', 1, false);
    END IF;
END $$;

-- ============================================
-- STEP 4: VERIFICATION QUERIES
-- ============================================
-- Uncomment to verify the cleanup:

-- Check row counts for protected tables
-- SELECT 'users' as table_name, COUNT(*) as row_count FROM users
-- UNION ALL
-- SELECT 'industries', COUNT(*) FROM industries
-- UNION ALL
-- SELECT 'sub_industries', COUNT(*) FROM sub_industries
-- UNION ALL
-- SELECT 'states', COUNT(*) FROM states
-- UNION ALL
-- SELECT 'cities', COUNT(*) FROM cities;

-- Check row counts for cleared tables (should all be 0)
-- SELECT 'accounts' as table_name, COUNT(*) as row_count FROM accounts
-- UNION ALL
-- SELECT 'sub_accounts', COUNT(*) FROM sub_accounts
-- UNION ALL
-- SELECT 'contacts', COUNT(*) FROM contacts
-- UNION ALL
-- SELECT 'activities', COUNT(*) FROM activities
-- UNION ALL
-- SELECT 'leads', COUNT(*) FROM leads
-- UNION ALL
-- SELECT 'tasks', COUNT(*) FROM tasks
-- UNION ALL
-- SELECT 'notifications', COUNT(*) FROM notifications
-- UNION ALL
-- SELECT 'customers', COUNT(*) FROM customers
-- UNION ALL
-- SELECT 'quotes_mbcb', COUNT(*) FROM quotes_mbcb
-- UNION ALL
-- SELECT 'quotes_signages', COUNT(*) FROM quotes_signages
-- UNION ALL
-- SELECT 'quotes_paint', COUNT(*) FROM quotes_paint;

-- Check sequence values
-- SELECT 
--     schemaname,
--     sequencename,
--     last_value
-- FROM pg_sequences
-- WHERE sequencename LIKE '%_id_seq'
-- ORDER BY sequencename;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Data cleared successfully!';
    RAISE NOTICE '✅ All ID sequences reset to start from 1';
    RAISE NOTICE '✅ Protected tables (users, industries, sub_industries, states, cities) preserved';
END $$;
