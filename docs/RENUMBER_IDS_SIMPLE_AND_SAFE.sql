-- ============================================
-- RENUMBER IDs TO START FROM 1 (SIMPLE & SAFE)
-- ============================================
-- This script safely renumbers accounts, sub_accounts, and contacts
-- to start from 1, preserving all foreign key relationships
-- ============================================

BEGIN;

-- Disable triggers
SET session_replication_role = 'replica';

-- ============================================
-- STEP 1: RESET ESTIMATE COUNTER
-- ============================================
UPDATE estimate_counter SET current_number = 0, updated_at = NOW() WHERE id = 1;

-- ============================================
-- STEP 2: CREATE TEMP MAPPING TABLES
-- ============================================
CREATE TEMP TABLE account_map (old_id INTEGER, new_id INTEGER);
CREATE TEMP TABLE sub_account_map (old_id INTEGER, new_id INTEGER);
CREATE TEMP TABLE contact_map (old_id INTEGER, new_id INTEGER);

-- ============================================
-- STEP 3: CREATE ACCOUNT MAPPING
-- ============================================
INSERT INTO account_map (old_id, new_id)
SELECT id, ROW_NUMBER() OVER (ORDER BY id) 
FROM accounts 
ORDER BY id;

-- ============================================
-- STEP 4: UPDATE SUB_ACCOUNTS.ACCOUNT_ID FIRST
-- ============================================
UPDATE sub_accounts s
SET account_id = m.new_id
FROM account_map m
WHERE s.account_id = m.old_id;

-- ============================================
-- STEP 5: CREATE SUB_ACCOUNT MAPPING
-- ============================================
INSERT INTO sub_account_map (old_id, new_id)
SELECT id, ROW_NUMBER() OVER (ORDER BY id) 
FROM sub_accounts 
ORDER BY id;

-- ============================================
-- STEP 6: UPDATE CONTACTS FOREIGN KEYS
-- ============================================
UPDATE contacts c
SET account_id = m.new_id
FROM account_map m
WHERE c.account_id = m.old_id;

UPDATE contacts c
SET sub_account_id = m.new_id
FROM sub_account_map m
WHERE c.sub_account_id = m.old_id;

-- ============================================
-- STEP 7: CREATE CONTACT MAPPING
-- ============================================
INSERT INTO contact_map (old_id, new_id)
SELECT id, ROW_NUMBER() OVER (ORDER BY id) 
FROM contacts 
ORDER BY id;

-- ============================================
-- STEP 8: RENUMBER ACCOUNTS (using temp negative IDs)
-- ============================================
-- Move to negative
UPDATE accounts a
SET id = -a.id
FROM account_map m
WHERE a.id = m.old_id;

-- Move to new IDs
UPDATE accounts a
SET id = m.new_id
FROM account_map m
WHERE a.id = -m.old_id;

-- ============================================
-- STEP 9: RENUMBER SUB_ACCOUNTS
-- ============================================
-- Move to negative
UPDATE sub_accounts s
SET id = -s.id
FROM sub_account_map m
WHERE s.id = m.old_id;

-- Move to new IDs
UPDATE sub_accounts s
SET id = m.new_id
FROM sub_account_map m
WHERE s.id = -m.old_id;

-- ============================================
-- STEP 10: RENUMBER CONTACTS
-- ============================================
-- Move to negative
UPDATE contacts c
SET id = -c.id
FROM contact_map m
WHERE c.id = m.old_id;

-- Move to new IDs
UPDATE contacts c
SET id = m.new_id
FROM contact_map m
WHERE c.id = -m.old_id;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ============================================
-- STEP 11: RESET SEQUENCES
-- ============================================
SELECT setval('accounts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM accounts), true);
SELECT setval('sub_accounts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sub_accounts), true);
SELECT setval('contacts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM contacts), true);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
    'accounts' as table_name,
    MIN(id) as min_id,
    MAX(id) as max_id,
    COUNT(*) as count,
    CASE WHEN MIN(id) = 1 AND MAX(id) = COUNT(*) THEN '✅ OK' ELSE '❌ ERROR' END as status
FROM accounts
UNION ALL
SELECT 
    'sub_accounts',
    MIN(id),
    MAX(id),
    COUNT(*),
    CASE WHEN MIN(id) = 1 AND MAX(id) = COUNT(*) THEN '✅ OK' ELSE '❌ ERROR' END
FROM sub_accounts
UNION ALL
SELECT 
    'contacts',
    MIN(id),
    MAX(id),
    COUNT(*),
    CASE WHEN MIN(id) = 1 AND MAX(id) = COUNT(*) THEN '✅ OK' ELSE '❌ ERROR' END
FROM contacts;

-- Check foreign keys
SELECT 
    'sub_accounts -> accounts' as check_type,
    COUNT(*) as total,
    COUNT(CASE WHEN a.id IS NULL THEN 1 END) as broken_links
FROM sub_accounts s
LEFT JOIN accounts a ON s.account_id = a.id
UNION ALL
SELECT 
    'contacts -> accounts',
    COUNT(*),
    COUNT(CASE WHEN a.id IS NULL THEN 1 END)
FROM contacts c
LEFT JOIN accounts a ON c.account_id = a.id
UNION ALL
SELECT 
    'contacts -> sub_accounts',
    COUNT(*),
    COUNT(CASE WHEN s.id IS NULL THEN 1 END)
FROM contacts c
LEFT JOIN sub_accounts s ON c.sub_account_id = s.id;

COMMIT;

