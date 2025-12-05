-- ============================================
-- RENUMBER ALL IDs TO START FROM 1
-- ============================================
-- This script renumbers all existing IDs to be sequential (1, 2, 3...)
-- and updates all foreign key references
-- Also resets estimate_counter to 0 (YNM/EST-1)
-- 
-- Run this in your Supabase SQL Editor
-- ============================================

-- Disable triggers temporarily to avoid foreign key issues
SET session_replication_role = 'replica';

-- ============================================
-- STEP 1: RESET ESTIMATE COUNTER
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimate_counter') THEN
        UPDATE estimate_counter SET current_number = 0, updated_at = NOW() WHERE id = 1;
        RAISE NOTICE '✅ Estimate counter reset - next PDF will be YNM/EST-1';
    END IF;
END $$;

-- ============================================
-- STEP 2: RENUMBER ACCOUNTS TABLE
-- ============================================
DO $$
DECLARE
    rec RECORD;
    new_id INTEGER := 1;
    temp_id INTEGER := -1000000;
    id_mapping INTEGER[] := ARRAY[]::INTEGER[];
BEGIN
    RAISE NOTICE 'Renumbering accounts table...';
    
    -- Step 1: Move all IDs to temporary negative values
    FOR rec IN SELECT id FROM accounts ORDER BY id ASC
    LOOP
        UPDATE accounts SET id = temp_id WHERE id = rec.id;
        id_mapping := array_append(id_mapping, rec.id);
        temp_id := temp_id - 1;
    END LOOP;
    
    -- Step 2: Move from temporary to sequential (1, 2, 3...)
    temp_id := -1000000;
    FOR i IN 1..array_length(id_mapping, 1)
    LOOP
        UPDATE accounts SET id = new_id WHERE id = temp_id;
        temp_id := temp_id - 1;
        new_id := new_id + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Accounts renumbered';
END $$;

-- ============================================
-- STEP 3: UPDATE FOREIGN KEYS IN SUB_ACCOUNTS
-- ============================================
DO $$
DECLARE
    rec RECORD;
    new_account_id INTEGER;
BEGIN
    RAISE NOTICE 'Updating sub_accounts.account_id references...';
    
    -- Create mapping: old_account_id -> new_account_id
    FOR rec IN 
        SELECT 
            old_id,
            ROW_NUMBER() OVER (ORDER BY old_id) as new_id
        FROM (
            SELECT DISTINCT id as old_id 
            FROM accounts 
            ORDER BY id
        ) t
    LOOP
        UPDATE sub_accounts 
        SET account_id = rec.new_id 
        WHERE account_id = rec.old_id;
    END LOOP;
    
    RAISE NOTICE '✅ sub_accounts.account_id updated';
END $$;

-- ============================================
-- STEP 4: RENUMBER SUB_ACCOUNTS TABLE
-- ============================================
DO $$
DECLARE
    rec RECORD;
    new_id INTEGER := 1;
    temp_id INTEGER := -1000000;
    id_mapping INTEGER[] := ARRAY[]::INTEGER[];
BEGIN
    RAISE NOTICE 'Renumbering sub_accounts table...';
    
    -- Step 1: Move all IDs to temporary negative values
    FOR rec IN SELECT id FROM sub_accounts ORDER BY id ASC
    LOOP
        UPDATE sub_accounts SET id = temp_id WHERE id = rec.id;
        id_mapping := array_append(id_mapping, rec.id);
        temp_id := temp_id - 1;
    END LOOP;
    
    -- Step 2: Move from temporary to sequential (1, 2, 3...)
    temp_id := -1000000;
    FOR i IN 1..array_length(id_mapping, 1)
    LOOP
        UPDATE sub_accounts SET id = new_id WHERE id = temp_id;
        temp_id := temp_id - 1;
        new_id := new_id + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Sub-accounts renumbered';
END $$;

-- ============================================
-- STEP 5: UPDATE FOREIGN KEYS IN CONTACTS
-- ============================================
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Updating contacts.account_id and sub_account_id references...';
    
    -- Update account_id references
    FOR rec IN 
        SELECT 
            old_id,
            ROW_NUMBER() OVER (ORDER BY old_id) as new_id
        FROM (
            SELECT DISTINCT id as old_id 
            FROM accounts 
            ORDER BY id
        ) t
    LOOP
        UPDATE contacts 
        SET account_id = rec.new_id 
        WHERE account_id = rec.old_id;
    END LOOP;
    
    -- Update sub_account_id references
    FOR rec IN 
        SELECT 
            old_id,
            ROW_NUMBER() OVER (ORDER BY old_id) as new_id
        FROM (
            SELECT DISTINCT id as old_id 
            FROM sub_accounts 
            ORDER BY id
        ) t
    LOOP
        UPDATE contacts 
        SET sub_account_id = rec.new_id 
        WHERE sub_account_id = rec.old_id;
    END LOOP;
    
    RAISE NOTICE '✅ contacts foreign keys updated';
END $$;

-- ============================================
-- STEP 6: RENUMBER CONTACTS TABLE
-- ============================================
DO $$
DECLARE
    rec RECORD;
    new_id INTEGER := 1;
    temp_id INTEGER := -1000000;
    id_mapping INTEGER[] := ARRAY[]::INTEGER[];
BEGIN
    RAISE NOTICE 'Renumbering contacts table...';
    
    -- Step 1: Move all IDs to temporary negative values
    FOR rec IN SELECT id FROM contacts ORDER BY id ASC
    LOOP
        UPDATE contacts SET id = temp_id WHERE id = rec.id;
        id_mapping := array_append(id_mapping, rec.id);
        temp_id := temp_id - 1;
    END LOOP;
    
    -- Step 2: Move from temporary to sequential (1, 2, 3...)
    temp_id := -1000000;
    FOR i IN 1..array_length(id_mapping, 1)
    LOOP
        UPDATE contacts SET id = new_id WHERE id = temp_id;
        temp_id := temp_id - 1;
        new_id := new_id + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Contacts renumbered';
END $$;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ============================================
-- STEP 7: RESET SEQUENCES
-- ============================================
DO $$
DECLARE
    max_account_id INTEGER;
    max_sub_account_id INTEGER;
    max_contact_id INTEGER;
BEGIN
    -- Get max IDs
    SELECT COALESCE(MAX(id), 0) INTO max_account_id FROM accounts;
    SELECT COALESCE(MAX(id), 0) INTO max_sub_account_id FROM sub_accounts;
    SELECT COALESCE(MAX(id), 0) INTO max_contact_id FROM contacts;
    
    -- Reset sequences to max(id) so next will be max(id) + 1
    PERFORM setval('accounts_id_seq', GREATEST(max_account_id, 1), max_account_id > 0);
    PERFORM setval('sub_accounts_id_seq', GREATEST(max_sub_account_id, 1), max_sub_account_id > 0);
    PERFORM setval('contacts_id_seq', GREATEST(max_contact_id, 1), max_contact_id > 0);
    
    RAISE NOTICE '✅ Sequences reset';
    RAISE NOTICE '   accounts_id_seq: next will be %', max_account_id + 1;
    RAISE NOTICE '   sub_accounts_id_seq: next will be %', max_sub_account_id + 1;
    RAISE NOTICE '   contacts_id_seq: next will be %', max_contact_id + 1;
END $$;

-- ============================================
-- STEP 8: VERIFICATION
-- ============================================
SELECT 
    'accounts' as table_name,
    MIN(id) as min_id,
    MAX(id) as max_id,
    COUNT(*) as row_count,
    CASE 
        WHEN MIN(id) = 1 AND MAX(id) = COUNT(*) THEN '✅ Sequential from 1'
        ELSE '⚠️ Has gaps or not starting from 1'
    END as status
FROM accounts
UNION ALL
SELECT 
    'sub_accounts',
    MIN(id),
    MAX(id),
    COUNT(*),
    CASE 
        WHEN MIN(id) = 1 AND MAX(id) = COUNT(*) THEN '✅ Sequential from 1'
        ELSE '⚠️ Has gaps or not starting from 1'
    END
FROM sub_accounts
UNION ALL
SELECT 
    'contacts',
    MIN(id),
    MAX(id),
    COUNT(*),
    CASE 
        WHEN MIN(id) = 1 AND MAX(id) = COUNT(*) THEN '✅ Sequential from 1'
        ELSE '⚠️ Has gaps or not starting from 1'
    END
FROM contacts;

-- Check foreign key integrity
SELECT 'Foreign Key Check:' as info;
SELECT 
    'contacts -> accounts' as relationship,
    COUNT(*) as total_contacts,
    COUNT(DISTINCT account_id) as unique_accounts_referenced,
    MIN(account_id) as min_account_id,
    MAX(account_id) as max_account_id
FROM contacts
WHERE account_id IS NOT NULL
UNION ALL
SELECT 
    'contacts -> sub_accounts',
    COUNT(*),
    COUNT(DISTINCT sub_account_id),
    MIN(sub_account_id),
    MAX(sub_account_id)
FROM contacts
WHERE sub_account_id IS NOT NULL
UNION ALL
SELECT 
    'sub_accounts -> accounts',
    COUNT(*),
    COUNT(DISTINCT account_id),
    MIN(account_id),
    MAX(account_id)
FROM sub_accounts
WHERE account_id IS NOT NULL;

-- Check for orphaned foreign keys
SELECT 'Orphaned Foreign Keys Check:' as info;
SELECT 
    'contacts with invalid account_id' as issue,
    COUNT(*) as count
FROM contacts c
WHERE c.account_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id = c.account_id)
UNION ALL
SELECT 
    'contacts with invalid sub_account_id',
    COUNT(*)
FROM contacts c
WHERE c.sub_account_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM sub_accounts s WHERE s.id = c.sub_account_id)
UNION ALL
SELECT 
    'sub_accounts with invalid account_id',
    COUNT(*)
FROM sub_accounts s
WHERE s.account_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id = s.account_id);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
DECLARE
    account_count INTEGER;
    sub_account_count INTEGER;
    contact_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO account_count FROM accounts;
    SELECT COUNT(*) INTO sub_account_count FROM sub_accounts;
    SELECT COUNT(*) INTO contact_count FROM contacts;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ID RENUMBERING COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Accounts: % records (IDs 1 to %)', account_count, account_count;
    RAISE NOTICE 'Sub-accounts: % records (IDs 1 to %)', sub_account_count, sub_account_count;
    RAISE NOTICE 'Contacts: % records (IDs 1 to %)', contact_count, contact_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ All IDs renumbered to start from 1';
    RAISE NOTICE '✅ All foreign key references updated';
    RAISE NOTICE '✅ Sequences reset to correct values';
    RAISE NOTICE '✅ Estimate counter reset - next PDF: YNM/EST-1';
    RAISE NOTICE '============================================';
END $$;

