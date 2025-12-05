-- ============================================
-- FIX NEGATIVE IDs IN SUB_ACCOUNTS TABLE
-- ============================================
-- This script fixes negative IDs in sub_accounts table
-- and updates all foreign key references
-- ============================================

-- Disable triggers temporarily to avoid foreign key issues
SET session_replication_role = 'replica';

-- ============================================
-- STEP 1: Create a mapping of old (negative) IDs to new (positive) IDs
-- ============================================
CREATE TEMP TABLE id_mapping AS
SELECT 
    id as old_id,
    ROW_NUMBER() OVER (ORDER BY id DESC) as new_id  -- Negative IDs ordered DESC gives us proper sequence
FROM sub_accounts
WHERE id < 0;

-- ============================================
-- STEP 2: Update foreign key references in all related tables
-- ============================================

-- Update contacts table
UPDATE contacts c
SET sub_account_id = m.new_id
FROM id_mapping m
WHERE c.sub_account_id = m.old_id;

-- Update quotes_mbcb table
UPDATE quotes_mbcb q
SET sub_account_id = m.new_id
FROM id_mapping m
WHERE q.sub_account_id = m.old_id;

-- Update quotes_signages table
UPDATE quotes_signages q
SET sub_account_id = m.new_id
FROM id_mapping m
WHERE q.sub_account_id = m.old_id;

-- Update quotes_paint table
UPDATE quotes_paint q
SET sub_account_id = m.new_id
FROM id_mapping m
WHERE q.sub_account_id = m.old_id;

-- Update tasks table (if it has sub_account_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'sub_account_id'
    ) THEN
        UPDATE tasks t
        SET sub_account_id = m.new_id
        FROM id_mapping m
        WHERE t.sub_account_id = m.old_id;
    END IF;
END $$;

-- Update leads table (if it has sub_account_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'sub_account_id'
    ) THEN
        UPDATE leads l
        SET sub_account_id = m.new_id
        FROM id_mapping m
        WHERE l.sub_account_id = m.old_id;
    END IF;
END $$;

-- Update activities table (if it has sub_account_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' AND column_name = 'sub_account_id'
    ) THEN
        UPDATE activities a
        SET sub_account_id = m.new_id
        FROM id_mapping m
        WHERE a.sub_account_id = m.old_id;
    END IF;
END $$;

-- ============================================
-- STEP 3: Update the sub_accounts table itself
-- ============================================
UPDATE sub_accounts s
SET id = m.new_id
FROM id_mapping m
WHERE s.id = m.old_id;

-- ============================================
-- STEP 4: Now fix any remaining non-sequential positive IDs
-- ============================================

-- Get the max ID after fixing negatives
DO $$
DECLARE
    max_existing_id INTEGER;
    next_id INTEGER;
    rec RECORD;
BEGIN
    -- Get current max ID
    SELECT COALESCE(MAX(id), 0) INTO max_existing_id FROM sub_accounts;
    
    -- If we have IDs greater than row count, we need to renumber
    IF max_existing_id > (SELECT COUNT(*) FROM sub_accounts) THEN
        -- Create temp mapping for all IDs
        CREATE TEMP TABLE full_id_mapping AS
        SELECT 
            id as old_id,
            ROW_NUMBER() OVER (ORDER BY id ASC) as new_id
        FROM sub_accounts;
        
        -- Update foreign keys first
        UPDATE contacts c
        SET sub_account_id = m.new_id
        FROM full_id_mapping m
        WHERE c.sub_account_id = m.old_id AND m.old_id != m.new_id;
        
        UPDATE quotes_mbcb q
        SET sub_account_id = m.new_id
        FROM full_id_mapping m
        WHERE q.sub_account_id = m.old_id AND m.old_id != m.new_id;
        
        UPDATE quotes_signages q
        SET sub_account_id = m.new_id
        FROM full_id_mapping m
        WHERE q.sub_account_id = m.old_id AND m.old_id != m.new_id;
        
        UPDATE quotes_paint q
        SET sub_account_id = m.new_id
        FROM full_id_mapping m
        WHERE q.sub_account_id = m.old_id AND m.old_id != m.new_id;
        
        -- Update tasks if column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name = 'sub_account_id'
        ) THEN
            UPDATE tasks t
            SET sub_account_id = m.new_id
            FROM full_id_mapping m
            WHERE t.sub_account_id = m.old_id AND m.old_id != m.new_id;
        END IF;
        
        -- Update leads if column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'leads' AND column_name = 'sub_account_id'
        ) THEN
            UPDATE leads l
            SET sub_account_id = m.new_id
            FROM full_id_mapping m
            WHERE l.sub_account_id = m.old_id AND m.old_id != m.new_id;
        END IF;
        
        -- Update activities if column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'activities' AND column_name = 'sub_account_id'
        ) THEN
            UPDATE activities a
            SET sub_account_id = m.new_id
            FROM full_id_mapping m
            WHERE a.sub_account_id = m.old_id AND m.old_id != m.new_id;
        END IF;
        
        -- Now update sub_accounts IDs using a two-phase approach to avoid conflicts
        -- Phase 1: Move to temporary negative IDs
        next_id := -1;
        FOR rec IN SELECT old_id, new_id FROM full_id_mapping WHERE old_id != new_id ORDER BY old_id
        LOOP
            UPDATE sub_accounts SET id = next_id WHERE id = rec.old_id;
            next_id := next_id - 1;
        END LOOP;
        
        -- Phase 2: Move from temporary negative IDs to final positive IDs
        next_id := -1;
        FOR rec IN SELECT old_id, new_id FROM full_id_mapping WHERE old_id != new_id ORDER BY old_id
        LOOP
            UPDATE sub_accounts SET id = rec.new_id WHERE id = next_id;
            next_id := next_id - 1;
        END LOOP;
        
        DROP TABLE full_id_mapping;
    END IF;
END $$;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ============================================
-- STEP 5: Reset the sequence to correct value
-- ============================================
DO $$
DECLARE
    max_id INTEGER;
BEGIN
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM sub_accounts;
    PERFORM setval('sub_accounts_id_seq', max_id, true);
    RAISE NOTICE '✅ sub_accounts sequence reset to %', max_id;
END $$;

-- ============================================
-- STEP 6: Verification
-- ============================================
SELECT 
    'sub_accounts' as table_name,
    MIN(id) as min_id,
    MAX(id) as max_id,
    COUNT(*) as row_count,
    MAX(id) - MIN(id) + 1 as expected_count,
    CASE 
        WHEN MAX(id) - MIN(id) + 1 = COUNT(*) THEN '✅ Sequential'
        ELSE '⚠️ Has gaps'
    END as status
FROM sub_accounts;

-- Show all sub_accounts IDs to verify
SELECT id, sub_account_name, account_id 
FROM sub_accounts 
ORDER BY id;

-- Check foreign key references
SELECT 'contacts' as table_name, COUNT(*) as count FROM contacts WHERE sub_account_id IS NOT NULL
UNION ALL
SELECT 'quotes_mbcb', COUNT(*) FROM quotes_mbcb WHERE sub_account_id IS NOT NULL
UNION ALL
SELECT 'quotes_signages', COUNT(*) FROM quotes_signages WHERE sub_account_id IS NOT NULL
UNION ALL
SELECT 'quotes_paint', COUNT(*) FROM quotes_paint WHERE sub_account_id IS NOT NULL;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ SUB_ACCOUNTS IDs FIXED!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'All negative IDs have been converted to positive sequential IDs';
    RAISE NOTICE 'All foreign key references have been updated';
    RAISE NOTICE 'Sequence has been reset to correct value';
    RAISE NOTICE '============================================';
END $$;

