-- ============================================
-- CLEAR ALL DATA AND RESET ID SEQUENCES
-- This script clears all data from tables except:
--   - users
--   - industries
--   - sub_industries
--   - states
--   - cities
-- And resets all ID sequences to start from 1
-- Also resets estimate_counter for PDF generation (YNM/EST-1)
-- ============================================

-- ============================================
-- STEP 1: DISABLE TRIGGERS (to avoid foreign key issues)
-- ============================================
SET session_replication_role = 'replica';

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
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
        TRUNCATE TABLE quotes CASCADE;
    END IF;
    
    -- Delete from AI/analytics tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_queries') THEN
        TRUNCATE TABLE ai_queries CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_coaching_reports') THEN
        TRUNCATE TABLE ai_coaching_reports CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_weekly_insights') THEN
        TRUNCATE TABLE ai_weekly_insights CASCADE;
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
    
    -- ============================================
    -- RESET ESTIMATE COUNTER FOR PDF GENERATION
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimate_counter') THEN
        -- Reset the counter to 0 so next PDF will be YNM/EST-1
        UPDATE estimate_counter SET current_number = 0, updated_at = NOW() WHERE id = 1;
        RAISE NOTICE '✅ Estimate counter reset - next PDF will be YNM/EST-1';
    END IF;
    
END $$;

-- ============================================
-- STEP 3: RE-ENABLE TRIGGERS
-- ============================================
SET session_replication_role = 'origin';

-- ============================================
-- STEP 4: RESET ALL ID SEQUENCES
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
            PERFORM setval('users_id_seq', GREATEST(max_id, 1), max_id > 0);
        END IF;
    END IF;
    
    -- Reset industries sequence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'industries') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM industries;
        IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'industries_id_seq') THEN
            PERFORM setval('industries_id_seq', GREATEST(max_id, 1), max_id > 0);
        END IF;
    END IF;
    
    -- Reset sub_industries sequence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sub_industries') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM sub_industries;
        IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'sub_industries_id_seq') THEN
            PERFORM setval('sub_industries_id_seq', GREATEST(max_id, 1), max_id > 0);
        END IF;
    END IF;
    
    -- Reset states sequence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'states') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM states;
        IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'states_id_seq') THEN
            PERFORM setval('states_id_seq', GREATEST(max_id, 1), max_id > 0);
        END IF;
    END IF;
    
    -- Reset cities sequence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cities') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM cities;
        IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'cities_id_seq') THEN
            PERFORM setval('cities_id_seq', GREATEST(max_id, 1), max_id > 0);
        END IF;
    END IF;
END $$;

-- Reset sequences for cleared tables (always restart at 1)
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
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'quotes_id_seq') THEN
        PERFORM setval('quotes_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'employee_customer_id_seq') THEN
        PERFORM setval('employee_customer_id_seq', 1, false);
    END IF;
    
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
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'ai_queries_id_seq') THEN
        PERFORM setval('ai_queries_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'ai_coaching_reports_id_seq') THEN
        PERFORM setval('ai_coaching_reports_id_seq', 1, false);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'ai_weekly_insights_id_seq') THEN
        PERFORM setval('ai_weekly_insights_id_seq', 1, false);
    END IF;
END $$;

-- ============================================
-- STEP 5: VERIFICATION QUERIES (Uncomment to run)
-- ============================================

-- Check row counts for protected tables (should have data)
SELECT 'PROTECTED TABLES (data preserved):' as info;
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL SELECT 'industries', COUNT(*) FROM industries
UNION ALL SELECT 'sub_industries', COUNT(*) FROM sub_industries
UNION ALL SELECT 'states', COUNT(*) FROM states
UNION ALL SELECT 'cities', COUNT(*) FROM cities;

-- Check estimate counter status
SELECT 'ESTIMATE COUNTER STATUS:' as info;
SELECT * FROM estimate_counter;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ALL DATA CLEARED SUCCESSFULLY!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ All ID sequences reset to start from 1';
    RAISE NOTICE '✅ Estimate counter reset - next PDF: YNM/EST-1';
    RAISE NOTICE '✅ Protected tables preserved:';
    RAISE NOTICE '   - users';
    RAISE NOTICE '   - industries';
    RAISE NOTICE '   - sub_industries';
    RAISE NOTICE '   - states';
    RAISE NOTICE '   - cities';
    RAISE NOTICE '============================================';
END $$;
