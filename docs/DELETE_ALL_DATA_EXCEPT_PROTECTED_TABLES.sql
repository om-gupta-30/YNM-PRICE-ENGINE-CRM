-- ============================================
-- DELETE ALL DATA EXCEPT PROTECTED TABLES
-- ============================================
-- This script deletes ALL data from ALL tables EXCEPT:
--   - cities
--   - users
--   - industries
--   - sub_industries
--   - states
-- 
-- Tables are NOT deleted, only data is cleared
-- ============================================

-- Disable triggers to avoid foreign key issues
SET session_replication_role = 'replica';

-- ============================================
-- DELETE DATA FROM ALL TABLES
-- ============================================
-- Delete in order to respect foreign key constraints

DO $$
BEGIN
    RAISE NOTICE 'Starting data deletion...';
    RAISE NOTICE '';
    
    -- Delete from junction/relationship tables first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_customer') THEN
        DELETE FROM employee_customer;
        RAISE NOTICE '✅ Deleted: employee_customer';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_streaks') THEN
        DELETE FROM employee_streaks;
        RAISE NOTICE '✅ Deleted: employee_streaks';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_notifications') THEN
        DELETE FROM employee_notifications;
        RAISE NOTICE '✅ Deleted: employee_notifications';
    END IF;
    
    -- Delete from activity/engagement tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        DELETE FROM activities;
        RAISE NOTICE '✅ Deleted: activities';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'engagement_history') THEN
        DELETE FROM engagement_history;
        RAISE NOTICE '✅ Deleted: engagement_history';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'logout_reasons') THEN
        DELETE FROM logout_reasons;
        RAISE NOTICE '✅ Deleted: logout_reasons';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_activities') THEN
        DELETE FROM lead_activities;
        RAISE NOTICE '✅ Deleted: lead_activities';
    END IF;
    
    -- Delete from notification tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        DELETE FROM notifications;
        RAISE NOTICE '✅ Deleted: notifications';
    END IF;
    
    -- Delete from task tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        DELETE FROM tasks;
        RAISE NOTICE '✅ Deleted: tasks';
    END IF;
    
    -- Delete from lead tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        DELETE FROM leads;
        RAISE NOTICE '✅ Deleted: leads';
    END IF;
    
    -- Delete from contact tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        DELETE FROM contacts;
        RAISE NOTICE '✅ Deleted: contacts';
    END IF;
    
    -- Delete from quotation tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
        DELETE FROM quotes_mbcb;
        RAISE NOTICE '✅ Deleted: quotes_mbcb';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
        DELETE FROM quotes_signages;
        RAISE NOTICE '✅ Deleted: quotes_signages';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
        DELETE FROM quotes_paint;
        RAISE NOTICE '✅ Deleted: quotes_paint';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merged_quotations') THEN
        DELETE FROM merged_quotations;
        RAISE NOTICE '✅ Deleted: merged_quotations';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') THEN
        DELETE FROM quotes;
        RAISE NOTICE '✅ Deleted: quotes';
    END IF;
    
    -- Delete from AI/analytics tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_queries') THEN
        DELETE FROM ai_queries;
        RAISE NOTICE '✅ Deleted: ai_queries';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_coaching_reports') THEN
        DELETE FROM ai_coaching_reports;
        RAISE NOTICE '✅ Deleted: ai_coaching_reports';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_weekly_insights') THEN
        DELETE FROM ai_weekly_insights;
        RAISE NOTICE '✅ Deleted: ai_weekly_insights';
    END IF;
    
    -- Delete from account tables (sub_accounts before accounts due to FK)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        DELETE FROM sub_accounts;
        RAISE NOTICE '✅ Deleted: sub_accounts';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        DELETE FROM accounts;
        RAISE NOTICE '✅ Deleted: accounts';
    END IF;
    
    -- Delete from customer tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
        DELETE FROM customers;
        RAISE NOTICE '✅ Deleted: customers';
    END IF;
    
    -- Delete from reference/lookup tables (except protected ones)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'places_of_supply') THEN
        DELETE FROM places_of_supply;
        RAISE NOTICE '✅ Deleted: places_of_supply';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purposes') THEN
        DELETE FROM purposes;
        RAISE NOTICE '✅ Deleted: purposes';
    END IF;
    
    -- Reset estimate counter
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimate_counter') THEN
        UPDATE estimate_counter SET current_number = 0, updated_at = NOW() WHERE id = 1;
        RAISE NOTICE '✅ Reset: estimate_counter (next PDF will be YNM/EST-1)';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Data deletion complete!';
END $$;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'PROTECTED TABLES (data preserved):' as info;
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL SELECT 'states', COUNT(*) FROM states
UNION ALL SELECT 'cities', COUNT(*) FROM cities
UNION ALL SELECT 'industries', COUNT(*) FROM industries
UNION ALL SELECT 'sub_industries', COUNT(*) FROM sub_industries;

SELECT '' as separator;
SELECT 'DELETED TABLES (should be 0):' as info;
SELECT 'accounts' as table_name, COUNT(*) as row_count FROM accounts
UNION ALL SELECT 'sub_accounts', COUNT(*) FROM sub_accounts
UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL SELECT 'quotes_mbcb', COUNT(*) FROM quotes_mbcb
UNION ALL SELECT 'quotes_signages', COUNT(*) FROM quotes_signages
UNION ALL SELECT 'quotes_paint', COUNT(*) FROM quotes_paint
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'leads', COUNT(*) FROM leads
UNION ALL SELECT 'activities', COUNT(*) FROM activities
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ALL DATA DELETED SUCCESSFULLY!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Protected tables (data preserved):';
    RAISE NOTICE '  ✅ users';
    RAISE NOTICE '  ✅ states';
    RAISE NOTICE '  ✅ cities';
    RAISE NOTICE '  ✅ industries';
    RAISE NOTICE '  ✅ sub_industries';
    RAISE NOTICE '';
    RAISE NOTICE 'All other tables have been cleared.';
    RAISE NOTICE 'Estimate counter reset to 0 (next PDF: YNM/EST-1)';
    RAISE NOTICE '============================================';
END $$;

