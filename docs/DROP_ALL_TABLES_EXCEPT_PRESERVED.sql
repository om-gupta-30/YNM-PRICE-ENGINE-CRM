-- ============================================
-- DROP ALL TABLES EXCEPT STATES, CITIES, USERS, INDUSTRIES, AND SUB_INDUSTRIES
-- ============================================
-- This script DROPS (deletes) all tables except:
--   - users (keeps user accounts)
--   - states (keeps state data)
--   - cities (keeps city data)
--   - industries (keeps industry data)
--   - sub_industries (keeps sub-industry data)
--
-- WARNING: This will permanently DELETE all tables and their data!
-- Use this script only for complete database reset.
-- Make sure to backup your data before running this!
-- ============================================

BEGIN;

-- ============================================
-- DROP TABLES IN REVERSE DEPENDENCY ORDER
-- ============================================
-- We drop child tables first, then parent tables
-- This avoids foreign key constraint violations

DO $$
BEGIN
    RAISE NOTICE 'Starting table deletion...';
    
    -- ============================================
    -- 1. DROP JUNCTION/RELATIONSHIP TABLES
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_customer') THEN
        DROP TABLE IF EXISTS employee_customer CASCADE;
        RAISE NOTICE '✓ Dropped employee_customer';
    END IF;
    
    -- ============================================
    -- 2. DROP ACTIVITY TRACKING TABLES
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'logout_reasons') THEN
        DROP TABLE IF EXISTS logout_reasons CASCADE;
        RAISE NOTICE '✓ Dropped logout_reasons';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        DROP TABLE IF EXISTS activity_logs CASCADE;
        RAISE NOTICE '✓ Dropped activity_logs';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
        DROP TABLE IF EXISTS activities CASCADE;
        RAISE NOTICE '✓ Dropped activities';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_activities') THEN
        DROP TABLE IF EXISTS lead_activities CASCADE;
        RAISE NOTICE '✓ Dropped lead_activities';
    END IF;
    
    -- ============================================
    -- 3. DROP NOTIFICATIONS TABLE
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DROP TABLE IF EXISTS notifications CASCADE;
        RAISE NOTICE '✓ Dropped notifications';
    END IF;
    
    -- ============================================
    -- 4. DROP QUOTATION TABLES
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_mbcb') THEN
        DROP TABLE IF EXISTS quotes_mbcb CASCADE;
        RAISE NOTICE '✓ Dropped quotes_mbcb';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_signages') THEN
        DROP TABLE IF EXISTS quotes_signages CASCADE;
        RAISE NOTICE '✓ Dropped quotes_signages';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_paint') THEN
        DROP TABLE IF EXISTS quotes_paint CASCADE;
        RAISE NOTICE '✓ Dropped quotes_paint';
    END IF;
    
    -- ============================================
    -- 5. DROP CONTACTS TABLE
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        DROP TABLE IF EXISTS contacts CASCADE;
        RAISE NOTICE '✓ Dropped contacts';
    END IF;
    
    -- ============================================
    -- 6. DROP TASKS TABLE
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        DROP TABLE IF EXISTS tasks CASCADE;
        RAISE NOTICE '✓ Dropped tasks';
    END IF;
    
    -- ============================================
    -- 7. DROP LEADS TABLE
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        DROP TABLE IF EXISTS leads CASCADE;
        RAISE NOTICE '✓ Dropped leads';
    END IF;
    
    -- ============================================
    -- 8. DROP SUB_ACCOUNTS TABLE
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sub_accounts') THEN
        DROP TABLE IF EXISTS sub_accounts CASCADE;
        RAISE NOTICE '✓ Dropped sub_accounts';
    END IF;
    
    -- ============================================
    -- 9. DROP ACCOUNTS TABLE
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
        DROP TABLE IF EXISTS accounts CASCADE;
        RAISE NOTICE '✓ Dropped accounts';
    END IF;
    
    -- ============================================
    -- 10. DROP REFERENCE TABLES
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        DROP TABLE IF EXISTS customers CASCADE;
        RAISE NOTICE '✓ Dropped customers';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'places_of_supply') THEN
        DROP TABLE IF EXISTS places_of_supply CASCADE;
        RAISE NOTICE '✓ Dropped places_of_supply';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purposes') THEN
        DROP TABLE IF EXISTS purposes CASCADE;
        RAISE NOTICE '✓ Dropped purposes';
    END IF;
    
    -- NOTE: industries and sub_industries are NOT dropped - they are preserved
    
    -- ============================================
    -- 11. DROP AI/ENGAGEMENT TABLES
    -- ============================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagement_ai_state') THEN
        DROP TABLE IF EXISTS engagement_ai_state CASCADE;
        RAISE NOTICE '✓ Dropped engagement_ai_state';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagement_suggestions') THEN
        DROP TABLE IF EXISTS engagement_suggestions CASCADE;
        RAISE NOTICE '✓ Dropped engagement_suggestions';
    END IF;
    
    RAISE NOTICE 'Table deletion completed successfully!';
END $$;

-- ============================================
-- RESET SEQUENCES FOR PRESERVED TABLES
-- ============================================
-- Reset sequences to start from 1 for preserved tables
-- Note: Only tables with SERIAL columns have sequences

DO $$
DECLARE
    seq_record RECORD;
BEGIN
    RAISE NOTICE 'Resetting sequences for preserved tables...';
    
    -- Reset users sequence if it exists
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'users_id_seq') THEN
        ALTER SEQUENCE users_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset users_id_seq';
    END IF;
    
    -- Reset states sequence if it exists
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'states_id_seq') THEN
        ALTER SEQUENCE states_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset states_id_seq';
    END IF;
    
    -- Reset cities sequence if it exists
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'cities_id_seq') THEN
        ALTER SEQUENCE cities_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset cities_id_seq';
    END IF;
    
    -- Reset industries sequence if it exists
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'industries_id_seq') THEN
        ALTER SEQUENCE industries_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset industries_id_seq';
    END IF;
    
    -- Reset sub_industries sequence if it exists
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'sub_industries_id_seq') THEN
        ALTER SEQUENCE sub_industries_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset sub_industries_id_seq';
    END IF;
    
    RAISE NOTICE 'Sequence reset completed!';
END $$;

-- ============================================
-- DROP ORPHANED SEQUENCES
-- ============================================
-- Drop sequences that belonged to deleted tables
-- (PostgreSQL doesn't automatically drop sequences when tables are dropped)

DO $$
DECLARE
    seq_record RECORD;
    preserved_sequences TEXT[] := ARRAY[
        'users_id_seq',
        'states_id_seq', 
        'cities_id_seq',
        'industries_id_seq',
        'sub_industries_id_seq'
    ];
BEGIN
    RAISE NOTICE 'Cleaning up orphaned sequences...';
    
    FOR seq_record IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        -- Only drop sequences that are not preserved
        IF NOT (seq_record.sequence_name = ANY(preserved_sequences)) THEN
            BEGIN
                EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(seq_record.sequence_name) || ' CASCADE';
                RAISE NOTICE '✓ Dropped sequence: %', seq_record.sequence_name;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE '⚠ Could not drop sequence %: %', seq_record.sequence_name, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Sequence cleanup completed!';
END $$;

-- ============================================
-- DROP ORPHANED TYPES/ENUMS
-- ============================================
-- Drop enum types that are no longer needed
-- (Only if they're not used by preserved tables)

DO $$
BEGIN
    RAISE NOTICE 'Cleaning up orphaned types...';
    
    -- Drop enum types that might have been used by deleted tables
    -- Note: Be careful - only drop if they're truly not needed
    
    -- company_stage_enum - might be used by accounts (which we dropped)
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_stage_enum') THEN
        BEGIN
            DROP TYPE IF EXISTS company_stage_enum CASCADE;
            RAISE NOTICE '✓ Dropped company_stage_enum';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠ Could not drop company_stage_enum: %', SQLERRM;
        END;
    END IF;
    
    -- company_tag_enum - might be used by accounts (which we dropped)
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_tag_enum') THEN
        BEGIN
            DROP TYPE IF EXISTS company_tag_enum CASCADE;
            RAISE NOTICE '✓ Dropped company_tag_enum';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠ Could not drop company_tag_enum: %', SQLERRM;
        END;
    END IF;
    
    -- call_status_enum - might be used by contacts (which we dropped)
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_status_enum') THEN
        BEGIN
            DROP TYPE IF EXISTS call_status_enum CASCADE;
            RAISE NOTICE '✓ Dropped call_status_enum';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠ Could not drop call_status_enum: %', SQLERRM;
        END;
    END IF;
    
    -- activity_type_enum - might be used by activities (which we dropped)
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type_enum') THEN
        BEGIN
            DROP TYPE IF EXISTS activity_type_enum CASCADE;
            RAISE NOTICE '✓ Dropped activity_type_enum';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠ Could not drop activity_type_enum: %', SQLERRM;
        END;
    END IF;
    
    -- notification_type_enum - might be used by notifications (which we dropped)
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum') THEN
        BEGIN
            DROP TYPE IF EXISTS notification_type_enum CASCADE;
            RAISE NOTICE '✓ Dropped notification_type_enum';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠ Could not drop notification_type_enum: %', SQLERRM;
        END;
    END IF;
    
    RAISE NOTICE 'Type cleanup completed!';
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify the deletion:

DO $$
DECLARE
    table_record RECORD;
    preserved_tables TEXT[] := ARRAY['users', 'states', 'cities', 'industries', 'sub_industries'];
    preserved_count INTEGER;
    total_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION: Remaining tables';
    RAISE NOTICE '========================================';
    
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        IF table_record.table_name = ANY(preserved_tables) THEN
            RAISE NOTICE '%: PRESERVED ✓', RPAD(table_record.table_name, 30);
        ELSE
            RAISE NOTICE '%: STILL EXISTS! ✗', RPAD(table_record.table_name, 30);
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    
    -- Count preserved tables
    SELECT COUNT(*) INTO preserved_count
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name = ANY(preserved_tables);
    
    RAISE NOTICE 'Preserved tables count: %', preserved_count;
    
    -- Count remaining tables (should only be preserved ones)
    SELECT COUNT(*) INTO total_count
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE 'Total remaining tables: %', total_count;
    
    IF total_count = array_length(preserved_tables, 1) THEN
        RAISE NOTICE '✓ All non-preserved tables have been dropped!';
    ELSE
        RAISE NOTICE '⚠ Some tables may still exist. Check the list above.';
    END IF;
END $$;

-- ============================================
-- VERIFY PRESERVED TABLES STILL HAVE DATA
-- ============================================

DO $$
DECLARE
    users_count INTEGER := 0;
    states_count INTEGER := 0;
    cities_count INTEGER := 0;
    industries_count INTEGER := 0;
    sub_industries_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PRESERVED DATA CHECK';
    RAISE NOTICE '========================================';
    
    -- Check users
    BEGIN
        SELECT COUNT(*) INTO users_count FROM users;
        IF users_count > 0 THEN
            RAISE NOTICE 'users: % rows preserved ✓', users_count;
        ELSE
            RAISE NOTICE 'users: NO DATA FOUND! ✗';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'users: Table does not exist or error: %', SQLERRM;
    END;
    
    -- Check states
    BEGIN
        SELECT COUNT(*) INTO states_count FROM states;
        IF states_count > 0 THEN
            RAISE NOTICE 'states: % rows preserved ✓', states_count;
        ELSE
            RAISE NOTICE 'states: NO DATA FOUND! ✗';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'states: Table does not exist or error: %', SQLERRM;
    END;
    
    -- Check cities
    BEGIN
        SELECT COUNT(*) INTO cities_count FROM cities;
        IF cities_count > 0 THEN
            RAISE NOTICE 'cities: % rows preserved ✓', cities_count;
        ELSE
            RAISE NOTICE 'cities: NO DATA FOUND! ✗';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'cities: Table does not exist or error: %', SQLERRM;
    END;
    
    -- Check industries
    BEGIN
        SELECT COUNT(*) INTO industries_count FROM industries;
        IF industries_count > 0 THEN
            RAISE NOTICE 'industries: % rows preserved ✓', industries_count;
        ELSE
            RAISE NOTICE 'industries: NO DATA FOUND! ✗';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'industries: Table does not exist or error: %', SQLERRM;
    END;
    
    -- Check sub_industries
    BEGIN
        SELECT COUNT(*) INTO sub_industries_count FROM sub_industries;
        IF sub_industries_count > 0 THEN
            RAISE NOTICE 'sub_industries: % rows preserved ✓', sub_industries_count;
        ELSE
            RAISE NOTICE 'sub_industries: NO DATA FOUND! ✗';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'sub_industries: Table does not exist or error: %', SQLERRM;
    END;
    
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- After running this script:
--   - All tables should be dropped EXCEPT: users, states, cities, industries, sub_industries
--   - Sequences for preserved tables should be reset to 1
--   - Orphaned sequences should be dropped
--   - Orphaned enum types should be dropped
--   - Preserved tables should still contain their data
-- ============================================
