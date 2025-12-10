-- ============================================
-- RESET ALL ID FIELDS AND ESTIMATE COUNTER (FIXED VERSION)
-- This script will:
-- 1. Reset all table ID sequences to start from 1
-- 2. Reset estimate_counter so next PDF will be YNM/EST-1
-- 3. Renumber all existing records sequentially (1, 2, 3, ...)
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
        RAISE NOTICE '⚠️ estimate_counter table does not exist - creating it...';
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
-- STEP 2: Renumber All Tables (Two-Phase Approach)
-- ============================================
-- Phase 1: Set all IDs to negative temporary values
-- Phase 2: Set all IDs to sequential positive values (1, 2, 3, ...)
-- IMPORTANT: Update foreign keys BEFORE changing parent table IDs

DO $$
DECLARE
    table_record RECORD;
    new_id INTEGER;
    old_id INTEGER;
    temp_id INTEGER;
BEGIN
    -- ============================================
    -- PHASE 1: Set all IDs to negative temporary values
    -- Update foreign keys FIRST, then parent IDs
    -- ============================================
    
    -- 1. Contacts (child of sub_accounts and accounts) - no children, safe to update
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        temp_id := -1000000;
        FOR table_record IN SELECT id FROM contacts ORDER BY id LOOP
            UPDATE contacts SET id = temp_id WHERE id = table_record.id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Phase 1: Contacts IDs set to temporary negative values';
    END IF;
    
    -- 2. Sub-accounts (child of accounts) - update foreign keys in child tables FIRST
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        temp_id := -2000000;
        FOR table_record IN SELECT id FROM sub_accounts ORDER BY id LOOP
            old_id := table_record.id;
            -- Update foreign keys in child tables BEFORE changing sub_accounts ID
            UPDATE contacts SET sub_account_id = temp_id WHERE sub_account_id = old_id;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
                UPDATE quotes_mbcb SET sub_account_id = temp_id WHERE sub_account_id = old_id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
                UPDATE quotes_signages SET sub_account_id = temp_id WHERE sub_account_id = old_id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
                UPDATE quotes_paint SET sub_account_id = temp_id WHERE sub_account_id = old_id;
            END IF;
            -- Now safe to update sub_accounts ID
            UPDATE sub_accounts SET id = temp_id WHERE id = old_id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Phase 1: Sub-accounts IDs set to temporary negative values';
    END IF;
    
    -- 3. Accounts (parent table) - update foreign keys in child tables FIRST
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        temp_id := -3000000;
        FOR table_record IN SELECT id FROM accounts ORDER BY id LOOP
            old_id := table_record.id;
            -- Update foreign keys in child tables BEFORE changing accounts ID
            UPDATE sub_accounts SET account_id = temp_id WHERE account_id = old_id;
            UPDATE contacts SET account_id = temp_id WHERE account_id = old_id;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
                UPDATE leads SET account_id = temp_id WHERE account_id = old_id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
                UPDATE tasks SET account_id = temp_id WHERE account_id = old_id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
                UPDATE activities SET account_id = temp_id WHERE account_id = old_id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
                UPDATE notifications SET account_id = temp_id WHERE account_id = old_id;
            END IF;
            -- Now safe to update accounts ID
            UPDATE accounts SET id = temp_id WHERE id = old_id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Phase 1: Accounts IDs set to temporary negative values';
    END IF;
    
    -- 4. Quotes tables (no children, safe to update)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
        temp_id := -4000000;
        FOR table_record IN SELECT id FROM quotes_mbcb ORDER BY id LOOP
            UPDATE quotes_mbcb SET id = temp_id WHERE id = table_record.id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Phase 1: quotes_mbcb IDs set to temporary negative values';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
        temp_id := -5000000;
        FOR table_record IN SELECT id FROM quotes_signages ORDER BY id LOOP
            UPDATE quotes_signages SET id = temp_id WHERE id = table_record.id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Phase 1: quotes_signages IDs set to temporary negative values';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
        temp_id := -6000000;
        FOR table_record IN SELECT id FROM quotes_paint ORDER BY id LOOP
            UPDATE quotes_paint SET id = temp_id WHERE id = table_record.id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Phase 1: quotes_paint IDs set to temporary negative values';
    END IF;
    
    -- 5. Other tables (update foreign keys first if they reference other tables)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        temp_id := -7000000;
        FOR table_record IN SELECT id FROM tasks ORDER BY id LOOP
            old_id := table_record.id;
            -- Update foreign keys in child tables
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
                UPDATE notifications SET task_id = temp_id WHERE task_id = old_id;
            END IF;
            UPDATE tasks SET id = temp_id WHERE id = old_id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Phase 1: tasks IDs set to temporary negative values';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        temp_id := -8000000;
        FOR table_record IN SELECT id FROM leads ORDER BY id LOOP
            UPDATE leads SET id = temp_id WHERE id = table_record.id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Phase 1: leads IDs set to temporary negative values';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        temp_id := -9000000;
        FOR table_record IN SELECT id FROM activities ORDER BY id LOOP
            UPDATE activities SET id = temp_id WHERE id = table_record.id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Phase 1: activities IDs set to temporary negative values';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        temp_id := -10000000;
        FOR table_record IN SELECT id FROM notifications ORDER BY id LOOP
            UPDATE notifications SET id = temp_id WHERE id = table_record.id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Phase 1: notifications IDs set to temporary negative values';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purposes') THEN
        temp_id := -11000000;
        FOR table_record IN SELECT id FROM purposes ORDER BY id LOOP
            UPDATE purposes SET id = temp_id WHERE id = table_record.id;
            temp_id := temp_id - 1;
        END LOOP;
        RAISE NOTICE '✅ Phase 1: purposes IDs set to temporary negative values';
    END IF;
    
    -- ============================================
    -- PHASE 2: Set all IDs to sequential positive values (1, 2, 3, ...)
    -- Update parent tables first, then update foreign keys, then child tables
    -- ============================================
    
    -- 1. Accounts (parent - must be done first)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        new_id := 0;
        FOR table_record IN SELECT id FROM accounts ORDER BY id LOOP
            new_id := new_id + 1;
            old_id := table_record.id;
            UPDATE accounts SET id = new_id WHERE id = old_id;
            -- Update foreign keys in child tables
            UPDATE sub_accounts SET account_id = new_id WHERE account_id = old_id;
            UPDATE contacts SET account_id = new_id WHERE account_id = old_id;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
                UPDATE leads SET account_id = new_id WHERE account_id = old_id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
                UPDATE tasks SET account_id = new_id WHERE account_id = old_id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
                UPDATE activities SET account_id = new_id WHERE account_id = old_id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
                UPDATE notifications SET account_id = new_id WHERE account_id = old_id;
            END IF;
        END LOOP;
        RAISE NOTICE '✅ Phase 2: Renumbered accounts: % rows', new_id;
    END IF;
    
    -- 2. Sub-accounts (child of accounts)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        new_id := 0;
        FOR table_record IN SELECT id FROM sub_accounts ORDER BY id LOOP
            new_id := new_id + 1;
            old_id := table_record.id;
            UPDATE sub_accounts SET id = new_id WHERE id = old_id;
            -- Update foreign keys in child tables
            UPDATE contacts SET sub_account_id = new_id WHERE sub_account_id = old_id;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
                UPDATE quotes_mbcb SET sub_account_id = new_id WHERE sub_account_id = old_id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
                UPDATE quotes_signages SET sub_account_id = new_id WHERE sub_account_id = old_id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
                UPDATE quotes_paint SET sub_account_id = new_id WHERE sub_account_id = old_id;
            END IF;
        END LOOP;
        RAISE NOTICE '✅ Phase 2: Renumbered sub_accounts: % rows', new_id;
    END IF;
    
    -- 3. Contacts (child of sub_accounts and accounts)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        new_id := 0;
        FOR table_record IN SELECT id FROM contacts ORDER BY id LOOP
            new_id := new_id + 1;
            old_id := table_record.id;
            UPDATE contacts SET id = new_id WHERE id = old_id;
            -- Update foreign keys in child tables
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
                UPDATE activities SET contact_id = new_id WHERE contact_id = old_id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
                UPDATE notifications SET contact_id = new_id WHERE contact_id = old_id;
            END IF;
        END LOOP;
        RAISE NOTICE '✅ Phase 2: Renumbered contacts: % rows', new_id;
    END IF;
    
    -- 4. Quotes tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
        new_id := 0;
        FOR table_record IN SELECT id FROM quotes_mbcb ORDER BY id LOOP
            new_id := new_id + 1;
            old_id := table_record.id;
            UPDATE quotes_mbcb SET id = new_id WHERE id = old_id;
        END LOOP;
        RAISE NOTICE '✅ Phase 2: Renumbered quotes_mbcb: % rows', new_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
        new_id := 0;
        FOR table_record IN SELECT id FROM quotes_signages ORDER BY id LOOP
            new_id := new_id + 1;
            old_id := table_record.id;
            UPDATE quotes_signages SET id = new_id WHERE id = old_id;
        END LOOP;
        RAISE NOTICE '✅ Phase 2: Renumbered quotes_signages: % rows', new_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
        new_id := 0;
        FOR table_record IN SELECT id FROM quotes_paint ORDER BY id LOOP
            new_id := new_id + 1;
            old_id := table_record.id;
            UPDATE quotes_paint SET id = new_id WHERE id = old_id;
        END LOOP;
        RAISE NOTICE '✅ Phase 2: Renumbered quotes_paint: % rows', new_id;
    END IF;
    
    -- 5. Other tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        new_id := 0;
        FOR table_record IN SELECT id FROM tasks ORDER BY id LOOP
            new_id := new_id + 1;
            old_id := table_record.id;
            UPDATE tasks SET id = new_id WHERE id = old_id;
            -- Update foreign keys in child tables
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
                UPDATE notifications SET task_id = new_id WHERE task_id = old_id;
            END IF;
        END LOOP;
        RAISE NOTICE '✅ Phase 2: Renumbered tasks: % rows', new_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        new_id := 0;
        FOR table_record IN SELECT id FROM leads ORDER BY id LOOP
            new_id := new_id + 1;
            old_id := table_record.id;
            UPDATE leads SET id = new_id WHERE id = old_id;
        END LOOP;
        RAISE NOTICE '✅ Phase 2: Renumbered leads: % rows', new_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        new_id := 0;
        FOR table_record IN SELECT id FROM activities ORDER BY id LOOP
            new_id := new_id + 1;
            old_id := table_record.id;
            UPDATE activities SET id = new_id WHERE id = old_id;
        END LOOP;
        RAISE NOTICE '✅ Phase 2: Renumbered activities: % rows', new_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        new_id := 0;
        FOR table_record IN SELECT id FROM notifications ORDER BY id LOOP
            new_id := new_id + 1;
            old_id := table_record.id;
            UPDATE notifications SET id = new_id WHERE id = old_id;
        END LOOP;
        RAISE NOTICE '✅ Phase 2: Renumbered notifications: % rows', new_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purposes') THEN
        new_id := 0;
        FOR table_record IN SELECT id FROM purposes ORDER BY id LOOP
            new_id := new_id + 1;
            old_id := table_record.id;
            UPDATE purposes SET id = new_id WHERE id = old_id;
        END LOOP;
        RAISE NOTICE '✅ Phase 2: Renumbered purposes: % rows', new_id;
    END IF;
    
END $$;

-- ============================================
-- STEP 3: Reset All Sequences (Simplified)
-- ============================================
DO $$
DECLARE
    max_id INTEGER;
    seq_name TEXT;
    table_name TEXT;
BEGIN
    -- Manually reset sequences for known tables
    -- This avoids the pg_sequences view issue
    
    -- Accounts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM accounts;
        ALTER SEQUENCE accounts_id_seq RESTART WITH GREATEST(1, max_id + 1);
        RAISE NOTICE '✅ Reset accounts_id_seq (next ID: %)', GREATEST(1, max_id + 1);
    END IF;
    
    -- Sub-accounts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_accounts') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM sub_accounts;
        ALTER SEQUENCE sub_accounts_id_seq RESTART WITH GREATEST(1, max_id + 1);
        RAISE NOTICE '✅ Reset sub_accounts_id_seq (next ID: %)', GREATEST(1, max_id + 1);
    END IF;
    
    -- Contacts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM contacts;
        ALTER SEQUENCE contacts_id_seq RESTART WITH GREATEST(1, max_id + 1);
        RAISE NOTICE '✅ Reset contacts_id_seq (next ID: %)', GREATEST(1, max_id + 1);
    END IF;
    
    -- Quotes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_mbcb') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM quotes_mbcb;
        ALTER SEQUENCE quotes_mbcb_id_seq RESTART WITH GREATEST(1, max_id + 1);
        RAISE NOTICE '✅ Reset quotes_mbcb_id_seq (next ID: %)', GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_signages') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM quotes_signages;
        ALTER SEQUENCE quotes_signages_id_seq RESTART WITH GREATEST(1, max_id + 1);
        RAISE NOTICE '✅ Reset quotes_signages_id_seq (next ID: %)', GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_paint') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM quotes_paint;
        ALTER SEQUENCE quotes_paint_id_seq RESTART WITH GREATEST(1, max_id + 1);
        RAISE NOTICE '✅ Reset quotes_paint_id_seq (next ID: %)', GREATEST(1, max_id + 1);
    END IF;
    
    -- Other tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM tasks;
        ALTER SEQUENCE tasks_id_seq RESTART WITH GREATEST(1, max_id + 1);
        RAISE NOTICE '✅ Reset tasks_id_seq (next ID: %)', GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM leads;
        ALTER SEQUENCE leads_id_seq RESTART WITH GREATEST(1, max_id + 1);
        RAISE NOTICE '✅ Reset leads_id_seq (next ID: %)', GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM activities;
        ALTER SEQUENCE activities_id_seq RESTART WITH GREATEST(1, max_id + 1);
        RAISE NOTICE '✅ Reset activities_id_seq (next ID: %)', GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM notifications;
        ALTER SEQUENCE notifications_id_seq RESTART WITH GREATEST(1, max_id + 1);
        RAISE NOTICE '✅ Reset notifications_id_seq (next ID: %)', GREATEST(1, max_id + 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purposes') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_id FROM purposes;
        ALTER SEQUENCE purposes_id_seq RESTART WITH GREATEST(1, max_id + 1);
        RAISE NOTICE '✅ Reset purposes_id_seq (next ID: %)', GREATEST(1, max_id + 1);
    END IF;
    
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    estimate_num INTEGER;
    estimate_prefix TEXT;
BEGIN
    -- Check estimate counter
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
    '✅ All ID sequences have been reset to start from 1' AS status,
    '✅ Next estimate will be YNM/EST-1' AS estimate_info;

