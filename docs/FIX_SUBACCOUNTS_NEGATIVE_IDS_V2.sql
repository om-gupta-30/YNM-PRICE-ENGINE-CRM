-- ============================================
-- FIX NEGATIVE IDs IN SUB_ACCOUNTS TABLE (V2)
-- ============================================
-- This script fixes negative IDs in sub_accounts table
-- using a three-phase approach to avoid conflicts
-- ============================================

-- Disable triggers temporarily to avoid foreign key issues
SET session_replication_role = 'replica';

-- ============================================
-- STEP 1: Move ALL IDs to a safe temporary range (starting at 1000000)
-- ============================================
DO $$
DECLARE
    rec RECORD;
    temp_id INTEGER := 1000000;
BEGIN
    RAISE NOTICE 'Phase 1: Moving all IDs to temporary range...';
    
    FOR rec IN SELECT id FROM sub_accounts ORDER BY id ASC
    LOOP
        -- Update foreign keys in all related tables
        UPDATE contacts SET sub_account_id = temp_id WHERE sub_account_id = rec.id;
        UPDATE quotes_mbcb SET sub_account_id = temp_id WHERE sub_account_id = rec.id;
        UPDATE quotes_signages SET sub_account_id = temp_id WHERE sub_account_id = rec.id;
        UPDATE quotes_paint SET sub_account_id = temp_id WHERE sub_account_id = rec.id;
        
        -- Update tasks if column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'sub_account_id') THEN
            UPDATE tasks SET sub_account_id = temp_id WHERE sub_account_id = rec.id;
        END IF;
        
        -- Update leads if column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'sub_account_id') THEN
            UPDATE leads SET sub_account_id = temp_id WHERE sub_account_id = rec.id;
        END IF;
        
        -- Update activities if column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'sub_account_id') THEN
            UPDATE activities SET sub_account_id = temp_id WHERE sub_account_id = rec.id;
        END IF;
        
        -- Update the sub_account itself
        UPDATE sub_accounts SET id = temp_id WHERE id = rec.id;
        
        temp_id := temp_id + 1;
    END LOOP;
    
    RAISE NOTICE 'Phase 1 complete: All IDs moved to temporary range';
END $$;

-- ============================================
-- STEP 2: Move from temporary range to sequential (1, 2, 3...)
-- ============================================
DO $$
DECLARE
    rec RECORD;
    new_id INTEGER := 1;
BEGIN
    RAISE NOTICE 'Phase 2: Renumbering to sequential IDs...';
    
    FOR rec IN SELECT id FROM sub_accounts ORDER BY id ASC
    LOOP
        -- Update foreign keys in all related tables
        UPDATE contacts SET sub_account_id = new_id WHERE sub_account_id = rec.id;
        UPDATE quotes_mbcb SET sub_account_id = new_id WHERE sub_account_id = rec.id;
        UPDATE quotes_signages SET sub_account_id = new_id WHERE sub_account_id = rec.id;
        UPDATE quotes_paint SET sub_account_id = new_id WHERE sub_account_id = rec.id;
        
        -- Update tasks if column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'sub_account_id') THEN
            UPDATE tasks SET sub_account_id = new_id WHERE sub_account_id = rec.id;
        END IF;
        
        -- Update leads if column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'sub_account_id') THEN
            UPDATE leads SET sub_account_id = new_id WHERE sub_account_id = rec.id;
        END IF;
        
        -- Update activities if column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'sub_account_id') THEN
            UPDATE activities SET sub_account_id = new_id WHERE sub_account_id = rec.id;
        END IF;
        
        -- Update the sub_account itself
        UPDATE sub_accounts SET id = new_id WHERE id = rec.id;
        
        RAISE NOTICE '  Renumbered: % -> %', rec.id, new_id;
        new_id := new_id + 1;
    END LOOP;
    
    RAISE NOTICE 'Phase 2 complete: All IDs are now sequential';
END $$;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ============================================
-- STEP 3: Reset the sequence to correct value
-- ============================================
DO $$
DECLARE
    max_id INTEGER;
BEGIN
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM sub_accounts;
    PERFORM setval('sub_accounts_id_seq', max_id, true);
    RAISE NOTICE '✅ sub_accounts sequence reset to % (next will be %)', max_id, max_id + 1;
END $$;

-- ============================================
-- STEP 4: Verification
-- ============================================
SELECT 
    'sub_accounts' as table_name,
    MIN(id) as min_id,
    MAX(id) as max_id,
    COUNT(*) as row_count,
    MAX(id) - MIN(id) + 1 as expected_if_sequential,
    CASE 
        WHEN MIN(id) = 1 AND MAX(id) = COUNT(*) THEN '✅ Perfect: Sequential 1 to ' || COUNT(*)
        WHEN MAX(id) - MIN(id) + 1 = COUNT(*) THEN '✅ Sequential (no gaps)'
        ELSE '⚠️ Has gaps'
    END as status
FROM sub_accounts;

-- Show all sub_accounts IDs to verify
SELECT 
    id, 
    sub_account_name, 
    account_id,
    CASE 
        WHEN is_headquarter THEN '🏢 HQ' 
        ELSE '' 
    END as type
FROM sub_accounts 
ORDER BY id;

-- Check foreign key references are valid
SELECT 'Foreign Key Check:' as info;
SELECT 
    'contacts' as related_table,
    COUNT(*) as total_records,
    COUNT(DISTINCT sub_account_id) as unique_sub_accounts,
    MIN(sub_account_id) as min_sub_account_id,
    MAX(sub_account_id) as max_sub_account_id
FROM contacts 
WHERE sub_account_id IS NOT NULL
UNION ALL
SELECT 
    'quotes_mbcb',
    COUNT(*),
    COUNT(DISTINCT sub_account_id),
    MIN(sub_account_id),
    MAX(sub_account_id)
FROM quotes_mbcb 
WHERE sub_account_id IS NOT NULL
UNION ALL
SELECT 
    'quotes_signages',
    COUNT(*),
    COUNT(DISTINCT sub_account_id),
    MIN(sub_account_id),
    MAX(sub_account_id)
FROM quotes_signages 
WHERE sub_account_id IS NOT NULL
UNION ALL
SELECT 
    'quotes_paint',
    COUNT(*),
    COUNT(DISTINCT sub_account_id),
    MIN(sub_account_id),
    MAX(sub_account_id)
FROM quotes_paint 
WHERE sub_account_id IS NOT NULL;

-- Verify no orphaned foreign keys
SELECT 'Orphaned Foreign Keys Check:' as info;
SELECT 
    'contacts' as table_name,
    COUNT(*) as orphaned_count
FROM contacts c
WHERE c.sub_account_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM sub_accounts s WHERE s.id = c.sub_account_id)
UNION ALL
SELECT 
    'quotes_mbcb',
    COUNT(*)
FROM quotes_mbcb q
WHERE q.sub_account_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM sub_accounts s WHERE s.id = q.sub_account_id)
UNION ALL
SELECT 
    'quotes_signages',
    COUNT(*)
FROM quotes_signages q
WHERE q.sub_account_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM sub_accounts s WHERE s.id = q.sub_account_id)
UNION ALL
SELECT 
    'quotes_paint',
    COUNT(*)
FROM quotes_paint q
WHERE q.sub_account_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM sub_accounts s WHERE s.id = q.sub_account_id);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
DECLARE
    row_count INTEGER;
    max_id INTEGER;
BEGIN
    SELECT COUNT(*), MAX(id) INTO row_count, max_id FROM sub_accounts;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ SUB_ACCOUNTS IDs FIXED!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Total sub_accounts: %', row_count;
    RAISE NOTICE 'ID range: 1 to %', max_id;
    RAISE NOTICE 'Next ID will be: %', max_id + 1;
    RAISE NOTICE '';
    RAISE NOTICE '✅ All negative IDs converted to positive';
    RAISE NOTICE '✅ All IDs are now sequential';
    RAISE NOTICE '✅ All foreign key references updated';
    RAISE NOTICE '✅ Sequence reset to correct value';
    RAISE NOTICE '============================================';
END $$;

