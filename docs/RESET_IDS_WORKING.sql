-- ============================================
-- FORCE RESET ALL IDs TO START FROM 1
-- ============================================

BEGIN;

-- Reset estimate counter
UPDATE estimate_counter SET current_number = 0 WHERE id = 1;
INSERT INTO estimate_counter (id, current_number, prefix) VALUES (1, 0, 'YNM/EST-') ON CONFLICT (id) DO UPDATE SET current_number = 0;

-- Create temp mapping tables
CREATE TEMP TABLE acc_map (old_id INT, new_id INT);
CREATE TEMP TABLE sub_map (old_id INT, new_id INT);
CREATE TEMP TABLE con_map (old_id INT, new_id INT);

-- Build mappings
INSERT INTO acc_map SELECT id, ROW_NUMBER() OVER (ORDER BY id) FROM accounts;
INSERT INTO sub_map SELECT id, ROW_NUMBER() OVER (ORDER BY id) FROM sub_accounts;
INSERT INTO con_map SELECT id, ROW_NUMBER() OVER (ORDER BY id) FROM contacts;

-- Step 1: Set foreign keys to NULL temporarily
UPDATE contacts SET account_id = NULL, sub_account_id = NULL;
UPDATE sub_accounts SET account_id = NULL;
UPDATE quotes_mbcb SET sub_account_id = NULL;
UPDATE quotes_signages SET sub_account_id = NULL;
UPDATE quotes_paint SET sub_account_id = NULL;
UPDATE tasks SET account_id = NULL, sub_account_id = NULL, contact_id = NULL;
UPDATE leads SET account_id = NULL, sub_account_id = NULL;
UPDATE activities SET account_id = NULL, sub_account_id = NULL, contact_id = NULL;
UPDATE notifications SET account_id = NULL, sub_account_id = NULL, contact_id = NULL, task_id = NULL;

-- Step 2: Update primary keys to new IDs
UPDATE accounts a SET id = m.new_id FROM acc_map m WHERE a.id = m.old_id;
UPDATE sub_accounts s SET id = m.new_id FROM sub_map m WHERE s.id = m.old_id;
UPDATE contacts c SET id = m.new_id FROM con_map m WHERE c.id = m.old_id;

-- Step 3: Restore foreign keys using mappings
UPDATE sub_accounts s SET account_id = m.new_id FROM acc_map m WHERE EXISTS (SELECT 1 FROM sub_accounts s2 WHERE s2.id = s.id AND s2.account_id IS NULL);
UPDATE contacts c SET account_id = m.new_id FROM acc_map m WHERE EXISTS (SELECT 1 FROM contacts c2 WHERE c2.id = c.id AND c2.account_id IS NULL);
UPDATE contacts c SET sub_account_id = m.new_id FROM sub_map m WHERE EXISTS (SELECT 1 FROM contacts c2 WHERE c2.id = c.id AND c2.sub_account_id IS NULL);
UPDATE quotes_mbcb q SET sub_account_id = m.new_id FROM sub_map m WHERE q.sub_account_id IS NULL;
UPDATE quotes_signages q SET sub_account_id = m.new_id FROM sub_map m WHERE q.sub_account_id IS NULL;
UPDATE quotes_paint q SET sub_account_id = m.new_id FROM sub_map m WHERE q.sub_account_id IS NULL;
UPDATE tasks t SET account_id = m.new_id FROM acc_map m WHERE t.account_id IS NULL;
UPDATE tasks t SET sub_account_id = m.new_id FROM sub_map m WHERE t.sub_account_id IS NULL;
UPDATE tasks t SET contact_id = m.new_id FROM con_map m WHERE t.contact_id IS NULL;
UPDATE leads l SET account_id = m.new_id FROM acc_map m WHERE l.account_id IS NULL;
UPDATE leads l SET sub_account_id = m.new_id FROM sub_map m WHERE l.sub_account_id IS NULL;
UPDATE activities a SET account_id = m.new_id FROM acc_map m WHERE a.account_id IS NULL;
UPDATE activities a SET sub_account_id = m.new_id FROM sub_map m WHERE a.sub_account_id IS NULL;
UPDATE activities a SET contact_id = m.new_id FROM con_map m WHERE a.contact_id IS NULL;
UPDATE notifications n SET account_id = m.new_id FROM acc_map m WHERE n.account_id IS NULL;
UPDATE notifications n SET sub_account_id = m.new_id FROM sub_map m WHERE n.sub_account_id IS NULL;
UPDATE notifications n SET contact_id = m.new_id FROM con_map m WHERE n.contact_id IS NULL;

-- Step 4: Renumber other tables
DO $$
DECLARE rec RECORD; nid INT;
BEGIN
    nid := 0; FOR rec IN SELECT id FROM quotes_mbcb ORDER BY id LOOP nid := nid + 1; UPDATE quotes_mbcb SET id = nid WHERE id = rec.id; END LOOP;
    nid := 0; FOR rec IN SELECT id FROM quotes_signages ORDER BY id LOOP nid := nid + 1; UPDATE quotes_signages SET id = nid WHERE id = rec.id; END LOOP;
    nid := 0; FOR rec IN SELECT id FROM quotes_paint ORDER BY id LOOP nid := nid + 1; UPDATE quotes_paint SET id = nid WHERE id = rec.id; END LOOP;
    nid := 0; FOR rec IN SELECT id FROM tasks ORDER BY id LOOP nid := nid + 1; UPDATE tasks SET id = nid WHERE id = rec.id; END LOOP;
    nid := 0; FOR rec IN SELECT id FROM leads ORDER BY id LOOP nid := nid + 1; UPDATE leads SET id = nid WHERE id = rec.id; END LOOP;
    nid := 0; FOR rec IN SELECT id FROM activities ORDER BY id LOOP nid := nid + 1; UPDATE activities SET id = nid WHERE id = rec.id; END LOOP;
    nid := 0; FOR rec IN SELECT id FROM notifications ORDER BY id LOOP nid := nid + 1; UPDATE notifications SET id = nid WHERE id = rec.id; END LOOP;
    nid := 0; FOR rec IN SELECT id FROM purposes ORDER BY id LOOP nid := nid + 1; UPDATE purposes SET id = nid WHERE id = rec.id; END LOOP;
END $$;

-- Step 5: Reset sequences
DO $$
DECLARE mx INT;
BEGIN
    SELECT COALESCE(MAX(id), 0) INTO mx FROM accounts; ALTER SEQUENCE accounts_id_seq RESTART WITH GREATEST(1, mx + 1);
    SELECT COALESCE(MAX(id), 0) INTO mx FROM sub_accounts; ALTER SEQUENCE sub_accounts_id_seq RESTART WITH GREATEST(1, mx + 1);
    SELECT COALESCE(MAX(id), 0) INTO mx FROM contacts; ALTER SEQUENCE contacts_id_seq RESTART WITH GREATEST(1, mx + 1);
    SELECT COALESCE(MAX(id), 0) INTO mx FROM quotes_mbcb; ALTER SEQUENCE quotes_mbcb_id_seq RESTART WITH GREATEST(1, mx + 1);
    SELECT COALESCE(MAX(id), 0) INTO mx FROM quotes_signages; ALTER SEQUENCE quotes_signages_id_seq RESTART WITH GREATEST(1, mx + 1);
    SELECT COALESCE(MAX(id), 0) INTO mx FROM quotes_paint; ALTER SEQUENCE quotes_paint_id_seq RESTART WITH GREATEST(1, mx + 1);
    SELECT COALESCE(MAX(id), 0) INTO mx FROM tasks; ALTER SEQUENCE tasks_id_seq RESTART WITH GREATEST(1, mx + 1);
    SELECT COALESCE(MAX(id), 0) INTO mx FROM leads; ALTER SEQUENCE leads_id_seq RESTART WITH GREATEST(1, mx + 1);
    SELECT COALESCE(MAX(id), 0) INTO mx FROM activities; ALTER SEQUENCE activities_id_seq RESTART WITH GREATEST(1, mx + 1);
    SELECT COALESCE(MAX(id), 0) INTO mx FROM notifications; ALTER SEQUENCE notifications_id_seq RESTART WITH GREATEST(1, mx + 1);
    SELECT COALESCE(MAX(id), 0) INTO mx FROM purposes; ALTER SEQUENCE purposes_id_seq RESTART WITH GREATEST(1, mx + 1);
END $$;

COMMIT;

SELECT '✅ Done! All IDs reset. Next estimate: YNM/EST-1' AS result;

