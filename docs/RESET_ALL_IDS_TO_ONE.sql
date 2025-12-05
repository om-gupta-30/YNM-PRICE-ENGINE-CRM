-- ============================================
-- RESET ALL ID SEQUENCES TO START FROM 1
-- ============================================
-- This script resets all ID sequences to start from 1
-- Also resets estimate_counter so next PDF will be YNM/EST-1
-- 
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: RESET ESTIMATE COUNTER
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimate_counter') THEN
        UPDATE estimate_counter SET current_number = 0, updated_at = NOW() WHERE id = 1;
        RAISE NOTICE '✅ Estimate counter reset - next PDF will be YNM/EST-1';
    ELSE
        RAISE NOTICE '⚠️ estimate_counter table does not exist';
    END IF;
END $$;

-- ============================================
-- STEP 2: RESET ALL ID SEQUENCES TO 1
-- ============================================
-- This function safely resets a sequence to start from 1
CREATE OR REPLACE FUNCTION reset_sequence_to_one(
    p_sequence_name TEXT
) RETURNS TEXT AS $$
DECLARE
    result_msg TEXT;
BEGIN
    -- Check if sequence exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences WHERE sequencename = p_sequence_name
    ) THEN
        RETURN format('⚠️  Sequence %s does not exist', p_sequence_name);
    END IF;
    
    -- Reset sequence to 1 (false means next value will be 1)
    PERFORM setval(p_sequence_name, 1, false);
    
    RETURN format('✅ %s reset to start at 1', p_sequence_name);
EXCEPTION WHEN OTHERS THEN
    RETURN format('❌ %s: Error - %s', p_sequence_name, SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: RESET ALL TABLE SEQUENCES
-- ============================================
DO $$
DECLARE
    result TEXT;
    sequences_to_reset TEXT[] := ARRAY[
        -- Quote tables
        'quotes_mbcb_id_seq',
        'quotes_signages_id_seq',
        'quotes_paint_id_seq',
        'merged_quotations_id_seq',
        'quotes_id_seq',
        
        -- CRM tables
        'accounts_id_seq',
        'sub_accounts_id_seq',
        'contacts_id_seq',
        'tasks_id_seq',
        'leads_id_seq',
        'activities_id_seq',
        'notifications_id_seq',
        
        -- User tables
        'users_id_seq',
        'logout_reasons_id_seq',
        
        -- Reference tables
        'industries_id_seq',
        'sub_industries_id_seq',
        'states_id_seq',
        'cities_id_seq',
        'customers_id_seq',
        'places_of_supply_id_seq',
        'purposes_id_seq',
        
        -- Activity/engagement tables
        'employee_customer_id_seq',
        'employee_streaks_id_seq',
        'employee_notifications_id_seq',
        'engagement_history_id_seq',
        'lead_activities_id_seq',
        
        -- AI tables
        'ai_queries_id_seq',
        'ai_coaching_reports_id_seq',
        'ai_weekly_insights_id_seq'
    ];
    seq_name TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'RESETTING ALL ID SEQUENCES TO START FROM 1';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    
    FOREACH seq_name IN ARRAY sequences_to_reset
    LOOP
        SELECT reset_sequence_to_one(seq_name) INTO result;
        RAISE NOTICE '%', result;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ALL SEQUENCES RESET TO START FROM 1';
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- STEP 4: VERIFICATION
-- ============================================
-- Check current sequence values (should all be 1)
SELECT 
    schemaname,
    sequencename,
    last_value as current_value,
    CASE 
        WHEN last_value = 1 THEN '✅ Reset to 1'
        ELSE '⚠️ Not reset'
    END as status
FROM pg_sequences
WHERE sequencename IN (
    'quotes_mbcb_id_seq',
    'quotes_signages_id_seq',
    'quotes_paint_id_seq',
    'accounts_id_seq',
    'sub_accounts_id_seq',
    'contacts_id_seq',
    'estimate_counter'
)
ORDER BY sequencename;

-- Check estimate counter
SELECT 'Estimate Counter Status:' as info;
SELECT 
    id,
    prefix,
    current_number,
    CASE 
        WHEN current_number = 0 THEN '✅ Next PDF will be YNM/EST-1'
        ELSE '⚠️ Not reset'
    END as status
FROM estimate_counter
WHERE id = 1;

-- ============================================
-- STEP 5: VERIFY NEXT IDS WILL BE 1
-- ============================================
-- This query shows what the next ID will be for each table
SELECT 
    'accounts' as table_name,
    nextval('accounts_id_seq') as next_id
UNION ALL
SELECT 'sub_accounts', nextval('sub_accounts_id_seq')
UNION ALL
SELECT 'contacts', nextval('contacts_id_seq')
UNION ALL
SELECT 'quotes_mbcb', nextval('quotes_mbcb_id_seq')
UNION ALL
SELECT 'quotes_signages', nextval('quotes_signages_id_seq')
UNION ALL
SELECT 'quotes_paint', nextval('quotes_paint_id_seq');

-- Reset them back to 1 after checking
SELECT setval('accounts_id_seq', 1, false);
SELECT setval('sub_accounts_id_seq', 1, false);
SELECT setval('contacts_id_seq', 1, false);
SELECT setval('quotes_mbcb_id_seq', 1, false);
SELECT setval('quotes_signages_id_seq', 1, false);
SELECT setval('quotes_paint_id_seq', 1, false);

-- ============================================
-- CLEANUP: Remove helper function (optional)
-- ============================================
DROP FUNCTION IF EXISTS reset_sequence_to_one(TEXT);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ID SEQUENCE RESET COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'All ID sequences reset to start from 1';
    RAISE NOTICE 'Estimate counter reset - next PDF: YNM/EST-1';
    RAISE NOTICE '============================================';
END $$;

