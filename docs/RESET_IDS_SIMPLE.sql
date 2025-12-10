-- ============================================
-- SIMPLE FORCE RESET ALL IDs TO START FROM 1
-- ============================================

BEGIN;

-- Reset estimate counter
UPDATE estimate_counter SET current_number = 0 WHERE id = 1;
INSERT INTO estimate_counter (id, current_number, prefix) VALUES (1, 0, 'YNM/EST-') ON CONFLICT (id) DO UPDATE SET current_number = 0;

-- Step 1: Set all foreign keys to NULL temporarily
UPDATE contacts SET account_id = NULL, sub_account_id = NULL;
UPDATE sub_accounts SET account_id = NULL;
UPDATE quotes_mbcb SET sub_account_id = NULL;
UPDATE quotes_signages SET sub_account_id = NULL;
UPDATE quotes_paint SET sub_account_id = NULL;
UPDATE tasks SET account_id = NULL, sub_account_id = NULL, contact_id = NULL;
UPDATE leads SET account_id = NULL, sub_account_id = NULL;
UPDATE activities SET account_id = NULL, sub_account_id = NULL, contact_id = NULL;
UPDATE notifications SET account_id = NULL, sub_account_id = NULL, contact_id = NULL, task_id = NULL;

-- Step 2: Renumber all primary keys starting from 1
DO $$
DECLARE
    rec RECORD;
    new_id INTEGER;
BEGIN
    -- Accounts
    new_id := 0;
    FOR rec IN SELECT id FROM accounts ORDER BY id LOOP
        new_id := new_id + 1;
        UPDATE accounts SET id = new_id WHERE id = rec.id;
    END LOOP;
    
    -- Sub-accounts
    new_id := 0;
    FOR rec IN SELECT id FROM sub_accounts ORDER BY id LOOP
        new_id := new_id + 1;
        UPDATE sub_accounts SET id = new_id WHERE id = rec.id;
    END LOOP;
    
    -- Contacts
    new_id := 0;
    FOR rec IN SELECT id FROM contacts ORDER BY id LOOP
        new_id := new_id + 1;
        UPDATE contacts SET id = new_id WHERE id = rec.id;
    END LOOP;
    
    -- Quotes
    new_id := 0;
    FOR rec IN SELECT id FROM quotes_mbcb ORDER BY id LOOP
        new_id := new_id + 1;
        UPDATE quotes_mbcb SET id = new_id WHERE id = rec.id;
    END LOOP;
    
    new_id := 0;
    FOR rec IN SELECT id FROM quotes_signages ORDER BY id LOOP
        new_id := new_id + 1;
        UPDATE quotes_signages SET id = new_id WHERE id = rec.id;
    END LOOP;
    
    new_id := 0;
    FOR rec IN SELECT id FROM quotes_paint ORDER BY id LOOP
        new_id := new_id + 1;
        UPDATE quotes_paint SET id = new_id WHERE id = rec.id;
    END LOOP;
    
    -- Other tables
    new_id := 0;
    FOR rec IN SELECT id FROM tasks ORDER BY id LOOP
        new_id := new_id + 1;
        UPDATE tasks SET id = new_id WHERE id = rec.id;
    END LOOP;
    
    new_id := 0;
    FOR rec IN SELECT id FROM leads ORDER BY id LOOP
        new_id := new_id + 1;
        UPDATE leads SET id = new_id WHERE id = rec.id;
    END LOOP;
    
    new_id := 0;
    FOR rec IN SELECT id FROM activities ORDER BY id LOOP
        new_id := new_id + 1;
        UPDATE activities SET id = new_id WHERE id = rec.id;
    END LOOP;
    
    new_id := 0;
    FOR rec IN SELECT id FROM notifications ORDER BY id LOOP
        new_id := new_id + 1;
        UPDATE notifications SET id = new_id WHERE id = rec.id;
    END LOOP;
    
    new_id := 0;
    FOR rec IN SELECT id FROM purposes ORDER BY id LOOP
        new_id := new_id + 1;
        UPDATE purposes SET id = new_id WHERE id = rec.id;
    END LOOP;
END $$;

-- Step 3: Restore foreign keys (you'll need to manually fix relationships or they stay NULL)
-- Note: Foreign keys are set to NULL - you may need to restore them manually based on your data relationships

-- Step 4: Reset sequences
DO $$
DECLARE max_id INTEGER;
BEGIN
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM accounts; ALTER SEQUENCE accounts_id_seq RESTART WITH GREATEST(1, max_id + 1);
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM sub_accounts; ALTER SEQUENCE sub_accounts_id_seq RESTART WITH GREATEST(1, max_id + 1);
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM contacts; ALTER SEQUENCE contacts_id_seq RESTART WITH GREATEST(1, max_id + 1);
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM quotes_mbcb; ALTER SEQUENCE quotes_mbcb_id_seq RESTART WITH GREATEST(1, max_id + 1);
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM quotes_signages; ALTER SEQUENCE quotes_signages_id_seq RESTART WITH GREATEST(1, max_id + 1);
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM quotes_paint; ALTER SEQUENCE quotes_paint_id_seq RESTART WITH GREATEST(1, max_id + 1);
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM tasks; ALTER SEQUENCE tasks_id_seq RESTART WITH GREATEST(1, max_id + 1);
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM leads; ALTER SEQUENCE leads_id_seq RESTART WITH GREATEST(1, max_id + 1);
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM activities; ALTER SEQUENCE activities_id_seq RESTART WITH GREATEST(1, max_id + 1);
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM notifications; ALTER SEQUENCE notifications_id_seq RESTART WITH GREATEST(1, max_id + 1);
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM purposes; ALTER SEQUENCE purposes_id_seq RESTART WITH GREATEST(1, max_id + 1);
END $$;

COMMIT;

SELECT '✅ All IDs reset to start from 1' AS status, '✅ Next estimate: YNM/EST-1' AS estimate;

