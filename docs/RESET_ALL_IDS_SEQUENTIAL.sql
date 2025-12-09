-- ============================================================================
-- RESET ALL ID FIELDS TO SEQUENTIAL (1, 2, 3, ...)
-- ============================================================================
-- This script resets all ID fields in all tables to be sequential starting from 1
-- It uses a safe two-phase approach to avoid ID conflicts during the update
--
-- ⚠️ WARNING: This will renumber ALL IDs in all tables!
-- Make sure you have a backup before running this script.
--
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Normalize table IDs
-- ============================================================================
CREATE OR REPLACE FUNCTION normalize_table_ids_safe(
    table_name TEXT,
    id_column TEXT,
    sequence_name TEXT
)
RETURNS TABLE(rows_updated INTEGER, last_id INTEGER) AS $$
DECLARE
    row_count INTEGER;
    max_id INTEGER;
    temp_id INTEGER;
    new_id INTEGER;
    rec RECORD;
    update_count INTEGER := 0;
BEGIN
    -- Get row count
    EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO row_count;
    
    -- If table is empty, reset sequence and return
    IF row_count = 0 THEN
        EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', sequence_name);
        RETURN QUERY SELECT 0, 0;
        RETURN;
    END IF;
    
    -- Step 1: Set all IDs to negative temporary values (to avoid conflicts)
    temp_id := -1000000;
    FOR rec IN EXECUTE format('SELECT %I FROM %I ORDER BY %I ASC', id_column, table_name, id_column)
    LOOP
        EXECUTE format('UPDATE %I SET %I = $1 WHERE %I = $2', 
            table_name, id_column, id_column) 
        USING temp_id, rec.id;
        temp_id := temp_id - 1;
    END LOOP;
    
    -- Step 2: Set all IDs to sequential values (1, 2, 3, ...)
    new_id := 1;
    temp_id := -1000000;
    FOR rec IN EXECUTE format('SELECT %I FROM %I ORDER BY %I ASC', id_column, table_name, id_column)
    LOOP
        EXECUTE format('UPDATE %I SET %I = $1 WHERE %I = $2', 
            table_name, id_column, id_column) 
        USING new_id, temp_id;
        update_count := update_count + 1;
        new_id := new_id + 1;
        temp_id := temp_id - 1;
    END LOOP;
    
    -- Step 3: Reset sequence to point to the last ID
    EXECUTE format('SELECT setval(%L, $1, false)', sequence_name) USING row_count;
    
    RETURN QUERY SELECT update_count, row_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- NORMALIZE ALL TABLES
-- ============================================================================

DO $$
DECLARE
    result RECORD;
    tables_to_normalize TEXT[][] := ARRAY[
        ['quotes_mbcb', 'id', 'quotes_mbcb_id_seq'],
        ['quotes_signages', 'id', 'quotes_signages_id_seq'],
        ['quotes_paint', 'id', 'quotes_paint_id_seq'],
        ['accounts', 'id', 'accounts_id_seq'],
        ['sub_accounts', 'id', 'sub_accounts_id_seq'],
        ['contacts', 'id', 'contacts_id_seq'],
        ['tasks', 'id', 'tasks_id_seq'],
        ['leads', 'id', 'leads_id_seq'],
        ['notifications', 'id', 'notifications_id_seq'],
        ['activities', 'id', 'activities_id_seq'],
        ['logout_reasons', 'id', 'logout_reasons_id_seq'],
        ['users', 'id', 'users_id_seq']
    ];
    table_info TEXT[];
    tbl_name TEXT;
    id_col TEXT;
    seq_name TEXT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting ID normalization for all tables...';
    RAISE NOTICE '========================================';
    
    FOREACH table_info SLICE 1 IN ARRAY tables_to_normalize
    LOOP
        tbl_name := table_info[1];
        id_col := table_info[2];
        seq_name := table_info[3];
        
        -- Check if table exists (use explicit schema qualification to avoid ambiguity)
        IF EXISTS (
            SELECT 1 FROM information_schema.tables t
            WHERE t.table_schema = 'public' AND t.table_name = tbl_name
        ) THEN
            -- Check if sequence exists
            IF EXISTS (
                SELECT 1 FROM pg_class WHERE relname = seq_name
            ) THEN
                BEGIN
                    -- Normalize the table
                    SELECT * INTO result FROM normalize_table_ids_safe(
                        tbl_name, 
                        id_col, 
                        seq_name
                    );
                    
                    RAISE NOTICE '✅ %: Normalized % rows, last ID = %', 
                        tbl_name, result.rows_updated, result.last_id;
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING '❌ Error normalizing %: %', tbl_name, SQLERRM;
                END;
            ELSE
                RAISE WARNING '⚠️  Sequence % does not exist for table %', seq_name, tbl_name;
            END IF;
        ELSE
            RAISE WARNING '⚠️  Table % does not exist, skipping...', tbl_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ID normalization completed!';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check ID ranges for all tables
SELECT 
    'quotes_mbcb' as table_name,
    COALESCE(MIN(id), 0) as min_id,
    COALESCE(MAX(id), 0) as max_id,
    COUNT(*) as row_count
FROM quotes_mbcb
UNION ALL
SELECT 
    'quotes_signages',
    COALESCE(MIN(id), 0),
    COALESCE(MAX(id), 0),
    COUNT(*)
FROM quotes_signages
UNION ALL
SELECT 
    'quotes_paint',
    COALESCE(MIN(id), 0),
    COALESCE(MAX(id), 0),
    COUNT(*)
FROM quotes_paint
UNION ALL
SELECT 
    'accounts',
    COALESCE(MIN(id), 0),
    COALESCE(MAX(id), 0),
    COUNT(*)
FROM accounts
UNION ALL
SELECT 
    'sub_accounts',
    COALESCE(MIN(id), 0),
    COALESCE(MAX(id), 0),
    COUNT(*)
FROM sub_accounts
UNION ALL
SELECT 
    'contacts',
    COALESCE(MIN(id), 0),
    COALESCE(MAX(id), 0),
    COUNT(*)
FROM contacts
UNION ALL
SELECT 
    'tasks',
    COALESCE(MIN(id), 0),
    COALESCE(MAX(id), 0),
    COUNT(*)
FROM tasks
UNION ALL
SELECT 
    'leads',
    COALESCE(MIN(id), 0),
    COALESCE(MAX(id), 0),
    COUNT(*)
FROM leads
UNION ALL
SELECT 
    'notifications',
    COALESCE(MIN(id), 0),
    COALESCE(MAX(id), 0),
    COUNT(*)
FROM notifications
UNION ALL
SELECT 
    'activities',
    COALESCE(MIN(id), 0),
    COALESCE(MAX(id), 0),
    COUNT(*)
FROM activities
UNION ALL
SELECT 
    'logout_reasons',
    COALESCE(MIN(id), 0),
    COALESCE(MAX(id), 0),
    COUNT(*)
FROM logout_reasons
UNION ALL
SELECT 
    'users',
    COALESCE(MIN(id), 0),
    COALESCE(MAX(id), 0),
    COUNT(*)
FROM users
ORDER BY table_name;

-- ============================================================================
-- CHECK FOR GAPS IN ID SEQUENCES
-- ============================================================================

-- This query will show if there are any gaps (should show 0 rows if normalized correctly)
-- Run this after normalization to verify

-- Example for one table (you can run similar queries for other tables):
-- SELECT id, 
--        id - LAG(id, 1, 0) OVER (ORDER BY id) as gap
-- FROM accounts
-- WHERE id - LAG(id, 1, 0) OVER (ORDER BY id) > 1
-- ORDER BY id;

-- ============================================================================
-- CLEANUP: DROP HELPER FUNCTION (optional)
-- ============================================================================

-- Uncomment the line below if you want to remove the helper function after use
-- DROP FUNCTION IF EXISTS normalize_table_ids_safe(TEXT, TEXT, TEXT);

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================










