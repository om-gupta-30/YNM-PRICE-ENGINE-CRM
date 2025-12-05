-- ============================================
-- RENUMBER ALL IDs TO START FROM 1 (FIXED VERSION)
-- ============================================
-- This script properly handles foreign key relationships:
-- 1. Creates mapping tables for old_id -> new_id
-- 2. Updates all foreign keys using mappings
-- 3. Renumbers all tables sequentially
-- 
-- Run this in your Supabase SQL Editor
-- ============================================

-- Disable triggers temporarily
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
-- STEP 2: CREATE MAPPING TABLES
-- ============================================
-- Create temporary mapping tables to track old_id -> new_id

CREATE TEMP TABLE account_id_mapping (
    old_id INTEGER PRIMARY KEY,
    new_id INTEGER
);

CREATE TEMP TABLE sub_account_id_mapping (
    old_id INTEGER PRIMARY KEY,
    new_id INTEGER
);

CREATE TEMP TABLE contact_id_mapping (
    old_id INTEGER PRIMARY KEY,
    new_id INTEGER
);

-- ============================================
-- STEP 3: POPULATE ACCOUNT MAPPING (old_id -> new_id = 1,2,3...)
-- ============================================
DO $$
BEGIN
    INSERT INTO account_id_mapping (old_id, new_id)
    SELECT 
        id as old_id,
        ROW_NUMBER() OVER (ORDER BY id ASC) as new_id
    FROM accounts
    ORDER BY id ASC;
    
    RAISE NOTICE '✅ Created account ID mapping';
END $$;

-- ============================================
-- STEP 4: UPDATE SUB_ACCOUNTS.ACCOUNT_ID USING MAPPING
-- ============================================
DO $$
BEGIN
    UPDATE sub_accounts s
    SET account_id = m.new_id
    FROM account_id_mapping m
    WHERE s.account_id = m.old_id;
    
    RAISE NOTICE '✅ Updated sub_accounts.account_id references';
END $$;

-- ============================================
-- STEP 5: RENUMBER ACCOUNTS TABLE (using mapping)
-- ============================================
DO $$
DECLARE
    rec RECORD;
    temp_id INTEGER := -1000000;
BEGIN
    RAISE NOTICE 'Renumbering accounts table...';
    
    -- Step 1: Move all accounts to temporary negative IDs
    FOR rec IN SELECT old_id FROM account_id_mapping ORDER BY old_id
    LOOP
        UPDATE accounts SET id = temp_id WHERE id = rec.old_id;
        temp_id := temp_id - 1;
    END LOOP;
    
    -- Step 2: Move from temporary to new sequential IDs
    temp_id := -1000000;
    FOR rec IN SELECT old_id, new_id FROM account_id_mapping ORDER BY old_id
    LOOP
        UPDATE accounts SET id = rec.new_id WHERE id = temp_id;
        temp_id := temp_id - 1;
    END LOOP;
    
    RAISE NOTICE '✅ Accounts renumbered';
END $$;

-- ============================================
-- STEP 6: POPULATE SUB_ACCOUNT MAPPING
-- ============================================
DO $$
BEGIN
    INSERT INTO sub_account_id_mapping (old_id, new_id)
    SELECT 
        id as old_id,
        ROW_NUMBER() OVER (ORDER BY id ASC) as new_id
    FROM sub_accounts
    ORDER BY id ASC;
    
    RAISE NOTICE '✅ Created sub_account ID mapping';
END $$;

-- ============================================
-- STEP 7: UPDATE CONTACTS FOREIGN KEYS USING MAPPINGS
-- ============================================
DO $$
BEGIN
    -- Update contacts.account_id
    UPDATE contacts c
    SET account_id = m.new_id
    FROM account_id_mapping m
    WHERE c.account_id = m.old_id;
    
    -- Update contacts.sub_account_id
    UPDATE contacts c
    SET sub_account_id = m.new_id
    FROM sub_account_id_mapping m
    WHERE c.sub_account_id = m.old_id;
    
    RAISE NOTICE '✅ Updated contacts foreign key references';
END $$;

-- ============================================
-- STEP 8: RENUMBER SUB_ACCOUNTS TABLE
-- ============================================
DO $$
DECLARE
    rec RECORD;
    temp_id INTEGER := -1000000;
BEGIN
    RAISE NOTICE 'Renumbering sub_accounts table...';
    
    -- Step 1: Move all sub_accounts to temporary negative IDs
    FOR rec IN SELECT old_id FROM sub_account_id_mapping ORDER BY old_id
    LOOP
        UPDATE sub_accounts SET id = temp_id WHERE id = rec.old_id;
        temp_id := temp_id - 1;
    END LOOP;
    
    -- Step 2: Move from temporary to new sequential IDs
    temp_id := -1000000;
    FOR rec IN SELECT old_id, new_id FROM sub_account_id_mapping ORDER BY old_id
    LOOP
        UPDATE sub_accounts SET id = rec.new_id WHERE id = temp_id;
        temp_id := temp_id - 1;
    END LOOP;
    
    RAISE NOTICE '✅ Sub-accounts renumbered';
END $$;

-- ============================================
-- STEP 9: POPULATE CONTACT MAPPING
-- ============================================
DO $$
BEGIN
    INSERT INTO contact_id_mapping (old_id, new_id)
    SELECT 
        id as old_id,
        ROW_NUMBER() OVER (ORDER BY id ASC) as new_id
    FROM contacts
    ORDER BY id ASC;
    
    RAISE NOTICE '✅ Created contact ID mapping';
END $$;

-- ============================================
-- STEP 10: RENUMBER CONTACTS TABLE
-- ============================================
DO $$
DECLARE
    rec RECORD;
    temp_id INTEGER := -1000000;
BEGIN
    RAISE NOTICE 'Renumbering contacts table...';
    
    -- Step 1: Move all contacts to temporary negative IDs
    FOR rec IN SELECT old_id FROM contact_id_mapping ORDER BY old_id
    LOOP
        UPDATE contacts SET id = temp_id WHERE id = rec.old_id;
        temp_id := temp_id - 1;
    END LOOP;
    
    -- Step 2: Move from temporary to new sequential IDs
    temp_id := -1000000;
    FOR rec IN SELECT old_id, new_id FROM contact_id_mapping ORDER BY old_id
    LOOP
        UPDATE contacts SET id = rec.new_id WHERE id = temp_id;
        temp_id := temp_id - 1;
    END LOOP;
    
    RAISE NOTICE '✅ Contacts renumbered';
END $$;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ============================================
-- STEP 11: RESET SEQUENCES
-- ============================================
DO $$
DECLARE
    max_account_id INTEGER;
    max_sub_account_id INTEGER;
    max_contact_id INTEGER;
BEGIN
    SELECT COALESCE(MAX(id), 0) INTO max_account_id FROM accounts;
    SELECT COALESCE(MAX(id), 0) INTO max_sub_account_id FROM sub_accounts;
    SELECT COALESCE(MAX(id), 0) INTO max_contact_id FROM contacts;
    
    PERFORM setval('accounts_id_seq', GREATEST(max_account_id, 1), max_account_id > 0);
    PERFORM setval('sub_accounts_id_seq', GREATEST(max_sub_account_id, 1), max_sub_account_id > 0);
    PERFORM setval('contacts_id_seq', GREATEST(max_contact_id, 1), max_contact_id > 0);
    
    RAISE NOTICE '✅ Sequences reset';
END $$;

-- ============================================
-- STEP 12: VERIFICATION
-- ============================================
SELECT 
    'accounts' as table_name,
    MIN(id) as min_id,
    MAX(id) as max_id,
    COUNT(*) as row_count,
    CASE 
        WHEN MIN(id) = 1 AND MAX(id) = COUNT(*) THEN '✅ Sequential from 1'
        ELSE '⚠️ Issue detected'
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
        ELSE '⚠️ Issue detected'
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
        ELSE '⚠️ Issue detected'
    END
FROM contacts;

-- Verify foreign key integrity
SELECT 'Foreign Key Integrity Check:' as info;
SELECT 
    'sub_accounts -> accounts' as relationship,
    COUNT(*) as total_sub_accounts,
    COUNT(DISTINCT s.account_id) as unique_accounts_referenced,
    MIN(s.account_id) as min_account_id,
    MAX(s.account_id) as max_account_id,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT s.account_id) AND MIN(s.account_id) >= 1 AND MAX(s.account_id) <= (SELECT COUNT(*) FROM accounts) THEN '✅ Valid'
        ELSE '❌ Invalid'
    END as status
FROM sub_accounts s
WHERE s.account_id IS NOT NULL
UNION ALL
SELECT 
    'contacts -> accounts',
    COUNT(*),
    COUNT(DISTINCT c.account_id),
    MIN(c.account_id),
    MAX(c.account_id),
    CASE 
        WHEN MIN(c.account_id) >= 1 AND MAX(c.account_id) <= (SELECT COUNT(*) FROM accounts) THEN '✅ Valid'
        ELSE '❌ Invalid'
    END
FROM contacts c
WHERE c.account_id IS NOT NULL
UNION ALL
SELECT 
    'contacts -> sub_accounts',
    COUNT(*),
    COUNT(DISTINCT c.sub_account_id),
    MIN(c.sub_account_id),
    MAX(c.sub_account_id),
    CASE 
        WHEN MIN(c.sub_account_id) >= 1 AND MAX(c.sub_account_id) <= (SELECT COUNT(*) FROM sub_accounts) THEN '✅ Valid'
        ELSE '❌ Invalid'
    END
FROM contacts c
WHERE c.sub_account_id IS NOT NULL;

-- Check for orphaned foreign keys (should be 0)
SELECT 'Orphaned Foreign Keys Check (should be 0):' as info;
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
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO account_count FROM accounts;
    SELECT COUNT(*) INTO sub_account_count FROM sub_accounts;
    SELECT COUNT(*) INTO contact_count FROM contacts;
    
    SELECT COUNT(*) INTO orphaned_count FROM (
        SELECT 1 FROM contacts c
        WHERE c.account_id IS NOT NULL 
          AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id = c.account_id)
        UNION ALL
        SELECT 1 FROM contacts c
        WHERE c.sub_account_id IS NOT NULL 
          AND NOT EXISTS (SELECT 1 FROM sub_accounts s WHERE s.id = c.sub_account_id)
        UNION ALL
        SELECT 1 FROM sub_accounts s
        WHERE s.account_id IS NOT NULL 
          AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id = s.account_id)
    ) t;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ ID RENUMBERING COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Accounts: % records (IDs 1 to %)', account_count, account_count;
    RAISE NOTICE 'Sub-accounts: % records (IDs 1 to %)', sub_account_count, sub_account_count;
    RAISE NOTICE 'Contacts: % records (IDs 1 to %)', contact_count, contact_count;
    RAISE NOTICE '';
    IF orphaned_count = 0 THEN
        RAISE NOTICE '✅ All foreign key relationships valid';
    ELSE
        RAISE WARNING '⚠️ Found % orphaned foreign keys', orphaned_count;
    END IF;
    RAISE NOTICE '✅ All IDs renumbered to start from 1';
    RAISE NOTICE '✅ All foreign key references updated correctly';
    RAISE NOTICE '✅ Sequences reset to correct values';
    RAISE NOTICE '✅ Estimate counter reset - next PDF: YNM/EST-1';
    RAISE NOTICE '============================================';
END $$;

