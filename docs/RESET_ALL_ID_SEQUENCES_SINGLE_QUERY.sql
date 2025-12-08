-- ============================================
-- RESET ALL ID SEQUENCES - SINGLE QUERY
-- ============================================
-- This single SQL query resets all ID sequences in all tables:
-- - Empty tables: sequence starts from 1
-- - Tables with data: sequence continues from max(id) + 1
-- 
-- Run this in your Supabase SQL Editor
-- ============================================

DO $$
DECLARE
    table_rec RECORD;
    max_id_val INTEGER;
    row_count_val INTEGER;
    sequence_name TEXT;
    sql_query TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'RESETTING ALL ID SEQUENCES...';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    
    -- Loop through all tables in the public schema that have an 'id' column
    FOR table_rec IN
        SELECT 
            t.table_name,
            c.column_name,
            CASE 
                WHEN c.column_default LIKE 'nextval%' THEN
                    -- Extract sequence name from default value
                    SUBSTRING(
                        c.column_default 
                        FROM 'nextval\(''([^'']+)''::regclass\)'
                    )
                ELSE
                    -- Try to construct sequence name (standard pattern: tablename_columnname_seq)
                    t.table_name || '_' || c.column_name || '_seq'
            END as seq_name
        FROM information_schema.tables t
        INNER JOIN information_schema.columns c 
            ON t.table_name = c.table_name 
            AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
            AND c.column_name = 'id'
            AND c.data_type IN ('integer', 'bigint', 'smallint')
        ORDER BY t.table_name
    LOOP
        BEGIN
            -- Check if sequence exists
            IF EXISTS (
                SELECT 1 FROM pg_sequences 
                WHERE sequencename = table_rec.seq_name
            ) THEN
                -- Get max ID and row count
                sql_query := format('SELECT COALESCE(MAX(%I), 0), COUNT(*) FROM %I', 
                    table_rec.column_name, table_rec.table_name);
                EXECUTE sql_query INTO max_id_val, row_count_val;
                
                IF row_count_val = 0 THEN
                    -- Table is empty, reset sequence to start at 1
                    PERFORM setval(table_rec.seq_name, 1, false);
                    RAISE NOTICE '✅ %: Empty table, sequence reset to start at 1', table_rec.table_name;
                ELSE
                    -- Table has data, set sequence to max_id (so next will be max_id + 1)
                    PERFORM setval(table_rec.seq_name, max_id_val, true);
                    RAISE NOTICE '✅ %: % rows, max_id=%s, next will be %s', 
                        table_rec.table_name, row_count_val, max_id_val, max_id_val + 1;
                END IF;
            ELSE
                -- Try alternative sequence name pattern
                sequence_name := table_rec.table_name || '_id_seq';
                IF EXISTS (
                    SELECT 1 FROM pg_sequences 
                    WHERE sequencename = sequence_name
                ) THEN
                    sql_query := format('SELECT COALESCE(MAX(%I), 0), COUNT(*) FROM %I', 
                        table_rec.column_name, table_rec.table_name);
                    EXECUTE sql_query INTO max_id_val, row_count_val;
                    
                    IF row_count_val = 0 THEN
                        PERFORM setval(sequence_name, 1, false);
                        RAISE NOTICE '✅ %: Empty table, sequence reset to start at 1', table_rec.table_name;
                    ELSE
                        PERFORM setval(sequence_name, max_id_val, true);
                        RAISE NOTICE '✅ %: % rows, max_id=%s, next will be %s', 
                            table_rec.table_name, row_count_val, max_id_val, max_id_val + 1;
                    END IF;
                ELSE
                    RAISE NOTICE '⚠️  %: No sequence found (might use UUID or manual IDs)', table_rec.table_name;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ %: Error - %', table_rec.table_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ALL ID SEQUENCES RESET SUCCESSFULLY!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next IDs will be:';
    RAISE NOTICE '  - Empty tables: ID 1';
    RAISE NOTICE '  - Tables with data: max(id) + 1';
    RAISE NOTICE '============================================';
END $$;




