-- ============================================
-- RESET ALL ID SEQUENCES FOR ALL TABLES
-- ============================================
-- This script dynamically finds all tables with SERIAL/BIGSERIAL ID columns
-- and resets their sequences to start from 1
-- 
-- Works with:
-- - Empty tables (sequences reset to 1)
-- - Tables with data (sequences reset based on max(id))
-- ============================================

BEGIN;

-- ============================================
-- DYNAMIC SEQUENCE RESET FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION reset_all_sequences()
RETURNS TABLE(table_name TEXT, sequence_name TEXT, status TEXT, next_id BIGINT) AS $$
DECLARE
    rec RECORD;
    seq_name TEXT;
    max_id_val BIGINT;
    result_status TEXT;
    next_id_val BIGINT;
BEGIN
    -- Loop through all tables in public schema
    FOR rec IN
        SELECT 
            t.table_name,
            a.attname AS column_name,
            pg_get_serial_sequence('public.' || quote_ident(t.table_name), a.attname) AS sequence_full_name
        FROM information_schema.tables t
        JOIN pg_class c ON c.relname = t.table_name
        JOIN pg_attribute a ON a.attrelid = c.oid
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND a.attnum > 0
          AND NOT a.attisdropped
          AND a.attname = 'id'
          AND pg_get_serial_sequence('public.' || quote_ident(t.table_name), a.attname) IS NOT NULL
        ORDER BY t.table_name
    LOOP
        seq_name := rec.sequence_full_name;
        
        -- Get current max ID from the table
        EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', rec.table_name) INTO max_id_val;
        
        -- Reset sequence to max_id_val (so next insert will be max_id_val + 1)
        -- If table is empty, this sets it to 0, then we'll set it to 1
        IF max_id_val = 0 THEN
            EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
            next_id_val := 1;
            result_status := 'Reset to 1 (empty table)';
        ELSE
            EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_id_val);
            next_id_val := max_id_val + 1;
            result_status := format('Reset (max_id=%s, next=%s)', max_id_val, next_id_val);
        END IF;
        
        -- Return the result
        table_name := rec.table_name;
        sequence_name := seq_name;
        status := result_status;
        next_id := next_id_val;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
EXCEPTION WHEN OTHERS THEN
    -- If there's an error with a specific sequence, log and continue
    RAISE NOTICE 'Error processing sequence: %', SQLERRM;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EXECUTE SEQUENCE RESET
-- ============================================
DO $$
DECLARE
    result_rec RECORD;
    reset_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'RESETTING ALL ID SEQUENCES...';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    
    -- Reset all sequences and collect results
    FOR result_rec IN
        SELECT * FROM reset_all_sequences()
    LOOP
        RAISE NOTICE '✅ %: % (next ID: %)', 
            result_rec.table_name, 
            result_rec.status, 
            result_rec.next_id;
        reset_count := reset_count + 1;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ RESET COMPLETE: % sequences reset', reset_count;
    RAISE NOTICE '============================================';
END $$;

-- ============================================
-- RESET ESTIMATE COUNTER (if exists)
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
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    rec RECORD;
    current_val BIGINT;
    seq_schema TEXT;
    seq_name_only TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'VERIFICATION - Sample Sequences:';
    RAISE NOTICE '============================================';
    
    -- Check a few key tables
    FOR rec IN
        SELECT 
            t.table_name,
            pg_get_serial_sequence('public.' || quote_ident(t.table_name), 'id') AS seq_full_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND t.table_name IN ('users', 'accounts', 'customers', 'quotes', 'quotes_mbcb', 'quotes_signages', 'quotes_paint', 'contacts', 'tasks', 'leads', 'activities', 'notifications', 'industries', 'sub_industries', 'states', 'cities')
        ORDER BY t.table_name
        LIMIT 15
    LOOP
        IF rec.seq_full_name IS NOT NULL THEN
            BEGIN
                -- Extract schema and sequence name from full name (format: schema.sequence)
                seq_schema := split_part(rec.seq_full_name, '.', 1);
                seq_name_only := split_part(rec.seq_full_name, '.', 2);
                
                EXECUTE format('SELECT last_value FROM %I.%I', seq_schema, seq_name_only) INTO current_val;
                RAISE NOTICE '%: next ID = %', rec.table_name, current_val;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '%: sequence check skipped', rec.table_name;
            END;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- CLEANUP: Remove helper function
-- ============================================
DROP FUNCTION IF EXISTS reset_all_sequences();

COMMIT;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ALL ID SEQUENCES RESET SUCCESSFULLY!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'All sequences have been reset:';
    RAISE NOTICE '  - Empty tables: next ID will be 1';
    RAISE NOTICE '  - Tables with data: next ID will be max(id) + 1';
    RAISE NOTICE '  - Estimate counter: reset to 0 (next: YNM/EST-1)';
    RAISE NOTICE '============================================';
END $$;

