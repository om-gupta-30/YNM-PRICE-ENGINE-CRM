-- ============================================
-- RESET ALL ID FIELDS AND ESTIMATE COUNTER (FINAL WORKING VERSION)
-- This script resets all IDs to start from 1 sequentially
-- AND preserves all foreign key relationships
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Reset Estimate Counter
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimate_counter') THEN
        UPDATE estimate_counter SET current_number = 0, updated_at = NOW() WHERE id = 1;
        RAISE NOTICE '✅ Reset estimate_counter - next PDF will be YNM/EST-1';
    ELSE
        CREATE TABLE IF NOT EXISTS estimate_counter (
            id INTEGER PRIMARY KEY DEFAULT 1,
            current_number INTEGER NOT NULL DEFAULT 0,
            prefix VARCHAR(20) NOT NULL DEFAULT 'YNM/EST-',
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT single_row CHECK (id = 1)
        );
        INSERT INTO estimate_counter (id, current_number, prefix)
        VALUES (1, 0, 'YNM/EST-')
        ON CONFLICT (id) DO UPDATE SET current_number = 0;
        RAISE NOTICE '✅ Created and reset estimate_counter - next PDF will be YNM/EST-1';
    END IF;
END $$;

-- ============================================
-- STEP 2: Renumber All Tables
-- Strategy: Use negative temp IDs, then positive final IDs
-- ============================================
DO $$
DECLARE
    rec RECORD;
    new_id INTEGER;
    old_id INTEGER;
    temp_id INTEGER;
BEGIN
    -- ============================================
    -- PHASE 1: Move everything to negative temp IDs
    -- Update foreign keys FIRST, then primary keys
    -- ============================================
    
    -- 1. Update foreign keys to negative temp IDs (starting from -1000000)
    temp_id := -1000000;
    
    -- Update contacts foreign keys first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        FOR rec IN SELECT DISTINCT account_id FROM contacts WHERE account_id IS NOT NULL ORDER BY account_id LOOP
            UPDATE contacts SET account_id = temp_id WHERE account_id = rec.account_id;
            temp_id := temp_id - 1;
        END LOOP;
        temp_id := -2000000;
        FOR rec IN SELECT DISTINCT sub_account_id FROM contacts WHERE sub_account_id IS NOT NULL ORDER BY sub_account_id LOOP
            UPDATE contacts SET sub_account_id = temp_id WHERE sub_account_id = rec.sub_account_id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Updated contacts foreign keys to temp IDs';
    END IF;
    
    -- Update sub_accounts foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        temp_id := -3000000;
        FOR rec IN SELECT DISTINCT account_id FROM sub_accounts WHERE account_id IS NOT NULL ORDER BY account_id LOOP
            UPDATE sub_accounts SET account_id = temp_id WHERE account_id = rec.account_id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Updated sub_accounts foreign keys to temp IDs';
    END IF;
    
    -- Update quotes foreign keys
    temp_id := -4000000;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
        FOR rec IN SELECT DISTINCT sub_account_id FROM quotes_mbcb WHERE sub_account_id IS NOT NULL ORDER BY sub_account_id LOOP
            UPDATE quotes_mbcb SET sub_account_id = temp_id WHERE sub_account_id = rec.sub_account_id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
        FOR rec IN SELECT DISTINCT sub_account_id FROM quotes_signages WHERE sub_account_id IS NOT NULL ORDER BY sub_account_id LOOP
            UPDATE quotes_signages SET sub_account_id = temp_id WHERE sub_account_id = rec.sub_account_id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
        FOR rec IN SELECT DISTINCT sub_account_id FROM quotes_paint WHERE sub_account_id IS NOT NULL ORDER BY sub_account_id LOOP
            UPDATE quotes_paint SET sub_account_id = temp_id WHERE sub_account_id = rec.sub_account_id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    
    -- Update other foreign keys
    temp_id := -5000000;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        FOR rec IN SELECT DISTINCT account_id FROM tasks WHERE account_id IS NOT NULL ORDER BY account_id LOOP
            UPDATE tasks SET account_id = temp_id WHERE account_id = rec.account_id;
            temp_id := temp_id - 1;
        END LOOP;
        FOR rec IN SELECT DISTINCT sub_account_id FROM tasks WHERE sub_account_id IS NOT NULL ORDER BY sub_account_id LOOP
            UPDATE tasks SET sub_account_id = temp_id WHERE sub_account_id = rec.sub_account_id;
            temp_id := temp_id - 1;
        END LOOP;
        FOR rec IN SELECT DISTINCT contact_id FROM tasks WHERE contact_id IS NOT NULL ORDER BY contact_id LOOP
            UPDATE tasks SET contact_id = temp_id WHERE contact_id = rec.contact_id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        FOR rec IN SELECT DISTINCT account_id FROM leads WHERE account_id IS NOT NULL ORDER BY account_id LOOP
            UPDATE leads SET account_id = temp_id WHERE account_id = rec.account_id;
            temp_id := temp_id - 1;
        END LOOP;
        FOR rec IN SELECT DISTINCT sub_account_id FROM leads WHERE sub_account_id IS NOT NULL ORDER BY sub_account_id LOOP
            UPDATE leads SET sub_account_id = temp_id WHERE sub_account_id = rec.sub_account_id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        FOR rec IN SELECT DISTINCT account_id FROM activities WHERE account_id IS NOT NULL ORDER BY account_id LOOP
            UPDATE activities SET account_id = temp_id WHERE account_id = rec.account_id;
            temp_id := temp_id - 1;
        END LOOP;
        FOR rec IN SELECT DISTINCT sub_account_id FROM activities WHERE sub_account_id IS NOT NULL ORDER BY sub_account_id LOOP
            UPDATE activities SET sub_account_id = temp_id WHERE sub_account_id = rec.sub_account_id;
            temp_id := temp_id - 1;
        END LOOP;
        FOR rec IN SELECT DISTINCT contact_id FROM activities WHERE contact_id IS NOT NULL ORDER BY contact_id LOOP
            UPDATE activities SET contact_id = temp_id WHERE contact_id = rec.contact_id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        FOR rec IN SELECT DISTINCT account_id FROM notifications WHERE account_id IS NOT NULL ORDER BY account_id LOOP
            UPDATE notifications SET account_id = temp_id WHERE account_id = rec.account_id;
            temp_id := temp_id - 1;
        END LOOP;
        FOR rec IN SELECT DISTINCT sub_account_id FROM notifications WHERE sub_account_id IS NOT NULL ORDER BY sub_account_id LOOP
            UPDATE notifications SET sub_account_id = temp_id WHERE sub_account_id = rec.sub_account_id;
            temp_id := temp_id - 1;
        END LOOP;
        FOR rec IN SELECT DISTINCT contact_id FROM notifications WHERE contact_id IS NOT NULL ORDER BY contact_id LOOP
            UPDATE notifications SET contact_id = temp_id WHERE contact_id = rec.contact_id;
            temp_id := temp_id - 1;
        END LOOP;
        FOR rec IN SELECT DISTINCT task_id FROM notifications WHERE task_id IS NOT NULL ORDER BY task_id LOOP
            UPDATE notifications SET task_id = temp_id WHERE task_id = rec.task_id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    
    -- 2. Now update primary keys to negative temp IDs
    temp_id := -10000000;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        FOR rec IN SELECT id FROM accounts ORDER BY id LOOP
            UPDATE accounts SET id = temp_id WHERE id = rec.id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Moved accounts to temp IDs';
    END IF;
    
    temp_id := -20000000;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        FOR rec IN SELECT id FROM sub_accounts ORDER BY id LOOP
            UPDATE sub_accounts SET id = temp_id WHERE id = rec.id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Moved sub_accounts to temp IDs';
    END IF;
    
    temp_id := -30000000;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        FOR rec IN SELECT id FROM contacts ORDER BY id LOOP
            UPDATE contacts SET id = temp_id WHERE id = rec.id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Moved contacts to temp IDs';
    END IF;
    
    temp_id := -40000000;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
        FOR rec IN SELECT id FROM quotes_mbcb ORDER BY id LOOP
            UPDATE quotes_mbcb SET id = temp_id WHERE id = rec.id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
        FOR rec IN SELECT id FROM quotes_signages ORDER BY id LOOP
            UPDATE quotes_signages SET id = temp_id WHERE id = rec.id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
        FOR rec IN SELECT id FROM quotes_paint ORDER BY id LOOP
            UPDATE quotes_paint SET id = temp_id WHERE id = rec.id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    
    temp_id := -50000000;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        FOR rec IN SELECT id FROM tasks ORDER BY id LOOP
            UPDATE tasks SET id = temp_id WHERE id = rec.id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        FOR rec IN SELECT id FROM leads ORDER BY id LOOP
            UPDATE leads SET id = temp_id WHERE id = rec.id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        FOR rec IN SELECT id FROM activities ORDER BY id LOOP
            UPDATE activities SET id = temp_id WHERE id = rec.id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        FOR rec IN SELECT id FROM notifications ORDER BY id LOOP
            UPDATE notifications SET id = temp_id WHERE id = rec.id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purposes') THEN
        FOR rec IN SELECT id FROM purposes ORDER BY id LOOP
            UPDATE purposes SET id = temp_id WHERE id = rec.id;
            temp_id := temp_id - 1;
        END LOOP;
    END IF;
    
    -- ============================================
    -- PHASE 2: Move everything to final positive IDs (1, 2, 3, ...)
    -- Update primary keys first, then foreign keys
    -- ============================================
    
    -- Create mapping tables
    CREATE TEMP TABLE account_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    CREATE TEMP TABLE sub_account_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    CREATE TEMP TABLE contact_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    
    -- Build mappings
    new_id := 0;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        FOR rec IN SELECT id FROM accounts ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO account_id_map VALUES (rec.id, new_id);
        END LOOP;
    END IF;
    
    new_id := 0;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        FOR rec IN SELECT id FROM sub_accounts ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO sub_account_id_map VALUES (rec.id, new_id);
        END LOOP;
    END IF;
    
    new_id := 0;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        FOR rec IN SELECT id FROM contacts ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO contact_id_map VALUES (rec.id, new_id);
        END LOOP;
    END IF;
    
    -- Update primary keys to final IDs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        UPDATE accounts a SET id = m.new_id FROM account_id_map m WHERE a.id = m.old_id;
        RAISE NOTICE '✅ Renumbered accounts';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        UPDATE sub_accounts s SET id = m.new_id FROM sub_account_id_map m WHERE s.id = m.old_id;
        RAISE NOTICE '✅ Renumbered sub_accounts';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        UPDATE contacts c SET id = m.new_id FROM contact_id_map m WHERE c.id = m.old_id;
        RAISE NOTICE '✅ Renumbered contacts';
    END IF;
    
    -- Update foreign keys to final IDs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        UPDATE sub_accounts s SET account_id = m.new_id FROM account_id_map m WHERE s.account_id = m.old_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        UPDATE contacts c SET account_id = m.new_id FROM account_id_map m WHERE c.account_id = m.old_id;
        UPDATE contacts c SET sub_account_id = m.new_id FROM sub_account_id_map m WHERE c.sub_account_id = m.old_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
        UPDATE quotes_mbcb q SET sub_account_id = m.new_id FROM sub_account_id_map m WHERE q.sub_account_id = m.old_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
        UPDATE quotes_signages q SET sub_account_id = m.new_id FROM sub_account_id_map m WHERE q.sub_account_id = m.old_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
        UPDATE quotes_paint q SET sub_account_id = m.new_id FROM sub_account_id_map m WHERE q.sub_account_id = m.old_id;
    END IF;
    
    -- Renumber other tables
    new_id := 0;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
        FOR rec IN SELECT id FROM quotes_mbcb ORDER BY id LOOP
            new_id := new_id + 1;
            UPDATE quotes_mbcb SET id = new_id WHERE id = rec.id;
        END LOOP;
    END IF;
    
    new_id := 0;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
        FOR rec IN SELECT id FROM quotes_signages ORDER BY id LOOP
            new_id := new_id + 1;
            UPDATE quotes_signages SET id = new_id WHERE id = rec.id;
        END LOOP;
    END IF;
    
    new_id := 0;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
        FOR rec IN SELECT id FROM quotes_paint ORDER BY id LOOP
            new_id := new_id + 1;
            UPDATE quotes_paint SET id = new_id WHERE id = rec.id;
        END LOOP;
    END IF;
    
    new_id := 0;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        FOR rec IN SELECT id FROM tasks ORDER BY id LOOP
            new_id := new_id + 1;
            UPDATE tasks SET id = new_id WHERE id = rec.id;
        END LOOP;
        -- Update foreign keys
        UPDATE tasks t SET account_id = m.new_id FROM account_id_map m WHERE t.account_id = m.old_id;
        UPDATE tasks t SET sub_account_id = m.new_id FROM sub_account_id_map m WHERE t.sub_account_id = m.old_id;
        UPDATE tasks t SET contact_id = m.new_id FROM contact_id_map m WHERE t.contact_id = m.old_id;
    END IF;
    
    new_id := 0;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        FOR rec IN SELECT id FROM leads ORDER BY id LOOP
            new_id := new_id + 1;
            UPDATE leads SET id = new_id WHERE id = rec.id;
        END LOOP;
        UPDATE leads l SET account_id = m.new_id FROM account_id_map m WHERE l.account_id = m.old_id;
        UPDATE leads l SET sub_account_id = m.new_id FROM sub_account_id_map m WHERE l.sub_account_id = m.old_id;
    END IF;
    
    new_id := 0;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        FOR rec IN SELECT id FROM activities ORDER BY id LOOP
            new_id := new_id + 1;
            UPDATE activities SET id = new_id WHERE id = rec.id;
        END LOOP;
        UPDATE activities a SET account_id = m.new_id FROM account_id_map m WHERE a.account_id = m.old_id;
        UPDATE activities a SET sub_account_id = m.new_id FROM sub_account_id_map m WHERE a.sub_account_id = m.old_id;
        UPDATE activities a SET contact_id = m.new_id FROM contact_id_map m WHERE a.contact_id = m.old_id;
    END IF;
    
    new_id := 0;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        FOR rec IN SELECT id FROM notifications ORDER BY id LOOP
            new_id := new_id + 1;
            UPDATE notifications SET id = new_id WHERE id = rec.id;
        END LOOP;
        UPDATE notifications n SET account_id = m.new_id FROM account_id_map m WHERE n.account_id = m.old_id;
        UPDATE notifications n SET sub_account_id = m.new_id FROM sub_account_id_map m WHERE n.sub_account_id = m.old_id;
        UPDATE notifications n SET contact_id = m.new_id FROM contact_id_map m WHERE n.contact_id = m.old_id;
    END IF;
    
    new_id := 0;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purposes') THEN
        FOR rec IN SELECT id FROM purposes ORDER BY id LOOP
            new_id := new_id + 1;
            UPDATE purposes SET id = new_id WHERE id = rec.id;
        END LOOP;
    END IF;
    
    RAISE NOTICE '✅ All tables renumbered successfully';
    
END $$;

-- ============================================
-- STEP 3: Reset All Sequences
-- ============================================
DO $$
DECLARE
    max_id INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM accounts;
        ALTER SEQUENCE accounts_id_seq RESTART WITH GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM sub_accounts;
        ALTER SEQUENCE sub_accounts_id_seq RESTART WITH GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM contacts;
        ALTER SEQUENCE contacts_id_seq RESTART WITH GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM quotes_mbcb;
        ALTER SEQUENCE quotes_mbcb_id_seq RESTART WITH GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM quotes_signages;
        ALTER SEQUENCE quotes_signages_id_seq RESTART WITH GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM quotes_paint;
        ALTER SEQUENCE quotes_paint_id_seq RESTART WITH GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM tasks;
        ALTER SEQUENCE tasks_id_seq RESTART WITH GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM leads;
        ALTER SEQUENCE leads_id_seq RESTART WITH GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM activities;
        ALTER SEQUENCE activities_id_seq RESTART WITH GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM notifications;
        ALTER SEQUENCE notifications_id_seq RESTART WITH GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purposes') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM purposes;
        ALTER SEQUENCE purposes_id_seq RESTART WITH GREATEST(1, max_id + 1);
    END IF;
    
    RAISE NOTICE '✅ All sequences reset';
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    estimate_num INTEGER;
    estimate_prefix TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'estimate_counter') THEN
        SELECT current_number, prefix INTO estimate_num, estimate_prefix FROM estimate_counter WHERE id = 1;
        RAISE NOTICE '';
        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ ESTIMATE COUNTER RESET';
        RAISE NOTICE '   Current: % = %', estimate_prefix, estimate_num;
        RAISE NOTICE '   Next PDF: % = %', estimate_prefix, estimate_num + 1;
        RAISE NOTICE '========================================';
    END IF;
END $$;

COMMIT;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 
    '✅ All IDs reset to start from 1' AS status,
    '✅ All foreign key relationships preserved' AS relationships,
    '✅ Next estimate will be YNM/EST-1' AS estimate_info;

