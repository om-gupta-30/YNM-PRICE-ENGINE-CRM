-- ============================================
-- RESET ALL ID FIELDS AND ESTIMATE COUNTER (PRESERVES RELATIONSHIPS)
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
-- STEP 2: Create Mapping Tables and Renumber
-- Strategy: Store old->new ID mappings, then update everything
-- ============================================
DO $$
DECLARE
    rec RECORD;
    new_id INTEGER;
    old_id INTEGER;
BEGIN
    -- Create temporary mapping tables
    CREATE TEMP TABLE account_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    CREATE TEMP TABLE sub_account_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    CREATE TEMP TABLE contact_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    CREATE TEMP TABLE task_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    CREATE TEMP TABLE lead_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    CREATE TEMP TABLE activity_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    CREATE TEMP TABLE notification_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    CREATE TEMP TABLE purpose_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    CREATE TEMP TABLE quote_mbcb_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    CREATE TEMP TABLE quote_signages_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    CREATE TEMP TABLE quote_paint_id_map (old_id INTEGER PRIMARY KEY, new_id INTEGER);
    
    -- ============================================
    -- PHASE 1: Create ID mappings (old_id -> new_id)
    -- ============================================
    
    -- Accounts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        new_id := 0;
        FOR rec IN SELECT id FROM accounts ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO account_id_map VALUES (rec.id, new_id);
        END LOOP;
        RAISE NOTICE '✅ Created account_id_map: % rows', new_id;
    END IF;
    
    -- Sub-accounts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        new_id := 0;
        FOR rec IN SELECT id FROM sub_accounts ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO sub_account_id_map VALUES (rec.id, new_id);
        END LOOP;
        RAISE NOTICE '✅ Created sub_account_id_map: % rows', new_id;
    END IF;
    
    -- Contacts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        new_id := 0;
        FOR rec IN SELECT id FROM contacts ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO contact_id_map VALUES (rec.id, new_id);
        END LOOP;
        RAISE NOTICE '✅ Created contact_id_map: % rows', new_id;
    END IF;
    
    -- Quotes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
        new_id := 0;
        FOR rec IN SELECT id FROM quotes_mbcb ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO quote_mbcb_id_map VALUES (rec.id, new_id);
        END LOOP;
        RAISE NOTICE '✅ Created quote_mbcb_id_map: % rows', new_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
        new_id := 0;
        FOR rec IN SELECT id FROM quotes_signages ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO quote_signages_id_map VALUES (rec.id, new_id);
        END LOOP;
        RAISE NOTICE '✅ Created quote_signages_id_map: % rows', new_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
        new_id := 0;
        FOR rec IN SELECT id FROM quotes_paint ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO quote_paint_id_map VALUES (rec.id, new_id);
        END LOOP;
        RAISE NOTICE '✅ Created quote_paint_id_map: % rows', new_id;
    END IF;
    
    -- Other tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        new_id := 0;
        FOR rec IN SELECT id FROM tasks ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO task_id_map VALUES (rec.id, new_id);
        END LOOP;
        RAISE NOTICE '✅ Created task_id_map: % rows', new_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        new_id := 0;
        FOR rec IN SELECT id FROM leads ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO lead_id_map VALUES (rec.id, new_id);
        END LOOP;
        RAISE NOTICE '✅ Created lead_id_map: % rows', new_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        new_id := 0;
        FOR rec IN SELECT id FROM activities ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO activity_id_map VALUES (rec.id, new_id);
        END LOOP;
        RAISE NOTICE '✅ Created activity_id_map: % rows', new_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        new_id := 0;
        FOR rec IN SELECT id FROM notifications ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO notification_id_map VALUES (rec.id, new_id);
        END LOOP;
        RAISE NOTICE '✅ Created notification_id_map: % rows', new_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purposes') THEN
        new_id := 0;
        FOR rec IN SELECT id FROM purposes ORDER BY id LOOP
            new_id := new_id + 1;
            INSERT INTO purpose_id_map VALUES (rec.id, new_id);
        END LOOP;
        RAISE NOTICE '✅ Created purpose_id_map: % rows', new_id;
    END IF;
    
    -- ============================================
    -- PHASE 2: Update primary keys FIRST (parent tables before children)
    -- IMPORTANT: Update parent tables first, then children can reference them
    -- ============================================
    
    -- Accounts (parent table - update first)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        -- Update accounts primary keys
        UPDATE accounts a
        SET id = m.new_id
        FROM account_id_map m
        WHERE a.id = m.old_id;
        
        RAISE NOTICE '✅ Renumbered accounts';
        
        -- Now update foreign keys that reference accounts (while old_id still exists in mapping)
        -- Update sub_accounts.account_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
            UPDATE sub_accounts s
            SET account_id = m.new_id
            FROM account_id_map m
            WHERE s.account_id = m.old_id;
        END IF;
        
        -- Update contacts.account_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
            UPDATE contacts c
            SET account_id = m.new_id
            FROM account_id_map m
            WHERE c.account_id = m.old_id;
        END IF;
        
        -- Update tasks.account_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
            UPDATE tasks t
            SET account_id = m.new_id
            FROM account_id_map m
            WHERE t.account_id = m.old_id;
        END IF;
        
        -- Update leads.account_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
            UPDATE leads l
            SET account_id = m.new_id
            FROM account_id_map m
            WHERE l.account_id = m.old_id;
        END IF;
        
        -- Update activities.account_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
            UPDATE activities a
            SET account_id = m.new_id
            FROM account_id_map m
            WHERE a.account_id = m.old_id;
        END IF;
        
        -- Update notifications.account_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
            UPDATE notifications n
            SET account_id = m.new_id
            FROM account_id_map m
            WHERE n.account_id = m.old_id;
        END IF;
    END IF;
    
    -- Sub-accounts (update primary keys, then foreign keys that reference it)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        -- Update sub_accounts primary keys
        UPDATE sub_accounts s
        SET id = m.new_id
        FROM sub_account_id_map m
        WHERE s.id = m.old_id;
        
        RAISE NOTICE '✅ Renumbered sub_accounts';
        
        -- Now update foreign keys that reference sub_accounts
        -- Update contacts.sub_account_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
            UPDATE contacts c
            SET sub_account_id = m.new_id
            FROM sub_account_id_map m
            WHERE c.sub_account_id = m.old_id;
        END IF;
        
        -- Update quotes.sub_account_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
            UPDATE quotes_mbcb q
            SET sub_account_id = m.new_id
            FROM sub_account_id_map m
            WHERE q.sub_account_id = m.old_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
            UPDATE quotes_signages q
            SET sub_account_id = m.new_id
            FROM sub_account_id_map m
            WHERE q.sub_account_id = m.old_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
            UPDATE quotes_paint q
            SET sub_account_id = m.new_id
            FROM sub_account_id_map m
            WHERE q.sub_account_id = m.old_id;
        END IF;
        
        -- Update tasks.sub_account_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
            UPDATE tasks t
            SET sub_account_id = m.new_id
            FROM sub_account_id_map m
            WHERE t.sub_account_id = m.old_id;
        END IF;
        
        -- Update leads.sub_account_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
            UPDATE leads l
            SET sub_account_id = m.new_id
            FROM sub_account_id_map m
            WHERE l.sub_account_id = m.old_id;
        END IF;
        
        -- Update activities.sub_account_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
            UPDATE activities a
            SET sub_account_id = m.new_id
            FROM sub_account_id_map m
            WHERE a.sub_account_id = m.old_id;
        END IF;
        
        -- Update notifications.sub_account_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
            UPDATE notifications n
            SET sub_account_id = m.new_id
            FROM sub_account_id_map m
            WHERE n.sub_account_id = m.old_id;
        END IF;
    END IF;
    
    -- Contacts (update primary keys, then foreign keys that reference it)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        -- Update contacts primary keys
        UPDATE contacts c
        SET id = m.new_id
        FROM contact_id_map m
        WHERE c.id = m.old_id;
        
        RAISE NOTICE '✅ Renumbered contacts';
        
        -- Now update foreign keys that reference contacts
        -- Update tasks.contact_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
            UPDATE tasks t
            SET contact_id = m.new_id
            FROM contact_id_map m
            WHERE t.contact_id = m.old_id;
        END IF;
        
        -- Update activities.contact_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
            UPDATE activities a
            SET contact_id = m.new_id
            FROM contact_id_map m
            WHERE a.contact_id = m.old_id;
        END IF;
        
        -- Update notifications.contact_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
            UPDATE notifications n
            SET contact_id = m.new_id
            FROM contact_id_map m
            WHERE n.contact_id = m.old_id;
        END IF;
    END IF;
    
    -- Quotes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
        UPDATE quotes_mbcb q
        SET id = m.new_id
        FROM quote_mbcb_id_map m
        WHERE q.id = m.old_id;
        
        RAISE NOTICE '✅ Renumbered quotes_mbcb';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
        UPDATE quotes_signages q
        SET id = m.new_id
        FROM quote_signages_id_map m
        WHERE q.id = m.old_id;
        
        RAISE NOTICE '✅ Renumbered quotes_signages';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
        UPDATE quotes_paint q
        SET id = m.new_id
        FROM quote_paint_id_map m
        WHERE q.id = m.old_id;
        
        RAISE NOTICE '✅ Renumbered quotes_paint';
    END IF;
    
    -- Tasks (update primary keys, then foreign keys that reference it)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        -- Update tasks primary keys
        UPDATE tasks t
        SET id = m.new_id
        FROM task_id_map m
        WHERE t.id = m.old_id;
        
        RAISE NOTICE '✅ Renumbered tasks';
        
        -- Now update foreign keys that reference tasks
        -- Update notifications.task_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
            UPDATE notifications n
            SET task_id = m.new_id
            FROM task_id_map m
            WHERE n.task_id = m.old_id;
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        UPDATE leads l
        SET id = m.new_id
        FROM lead_id_map m
        WHERE l.id = m.old_id;
        
        RAISE NOTICE '✅ Renumbered leads';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        UPDATE activities a
        SET id = m.new_id
        FROM activity_id_map m
        WHERE a.id = m.old_id;
        
        RAISE NOTICE '✅ Renumbered activities';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        UPDATE notifications n
        SET id = m.new_id
        FROM notification_id_map m
        WHERE n.id = m.old_id;
        
        RAISE NOTICE '✅ Renumbered notifications';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purposes') THEN
        UPDATE purposes p
        SET id = m.new_id
        FROM purpose_id_map m
        WHERE p.id = m.old_id;
        
        RAISE NOTICE '✅ Renumbered purposes';
    END IF;
    
    -- ============================================
    -- PHASE 3: Update foreign keys AFTER primary keys are updated
    -- ============================================
    
    -- All foreign keys have been updated inline above when updating each table
    -- This ensures foreign keys are updated immediately after primary keys
    
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

