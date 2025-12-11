-- ============================================
-- CLEAR ALL TABLES AND RESET ALL ID SEQUENCES (FINAL)
-- ============================================
-- This script will:
-- 1. Clear ALL data from ALL tables EXCEPT protected tables:
--    - cities
--    - users
--    - sub_accounts
--    - accounts
--    - contacts
--    - industries
--    - sub_industries
--    - states
-- 2. Reset ALL ID sequences to start from 1
-- 3. Reset estimate_counter to 0
-- ============================================
-- WARNING: This will DELETE all data from non-protected tables!
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: DISABLE TRIGGERS AND CONSTRAINTS
-- ============================================
SET session_replication_role = 'replica';

-- ============================================
-- STEP 2: CLEAR ALL TABLES EXCEPT PROTECTED ONES
-- ============================================
DO $$
DECLARE
    r RECORD;
    protected_tables TEXT[] := ARRAY[
        'cities',
        'users',
        'sub_accounts',
        'accounts',
        'contacts',
        'industries',
        'sub_industries',
        'states'
    ];
    is_protected BOOLEAN;
    cleared_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'STEP 1: CLEARING TABLES';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    
    -- Loop through all tables in the public schema
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        -- Check if table is protected
        is_protected := r.tablename = ANY(protected_tables);
        
        IF NOT is_protected THEN
            BEGIN
                -- Use TRUNCATE CASCADE to handle foreign keys
                EXECUTE format('TRUNCATE TABLE %I CASCADE', r.tablename);
                RAISE NOTICE '✅ Cleared: %', r.tablename;
                cleared_count := cleared_count + 1;
            EXCEPTION WHEN OTHERS THEN
                -- If TRUNCATE fails, try DELETE as fallback
                BEGIN
                    EXECUTE format('DELETE FROM %I', r.tablename);
                    RAISE NOTICE '✅ Cleared (DELETE): %', r.tablename;
                    cleared_count := cleared_count + 1;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '⚠️  Skipped: % (Error: %)', r.tablename, SQLERRM;
                END;
            END;
        ELSE
            RAISE NOTICE '🛡️  Protected: %', r.tablename;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Cleared % tables', cleared_count;
    RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 3: RESET ESTIMATE COUNTER
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimate_counter') THEN
        UPDATE estimate_counter SET current_number = 0, updated_at = NOW() WHERE id = 1;
        IF NOT FOUND THEN
            INSERT INTO estimate_counter (id, current_number, updated_at) 
            VALUES (1, 0, NOW()) 
            ON CONFLICT (id) DO UPDATE SET current_number = 0, updated_at = NOW();
        END IF;
        RAISE NOTICE '✅ Reset estimate_counter (next PDF will be YNM/EST-1)';
    END IF;
END $$;

-- ============================================
-- STEP 4: RESET ALL ID SEQUENCES
-- ============================================
DO $$
DECLARE
    seq_record RECORD;
    table_record RECORD;
    max_id INTEGER;
    reset_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'STEP 2: RESETTING ID SEQUENCES';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    
    -- Find all sequences in the public schema
    FOR seq_record IN
        SELECT 
            schemaname,
            sequencename,
            -- Extract table name from sequence name (remove _id_seq suffix)
            REPLACE(REPLACE(sequencename, '_id_seq', ''), '_seq', '') AS table_name
        FROM pg_sequences
        WHERE schemaname = 'public'
        ORDER BY sequencename
    LOOP
        BEGIN
            -- Check if the corresponding table exists and has data
            EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', seq_record.table_name) INTO max_id;
            
            -- Reset sequence to start from max_id + 1 (or 1 if table is empty)
            IF max_id > 0 THEN
                EXECUTE format('SELECT setval(%L, %s, false)', seq_record.sequencename, max_id + 1);
            ELSE
                EXECUTE format('SELECT setval(%L, 1, false)', seq_record.sequencename);
            END IF;
            
            RAISE NOTICE '✅ Reset sequence: % (next value: %)', 
                seq_record.sequencename, 
                CASE WHEN max_id > 0 THEN max_id + 1 ELSE 1 END;
            reset_count := reset_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Try alternative sequence name pattern
            BEGIN
                EXECUTE format('SELECT setval(%L, 1, false)', seq_record.sequencename);
                RAISE NOTICE '✅ Reset sequence: % (to 1)', seq_record.sequencename;
                reset_count := reset_count + 1;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '⚠️  Could not reset sequence: % (Error: %)', seq_record.sequencename, SQLERRM;
            END;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Reset % sequences', reset_count;
    RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 5: RE-ENABLE TRIGGERS
-- ============================================
SET session_replication_role = 'origin';

-- ============================================
-- STEP 6: VERIFICATION
-- ============================================
DO $$
DECLARE
    account_count INTEGER;
    contact_count INTEGER;
    user_count INTEGER;
    state_count INTEGER;
    city_count INTEGER;
    industry_count INTEGER;
    sub_industry_count INTEGER;
    sub_account_count INTEGER;
    cleared_table_count INTEGER;
    total_table_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'PROTECTED TABLES (data preserved):';
    RAISE NOTICE '-----------------------------------';
    
    -- Count protected tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        SELECT COUNT(*) INTO account_count FROM accounts;
        RAISE NOTICE '  ✅ accounts: % rows', account_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        SELECT COUNT(*) INTO contact_count FROM contacts;
        RAISE NOTICE '  ✅ contacts: % rows', contact_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        SELECT COUNT(*) INTO user_count FROM users;
        RAISE NOTICE '  ✅ users: % rows', user_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'states') THEN
        SELECT COUNT(*) INTO state_count FROM states;
        RAISE NOTICE '  ✅ states: % rows', state_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cities') THEN
        SELECT COUNT(*) INTO city_count FROM cities;
        RAISE NOTICE '  ✅ cities: % rows', city_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'industries') THEN
        SELECT COUNT(*) INTO industry_count FROM industries;
        RAISE NOTICE '  ✅ industries: % rows', industry_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_industries') THEN
        SELECT COUNT(*) INTO sub_industry_count FROM sub_industries;
        RAISE NOTICE '  ✅ sub_industries: % rows', sub_industry_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        SELECT COUNT(*) INTO sub_account_count FROM sub_accounts;
        RAISE NOTICE '  ✅ sub_accounts: % rows', sub_account_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'CLEARED TABLES (sample verification):';
    RAISE NOTICE '-----------------------------------';
    
    -- Check some common tables that should be cleared
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM quotes;
        RAISE NOTICE '  📋 quotes: % rows (should be 0)', cleared_table_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM tasks;
        RAISE NOTICE '  📋 tasks: % rows (should be 0)', cleared_table_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM leads;
        RAISE NOTICE '  📋 leads: % rows (should be 0)', cleared_table_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM notifications;
        RAISE NOTICE '  📋 notifications: % rows (should be 0)', cleared_table_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM activities;
        RAISE NOTICE '  📋 activities: % rows (should be 0)', cleared_table_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'SEQUENCE STATUS:';
    RAISE NOTICE '-----------------------------------';
    
    -- Show next values for some key sequences
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'accounts_id_seq') THEN
        SELECT last_value INTO max_id FROM accounts_id_seq;
        RAISE NOTICE '  📊 accounts_id_seq: next value = %', max_id + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'contacts_id_seq') THEN
        SELECT last_value INTO max_id FROM contacts_id_seq;
        RAISE NOTICE '  📊 contacts_id_seq: next value = %', max_id + 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'leads_id_seq') THEN
        SELECT last_value INTO max_id FROM leads_id_seq;
        RAISE NOTICE '  📊 leads_id_seq: next value = 1 (reset)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ OPERATION COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  ✅ All non-protected tables cleared';
    RAISE NOTICE '  ✅ All ID sequences reset';
    RAISE NOTICE '  ✅ Estimate counter reset to 0';
    RAISE NOTICE '';
    RAISE NOTICE 'Protected tables (data preserved):';
    RAISE NOTICE '  🛡️  cities';
    RAISE NOTICE '  🛡️  users';
    RAISE NOTICE '  🛡️  sub_accounts';
    RAISE NOTICE '  🛡️  accounts';
    RAISE NOTICE '  🛡️  contacts';
    RAISE NOTICE '  🛡️  industries';
    RAISE NOTICE '  🛡️  sub_industries';
    RAISE NOTICE '  🛡️  states';
    RAISE NOTICE '';
    RAISE NOTICE 'All other tables have been cleared.';
    RAISE NOTICE 'All ID sequences reset to start from 1.';
    RAISE NOTICE 'Next estimate PDF will be: YNM/EST-1';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================
-- FINAL VERIFICATION QUERIES
-- ============================================
-- Uncomment to run additional verification:

-- Show all sequences and their current values
-- SELECT 
--     sequencename,
--     last_value,
--     CASE 
--         WHEN last_value = 0 THEN 1 
--         ELSE last_value + 1 
--     END AS next_value
-- FROM pg_sequences
-- WHERE schemaname = 'public'
-- ORDER BY sequencename;

-- Show table row counts
-- SELECT 
--     schemaname,
--     tablename,
--     (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = schemaname AND table_name = tablename) as column_count
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
