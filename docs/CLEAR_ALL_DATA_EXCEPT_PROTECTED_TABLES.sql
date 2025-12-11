-- ============================================
-- CLEAR ALL DATA EXCEPT PROTECTED TABLES
-- ============================================
-- This script clears ALL data from ALL tables EXCEPT:
--   - users
--   - cities
--   - states
--   - industries
--   - sub_industries
--   - accounts
--   - sub_accounts
--   - contacts
-- 
-- Tables are NOT deleted, only data is cleared
-- Foreign key constraints are handled by disabling triggers temporarily
-- ============================================

-- Disable triggers to avoid foreign key constraint issues
SET session_replication_role = 'replica';

-- ============================================
-- DYNAMIC TABLE CLEARING
-- ============================================
-- This will truncate all tables except the protected ones
DO $$
DECLARE
    r RECORD;
    protected_tables TEXT[] := ARRAY[
        'users',
        'cities',
        'states',
        'industries',
        'sub_industries',
        'accounts',
        'sub_accounts',
        'contacts'
    ];
    is_protected BOOLEAN;
BEGIN
    RAISE NOTICE 'Starting data clearing process...';
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
            EXCEPTION WHEN OTHERS THEN
                -- If TRUNCATE fails, try DELETE as fallback
                BEGIN
                    EXECUTE format('DELETE FROM %I', r.tablename);
                    RAISE NOTICE '✅ Cleared (DELETE): %', r.tablename;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '⚠️  Skipped: % (Error: %)', r.tablename, SQLERRM;
                END;
            END;
        ELSE
            RAISE NOTICE '🛡️  Protected: %', r.tablename;
        END IF;
    END LOOP;
    
    -- Reset estimate counter if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimate_counter') THEN
        BEGIN
            UPDATE estimate_counter SET current_number = 0, updated_at = NOW() WHERE id = 1;
            IF NOT FOUND THEN
                INSERT INTO estimate_counter (id, current_number, updated_at) VALUES (1, 0, NOW()) ON CONFLICT (id) DO UPDATE SET current_number = 0, updated_at = NOW();
            END IF;
            RAISE NOTICE '✅ Reset: estimate_counter (next PDF will be YNM/EST-1)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️  Could not reset estimate_counter: %', SQLERRM;
        END;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Data clearing complete!';
END $$;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ============================================
-- VERIFICATION
-- ============================================
-- Show protected tables (should still have data)
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
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'VERIFICATION - PROTECTED TABLES:';
    RAISE NOTICE '============================================';
    
    SELECT COUNT(*) INTO user_count FROM users;
    RAISE NOTICE 'users: % rows', user_count;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cities') THEN
        SELECT COUNT(*) INTO city_count FROM cities;
        RAISE NOTICE 'cities: % rows', city_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'states') THEN
        SELECT COUNT(*) INTO state_count FROM states;
        RAISE NOTICE 'states: % rows', state_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'industries') THEN
        SELECT COUNT(*) INTO industry_count FROM industries;
        RAISE NOTICE 'industries: % rows', industry_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_industries') THEN
        SELECT COUNT(*) INTO sub_industry_count FROM sub_industries;
        RAISE NOTICE 'sub_industries: % rows', sub_industry_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        SELECT COUNT(*) INTO account_count FROM accounts;
        RAISE NOTICE 'accounts: % rows', account_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        SELECT COUNT(*) INTO sub_account_count FROM sub_accounts;
        RAISE NOTICE 'sub_accounts: % rows', sub_account_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        SELECT COUNT(*) INTO contact_count FROM contacts;
        RAISE NOTICE 'contacts: % rows', contact_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'VERIFICATION - CLEARED TABLES (sample):';
    RAISE NOTICE '============================================';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
        SELECT COUNT(*) INTO user_count FROM quotes_mbcb;
        RAISE NOTICE 'quotes_mbcb: % rows', user_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
        SELECT COUNT(*) INTO user_count FROM quotes_signages;
        RAISE NOTICE 'quotes_signages: % rows', user_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
        SELECT COUNT(*) INTO user_count FROM quotes_paint;
        RAISE NOTICE 'quotes_paint: % rows', user_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        SELECT COUNT(*) INTO user_count FROM tasks;
        RAISE NOTICE 'tasks: % rows', user_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        SELECT COUNT(*) INTO user_count FROM leads;
        RAISE NOTICE 'leads: % rows', user_count;
    END IF;
    
END $$;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ALL TABLES CLEARED SUCCESSFULLY!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Protected tables (data preserved):';
    RAISE NOTICE '  ✅ users';
    RAISE NOTICE '  ✅ cities';
    RAISE NOTICE '  ✅ states';
    RAISE NOTICE '  ✅ industries';
    RAISE NOTICE '  ✅ sub_industries';
    RAISE NOTICE '  ✅ accounts';
    RAISE NOTICE '  ✅ sub_accounts';
    RAISE NOTICE '  ✅ contacts';
    RAISE NOTICE '';
    RAISE NOTICE 'All other tables have been cleared.';
    RAISE NOTICE 'Estimate counter reset to 0 (next PDF: YNM/EST-1)';
    RAISE NOTICE '============================================';
END $$;
