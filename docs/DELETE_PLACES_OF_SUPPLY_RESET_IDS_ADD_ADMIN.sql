-- ============================================================================
-- DELETE PLACES_OF_SUPPLY TABLE AND RESET ALL ID SEQUENCES
-- ============================================================================
-- This script:
-- 1. Drops the places_of_supply table and its indexes
-- 2. Resets all ID sequences to 1 for all tables
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
    sequence_record RECORD;
BEGIN
    -- ============================================================================
    -- STEP 1: DROP PLACES_OF_SUPPLY TABLE
    -- ============================================================================
    RAISE NOTICE 'Step 1: Dropping places_of_supply table...';
    
    -- Drop indexes first
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'places_of_supply') THEN
        DROP INDEX IF EXISTS idx_places_of_supply_name;
        DROP INDEX IF EXISTS idx_places_name;
        RAISE NOTICE '✓ Dropped indexes for places_of_supply';
    END IF;
    
    -- Drop the table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'places_of_supply') THEN
        DROP TABLE IF EXISTS places_of_supply CASCADE;
        RAISE NOTICE '✓ Dropped places_of_supply table';
    ELSE
        RAISE NOTICE 'ℹ places_of_supply table does not exist, skipping';
    END IF;

    -- ============================================================================
    -- STEP 2: RESET ALL ID SEQUENCES TO 1
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'Step 2: Resetting all ID sequences to 1...';
    
    -- Reset all sequences found in pg_sequences
    FOR sequence_record IN
        SELECT 
            schemaname,
            sequencename
        FROM pg_sequences
        WHERE schemaname = 'public'
        ORDER BY sequencename
    LOOP
        BEGIN
            -- Reset sequence to 1
            EXECUTE format('ALTER SEQUENCE %I.%I RESTART WITH 1', sequence_record.schemaname, sequence_record.sequencename);
            RAISE NOTICE '✓ Reset sequence %', sequence_record.sequencename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠ Could not reset sequence %: %', sequence_record.sequencename, SQLERRM;
        END;
    END LOOP;

    -- Also manually reset known sequences (in case they're not in pg_sequences or to ensure they're reset)
    DECLARE
        known_sequences TEXT[] := ARRAY[
            'quotes_mbcb_id_seq',
            'quotes_signages_id_seq',
            'quotes_paint_id_seq',
            'accounts_id_seq',
            'sub_accounts_id_seq',
            'contacts_id_seq',
            'tasks_id_seq',
            'leads_id_seq',
            'notifications_id_seq',
            'activities_id_seq',
            'users_id_seq',
            'states_id_seq',
            'cities_id_seq',
            'industries_id_seq',
            'sub_industries_id_seq'
        ];
        seq_name TEXT;
    BEGIN
        FOREACH seq_name IN ARRAY known_sequences
        LOOP
            BEGIN
                EXECUTE format('ALTER SEQUENCE IF EXISTS %I RESTART WITH 1', seq_name);
                -- Only log if it actually exists and was reset
                IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = seq_name) THEN
                    RAISE NOTICE '✓ Reset sequence %', seq_name;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Sequence might not exist, which is fine - don't log
                NULL;
            END;
        END LOOP;
    END;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ SCRIPT COMPLETED SUCCESSFULLY';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - places_of_supply table: DROPPED';
    RAISE NOTICE '  - All ID sequences: RESET TO 1';
    RAISE NOTICE '============================================================================';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE;
END $$;


-- List all sequences that were reset
SELECT 
    schemaname,
    sequencename,
    last_value,
    start_value
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;
