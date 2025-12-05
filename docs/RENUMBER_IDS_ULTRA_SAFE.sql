-- ============================================
-- RENUMBER IDs TO START FROM 1 (ULTRA SAFE)
-- ============================================
-- This script uses a very high temporary range to avoid conflicts
-- ============================================

BEGIN;

-- Disable triggers
SET session_replication_role = 'replica';

-- Reset estimate counter
UPDATE estimate_counter SET current_number = 0, updated_at = NOW() WHERE id = 1;

-- ============================================
-- STEP 1: ACCOUNTS
-- ============================================
-- Create mapping
CREATE TEMP TABLE acc_map AS
SELECT id as old_id, ROW_NUMBER() OVER (ORDER BY id) as new_id
FROM accounts
ORDER BY id;

-- Update sub_accounts.account_id FIRST
UPDATE sub_accounts s
SET account_id = m.new_id
FROM acc_map m
WHERE s.account_id = m.old_id;

-- Renumber accounts: move to 1000000+ range first
UPDATE accounts a
SET id = 1000000 + m.new_id
FROM acc_map m
WHERE a.id = m.old_id;

-- Then move to final IDs
UPDATE accounts a
SET id = m.new_id
FROM acc_map m
WHERE a.id = 1000000 + m.new_id;

-- ============================================
-- STEP 2: SUB_ACCOUNTS
-- ============================================
-- Create mapping
CREATE TEMP TABLE sub_map AS
SELECT id as old_id, ROW_NUMBER() OVER (ORDER BY id) as new_id
FROM sub_accounts
ORDER BY id;

-- Update contacts.sub_account_id FIRST
UPDATE contacts c
SET sub_account_id = m.new_id
FROM sub_map m
WHERE c.sub_account_id = m.old_id;

-- Renumber sub_accounts: move to 2000000+ range first
UPDATE sub_accounts s
SET id = 2000000 + m.new_id
FROM sub_map m
WHERE s.id = m.old_id;

-- Then move to final IDs
UPDATE sub_accounts s
SET id = m.new_id
FROM sub_map m
WHERE s.id = 2000000 + m.new_id;

-- ============================================
-- STEP 3: CONTACTS
-- ============================================
-- Create mapping
CREATE TEMP TABLE con_map AS
SELECT id as old_id, ROW_NUMBER() OVER (ORDER BY id) as new_id
FROM contacts
ORDER BY id;

-- Renumber contacts: move to 3000000+ range first
UPDATE contacts c
SET id = 3000000 + m.new_id
FROM con_map m
WHERE c.id = m.old_id;

-- Then move to final IDs
UPDATE contacts c
SET id = m.new_id
FROM con_map m
WHERE c.id = 3000000 + m.new_id;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ============================================
-- RESET SEQUENCES
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
FROM accounts;

SELECT 
    'sub_accounts' as table_name,
    MIN(id) as min_id,
    MAX(id) as max_id,
    COUNT(*) as count,
    CASE WHEN MIN(id) = 1 AND MAX(id) = COUNT(*) THEN '✅ OK' ELSE '❌ ERROR' END as status
FROM sub_accounts;

SELECT 
    'contacts' as table_name,
    MIN(id) as min_id,
    MAX(id) as max_id,
    COUNT(*) as count,
    CASE WHEN MIN(id) = 1 AND MAX(id) = COUNT(*) THEN '✅ OK' ELSE '❌ ERROR' END as status
FROM contacts;

-- Check foreign keys are valid
SELECT 
    'Foreign Key Check' as check_type,
    COUNT(*) as total_sub_accounts,
    COUNT(CASE WHEN a.id IS NULL THEN 1 END) as broken_account_links
FROM sub_accounts s
LEFT JOIN accounts a ON s.account_id = a.id;

SELECT 
    'Foreign Key Check' as check_type,
    COUNT(*) as total_contacts,
    COUNT(CASE WHEN a.id IS NULL THEN 1 END) as broken_account_links,
    COUNT(CASE WHEN s.id IS NULL THEN 1 END) as broken_sub_account_links
FROM contacts c
LEFT JOIN accounts a ON c.account_id = a.id
LEFT JOIN sub_accounts s ON c.sub_account_id = s.id;

COMMIT;

