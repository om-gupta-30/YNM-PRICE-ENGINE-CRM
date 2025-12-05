-- ============================================
-- RESET ALL ID SEQUENCES (Without Deleting Data)
-- ============================================
-- This script resets all ID sequences to start from the appropriate value:
-- - If table is empty: sequence starts from 1
-- - If table has data: sequence continues from max(id) + 1
-- Also resets estimate_counter for PDF generation (YNM/EST-1)
-- 
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: RESET ESTIMATE COUNTER FOR PDF GENERATION
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimate_counter') THEN
        -- Reset the counter to 0 so next PDF will be YNM/EST-1
        UPDATE estimate_counter SET current_number = 0, updated_at = NOW() WHERE id = 1;
        RAISE NOTICE '✅ Estimate counter reset - next PDF will be YNM/EST-1';
    ELSE
        RAISE NOTICE '⚠️ estimate_counter table does not exist';
    END IF;
END $$;

-- ============================================
-- STEP 2: RESET ALL ID SEQUENCES
-- ============================================
-- This function safely resets a sequence based on table contents
CREATE OR REPLACE FUNCTION reset_sequence_safe(
    p_table_name TEXT,
    p_id_column TEXT,
    p_sequence_name TEXT
) RETURNS TEXT AS $$
DECLARE
    max_id INTEGER;
    row_count INTEGER;
    result_msg TEXT;
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = p_table_name
    ) THEN
        RETURN format('⚠️  Table %s does not exist', p_table_name);
    END IF;
    
    -- Check if sequence exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences WHERE sequencename = p_sequence_name
    ) THEN
        RETURN format('⚠️  Sequence %s does not exist', p_sequence_name);
    END IF;
    
    -- Get max ID and count
    EXECUTE format('SELECT COALESCE(MAX(%I), 0), COUNT(*) FROM %I', p_id_column, p_table_name)
    INTO max_id, row_count;
    
    IF row_count = 0 THEN
        -- Table is empty, reset to 1
        PERFORM setval(p_sequence_name, 1, false);
        result_msg := format('✅ %s: Empty table, sequence reset to start at 1', p_table_name);
    ELSE
        -- Table has data, set sequence to max_id (so next will be max_id + 1)
        PERFORM setval(p_sequence_name, max_id, true);
        result_msg := format('✅ %s: %s rows, max_id=%s, next will be %s', 
            p_table_name, row_count, max_id, max_id + 1);
    END IF;
    
    RETURN result_msg;
EXCEPTION WHEN OTHERS THEN
    RETURN format('❌ %s: Error - %s', p_table_name, SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: RESET ALL TABLE SEQUENCES
-- ============================================
DO $$
DECLARE
    result TEXT;
    tables_to_reset TEXT[][] := ARRAY[
        -- Quote tables
        ['quotes_mbcb', 'id', 'quotes_mbcb_id_seq'],
        ['quotes_signages', 'id', 'quotes_signages_id_seq'],
        ['quotes_paint', 'id', 'quotes_paint_id_seq'],
        ['merged_quotations', 'id', 'merged_quotations_id_seq'],
        ['quotes', 'id', 'quotes_id_seq'],
        
        -- CRM tables
        ['accounts', 'id', 'accounts_id_seq'],
        ['sub_accounts', 'id', 'sub_accounts_id_seq'],
        ['contacts', 'id', 'contacts_id_seq'],
        ['tasks', 'id', 'tasks_id_seq'],
        ['leads', 'id', 'leads_id_seq'],
        ['activities', 'id', 'activities_id_seq'],
        ['notifications', 'id', 'notifications_id_seq'],
        
        -- User tables
        ['users', 'id', 'users_id_seq'],
        ['logout_reasons', 'id', 'logout_reasons_id_seq'],
        
        -- Reference tables
        ['industries', 'id', 'industries_id_seq'],
        ['sub_industries', 'id', 'sub_industries_id_seq'],
        ['states', 'id', 'states_id_seq'],
        ['cities', 'id', 'cities_id_seq'],
        ['customers', 'id', 'customers_id_seq'],
        ['places_of_supply', 'id', 'places_of_supply_id_seq'],
        ['purposes', 'id', 'purposes_id_seq'],
        
        -- Activity/engagement tables
        ['employee_customer', 'id', 'employee_customer_id_seq'],
        ['employee_streaks', 'id', 'employee_streaks_id_seq'],
        ['employee_notifications', 'id', 'employee_notifications_id_seq'],
        ['engagement_history', 'id', 'engagement_history_id_seq'],
        ['lead_activities', 'id', 'lead_activities_id_seq'],
        
        -- AI tables
        ['ai_queries', 'id', 'ai_queries_id_seq'],
        ['ai_coaching_reports', 'id', 'ai_coaching_reports_id_seq'],
        ['ai_weekly_insights', 'id', 'ai_weekly_insights_id_seq']
    ];
    table_info TEXT[];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'RESETTING ALL ID SEQUENCES...';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    
    FOREACH table_info SLICE 1 IN ARRAY tables_to_reset
    LOOP
        SELECT reset_sequence_safe(table_info[1], table_info[2], table_info[3]) INTO result;
        RAISE NOTICE '%', result;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ALL SEQUENCES RESET SUCCESSFULLY!';
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- STEP 4: VERIFICATION - Check current state
-- ============================================
SELECT 
    'quotes_mbcb' as table_name,
    COALESCE(MIN(id), 0) as min_id,
    COALESCE(MAX(id), 0) as max_id,
    COUNT(*) as row_count
FROM quotes_mbcb
UNION ALL
SELECT 'quotes_signages', COALESCE(MIN(id), 0), COALESCE(MAX(id), 0), COUNT(*) FROM quotes_signages
UNION ALL
SELECT 'quotes_paint', COALESCE(MIN(id), 0), COALESCE(MAX(id), 0), COUNT(*) FROM quotes_paint
UNION ALL
SELECT 'accounts', COALESCE(MIN(id), 0), COALESCE(MAX(id), 0), COUNT(*) FROM accounts
UNION ALL
SELECT 'sub_accounts', COALESCE(MIN(id), 0), COALESCE(MAX(id), 0), COUNT(*) FROM sub_accounts
UNION ALL
SELECT 'contacts', COALESCE(MIN(id), 0), COALESCE(MAX(id), 0), COUNT(*) FROM contacts
UNION ALL
SELECT 'tasks', COALESCE(MIN(id), 0), COALESCE(MAX(id), 0), COUNT(*) FROM tasks
UNION ALL
SELECT 'leads', COALESCE(MIN(id), 0), COALESCE(MAX(id), 0), COUNT(*) FROM leads
UNION ALL
SELECT 'activities', COALESCE(MIN(id), 0), COALESCE(MAX(id), 0), COUNT(*) FROM activities
UNION ALL
SELECT 'notifications', COALESCE(MIN(id), 0), COALESCE(MAX(id), 0), COUNT(*) FROM notifications
UNION ALL
SELECT 'users', COALESCE(MIN(id), 0), COALESCE(MAX(id), 0), COUNT(*) FROM users
ORDER BY table_name;

-- Check estimate counter
SELECT 'Estimate Counter Status:' as info;
SELECT * FROM estimate_counter;

-- ============================================
-- CLEANUP: Remove helper function (optional)
-- ============================================
DROP FUNCTION IF EXISTS reset_sequence_safe(TEXT, TEXT, TEXT);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ID SEQUENCE RESET COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next IDs will start from:';
    RAISE NOTICE '  - Empty tables: ID 1';
    RAISE NOTICE '  - Tables with data: max(id) + 1';
    RAISE NOTICE '  - PDF Estimate: YNM/EST-1';
    RAISE NOTICE '============================================';
END $$;

