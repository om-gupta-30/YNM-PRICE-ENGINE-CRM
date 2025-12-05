-- ============================================
-- RESET ALL ID SEQUENCES TO START FROM 1
-- ============================================
-- This script resets all ID sequences to start from 1
-- Also resets estimate_counter so next PDF will be YNM/EST-1
-- 
-- Since all data is deleted, sequences can be safely reset to 1
-- ============================================

-- ============================================
-- STEP 1: RESET ESTIMATE COUNTER
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimate_counter') THEN
        UPDATE estimate_counter SET current_number = 0, updated_at = NOW() WHERE id = 1;
        RAISE NOTICE '✅ Estimate counter reset - next PDF will be YNM/EST-1';
    END IF;
END $$;

-- ============================================
-- STEP 2: RESET ALL ID SEQUENCES TO 1
-- ============================================
-- Reset sequences for all tables (false means next value will be 1)

DO $$
DECLARE
    sequences TEXT[] := ARRAY[
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
    result TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'RESETTING ALL ID SEQUENCES TO START FROM 1';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    
    FOREACH seq_name IN ARRAY sequences
    LOOP
        BEGIN
            -- Check if sequence exists
            IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = seq_name) THEN
                -- Reset to 1 (false means next value will be 1)
                PERFORM setval(seq_name, 1, false);
                RAISE NOTICE '✅ % reset to start at 1', seq_name;
            ELSE
                RAISE NOTICE '⚠️  Sequence % does not exist, skipping', seq_name;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Error resetting %: %', seq_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ALL SEQUENCES RESET TO START FROM 1';
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- STEP 3: VERIFICATION
-- ============================================
-- Check sequence values (should all show last_value = 1)
SELECT 
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
-- STEP 4: TEST NEXT IDS (should all be 1)
-- ============================================
-- This will show what the next ID will be for each table
-- Note: This actually increments the sequences, so we reset them again after

DO $$
DECLARE
    next_account_id INTEGER;
    next_sub_account_id INTEGER;
    next_contact_id INTEGER;
    next_quote_mbcb_id INTEGER;
    next_quote_signages_id INTEGER;
    next_quote_paint_id INTEGER;
BEGIN
    -- Get next values
    next_account_id := nextval('accounts_id_seq');
    next_sub_account_id := nextval('sub_accounts_id_seq');
    next_contact_id := nextval('contacts_id_seq');
    next_quote_mbcb_id := nextval('quotes_mbcb_id_seq');
    next_quote_signages_id := nextval('quotes_signages_id_seq');
    next_quote_paint_id := nextval('quotes_paint_id_seq');
    
    RAISE NOTICE '';
    RAISE NOTICE 'Next IDs will be:';
    RAISE NOTICE '  accounts: %', next_account_id;
    RAISE NOTICE '  sub_accounts: %', next_sub_account_id;
    RAISE NOTICE '  contacts: %', next_contact_id;
    RAISE NOTICE '  quotes_mbcb: %', next_quote_mbcb_id;
    RAISE NOTICE '  quotes_signages: %', next_quote_signages_id;
    RAISE NOTICE '  quotes_paint: %', next_quote_paint_id;
    
    -- Reset them back to 1 (since we just incremented them)
    PERFORM setval('accounts_id_seq', 1, false);
    PERFORM setval('sub_accounts_id_seq', 1, false);
    PERFORM setval('contacts_id_seq', 1, false);
    PERFORM setval('quotes_mbcb_id_seq', 1, false);
    PERFORM setval('quotes_signages_id_seq', 1, false);
    PERFORM setval('quotes_paint_id_seq', 1, false);
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Sequences reset back to 1 after test';
END $$;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ALL SEQUENCES RESET COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'All ID sequences reset to start from 1';
    RAISE NOTICE 'Estimate counter reset - next PDF: YNM/EST-1';
    RAISE NOTICE '';
    RAISE NOTICE 'Next records will have IDs starting from 1';
    RAISE NOTICE 'Next PDF estimate number will be YNM/EST-1';
    RAISE NOTICE '============================================';
END $$;

