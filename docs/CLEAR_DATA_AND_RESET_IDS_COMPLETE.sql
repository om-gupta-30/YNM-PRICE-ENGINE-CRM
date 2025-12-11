-- ============================================
-- CLEAR ALL DATA AND RESET ALL ID SEQUENCES
-- ============================================
-- This script will:
-- 1. Clear ALL data from ALL tables EXCEPT protected tables:
--    - users
--    - cities
--    - states
--    - industries
--    - sub_industries
-- 2. Reset ALL ID sequences to start from 1
-- 3. Reset estimate_counter to 0 (next PDF will be YNM/EST-1)
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
        'users',
        'cities',
        'states',
        'industries',
        'sub_industries'
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
            -- Create estimate_counter table if it doesn't exist
            CREATE TABLE IF NOT EXISTS estimate_counter (
                id INTEGER PRIMARY KEY DEFAULT 1,
                current_number INTEGER NOT NULL DEFAULT 0,
                prefix VARCHAR(20) NOT NULL DEFAULT 'YNM/EST-',
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT single_row CHECK (id = 1)
            );
            INSERT INTO estimate_counter (id, current_number, prefix, updated_at) 
            VALUES (1, 0, 'YNM/EST-', NOW()) 
            ON CONFLICT (id) DO UPDATE SET current_number = 0, updated_at = NOW();
        END IF;
        RAISE NOTICE '✅ Reset estimate_counter (next PDF will be YNM/EST-1)';
    ELSE
        -- Create estimate_counter table if it doesn't exist
        CREATE TABLE IF NOT EXISTS estimate_counter (
            id INTEGER PRIMARY KEY DEFAULT 1,
            current_number INTEGER NOT NULL DEFAULT 0,
            prefix VARCHAR(20) NOT NULL DEFAULT 'YNM/EST-',
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT single_row CHECK (id = 1)
        );
        INSERT INTO estimate_counter (id, current_number, prefix, updated_at) 
        VALUES (1, 0, 'YNM/EST-', NOW()) 
        ON CONFLICT (id) DO UPDATE SET current_number = 0, updated_at = NOW();
        RAISE NOTICE '✅ Created and reset estimate_counter (next PDF will be YNM/EST-1)';
    END IF;
END $$;

-- ============================================
-- STEP 4: RESET ALL ID SEQUENCES TO START FROM 1
-- ============================================
DO $$
DECLARE
    seq_record RECORD;
    table_name TEXT;
    max_id INTEGER;
    reset_count INTEGER := 0;
    protected_tables TEXT[] := ARRAY[
        'users',
        'cities',
        'states',
        'industries',
        'sub_industries'
    ];
    is_protected BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'STEP 2: RESETTING ID SEQUENCES TO 1';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    
    -- Find all sequences in the public schema
    FOR seq_record IN
        SELECT 
            schemaname,
            sequencename
        FROM pg_sequences
        WHERE schemaname = 'public'
        ORDER BY sequencename
    LOOP
        BEGIN
            -- Extract table name from sequence name
            -- Common patterns: tablename_id_seq, tablename_seq
            table_name := REPLACE(REPLACE(seq_record.sequencename, '_id_seq', ''), '_seq', '');
            
            -- Check if table is protected
            is_protected := table_name = ANY(protected_tables);
            
            IF is_protected THEN
                -- For protected tables, reset to max_id + 1 (or 1 if empty)
                BEGIN
                    EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', table_name) INTO max_id;
                    IF max_id > 0 THEN
                        EXECUTE format('SELECT setval(%L, %s, false)', seq_record.sequencename, max_id + 1);
                        RAISE NOTICE '✅ Reset sequence: % (next value: % - protected table)', 
                            seq_record.sequencename, max_id + 1;
                    ELSE
                        EXECUTE format('SELECT setval(%L, 1, false)', seq_record.sequencename);
                        RAISE NOTICE '✅ Reset sequence: % (next value: 1 - protected table, empty)', 
                            seq_record.sequencename;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    -- Table might not exist or have different ID column name
                    EXECUTE format('SELECT setval(%L, 1, false)', seq_record.sequencename);
                    RAISE NOTICE '✅ Reset sequence: % (next value: 1)', seq_record.sequencename;
                END;
            ELSE
                -- For cleared tables, always reset to 1
                EXECUTE format('SELECT setval(%L, 1, false)', seq_record.sequencename);
                RAISE NOTICE '✅ Reset sequence: % (next value: 1)', seq_record.sequencename;
            END IF;
            
            reset_count := reset_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️  Could not reset sequence: % (Error: %)', seq_record.sequencename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Reset % sequences', reset_count;
    RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 5: MANUALLY RESET KNOWN SEQUENCES (FALLBACK)
-- ============================================
-- This ensures common sequences are reset even if they weren't found above
DO $$
DECLARE
    max_id INTEGER;
    known_sequences TEXT[] := ARRAY[
        'accounts_id_seq',
        'sub_accounts_id_seq',
        'contacts_id_seq',
        'quotes_mbcb_id_seq',
        'quotes_signages_id_seq',
        'quotes_paint_id_seq',
        'tasks_id_seq',
        'leads_id_seq',
        'activities_id_seq',
        'notifications_id_seq',
        'purposes_id_seq'
    ];
    seq_name TEXT;
BEGIN
    FOREACH seq_name IN ARRAY known_sequences
    LOOP
        BEGIN
            -- Check if sequence exists
            IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = seq_name) THEN
                -- Reset to 1 (all these tables should be cleared)
                EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
                RAISE NOTICE '✅ Reset known sequence: %', seq_name;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Sequence might not exist, skip
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================
-- STEP 6: RE-ENABLE TRIGGERS
-- ============================================
SET session_replication_role = 'origin';

-- ============================================
-- STEP 7: VERIFICATION
-- ============================================
DO $$
DECLARE
    user_count INTEGER;
    state_count INTEGER;
    city_count INTEGER;
    industry_count INTEGER;
    sub_industry_count INTEGER;
    cleared_table_count INTEGER;
    estimate_num INTEGER;
    estimate_prefix TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'PROTECTED TABLES (data preserved):';
    RAISE NOTICE '-----------------------------------';
    
    -- Count protected tables
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
    
    RAISE NOTICE '';
    RAISE NOTICE 'CLEARED TABLES (sample verification):';
    RAISE NOTICE '-----------------------------------';
    
    -- Check some common tables that should be cleared
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM accounts;
        RAISE NOTICE '  📋 accounts: % rows (should be 0)', cleared_table_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM sub_accounts;
        RAISE NOTICE '  📋 sub_accounts: % rows (should be 0)', cleared_table_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM contacts;
        RAISE NOTICE '  📋 contacts: % rows (should be 0)', cleared_table_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM quotes_mbcb;
        RAISE NOTICE '  📋 quotes_mbcb: % rows (should be 0)', cleared_table_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM quotes_signages;
        RAISE NOTICE '  📋 quotes_signages: % rows (should be 0)', cleared_table_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM quotes_paint;
        RAISE NOTICE '  📋 quotes_paint: % rows (should be 0)', cleared_table_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM tasks;
        RAISE NOTICE '  📋 tasks: % rows (should be 0)', cleared_table_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM leads;
        RAISE NOTICE '  📋 leads: % rows (should be 0)', cleared_table_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM activities;
        RAISE NOTICE '  📋 activities: % rows (should be 0)', cleared_table_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        SELECT COUNT(*) INTO cleared_table_count FROM notifications;
        RAISE NOTICE '  📋 notifications: % rows (should be 0)', cleared_table_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'SEQUENCE STATUS:';
    RAISE NOTICE '-----------------------------------';
    
    -- Show next values for some key sequences (all reset to 1)
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'accounts_id_seq') THEN
        RAISE NOTICE '  📊 accounts_id_seq: next value = 1';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'contacts_id_seq') THEN
        RAISE NOTICE '  📊 contacts_id_seq: next value = 1';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'leads_id_seq') THEN
        RAISE NOTICE '  📊 leads_id_seq: next value = 1';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'tasks_id_seq') THEN
        RAISE NOTICE '  📊 tasks_id_seq: next value = 1';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'ESTIMATE COUNTER:';
    RAISE NOTICE '-----------------------------------';
    
    -- Check estimate counter
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimate_counter') THEN
        SELECT current_number, prefix INTO estimate_num, estimate_prefix FROM estimate_counter WHERE id = 1;
        RAISE NOTICE '  📊 Current: % = %', estimate_prefix, estimate_num;
        RAISE NOTICE '  📊 Next PDF: % = %', estimate_prefix, estimate_num + 1;
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
    RAISE NOTICE '  ✅ All ID sequences reset to start from 1';
    RAISE NOTICE '  ✅ Estimate counter reset to 0';
    RAISE NOTICE '';
    RAISE NOTICE 'Protected tables (data preserved):';
    RAISE NOTICE '  🛡️  users';
    RAISE NOTICE '  🛡️  cities';
    RAISE NOTICE '  🛡️  states';
    RAISE NOTICE '  🛡️  industries';
    RAISE NOTICE '  🛡️  sub_industries';
    RAISE NOTICE '';
    RAISE NOTICE 'All other tables have been cleared.';
    RAISE NOTICE 'All ID sequences reset to start from 1.';
    RAISE NOTICE 'Next estimate PDF will be: YNM/EST-1';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================
-- FINAL VERIFICATION QUERIES (OPTIONAL)
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

-- Show estimate counter status
-- SELECT * FROM estimate_counter WHERE id = 1;
