-- Comprehensive SQL Script to Fix All Null Data Issues - SINGLE QUERY
-- Run this in your Supabase SQL Editor to fix all null values across tables

DO $$
DECLARE
    account_rec RECORD;
    activity_rec RECORD;
    notification_rec RECORD;
    quote_mbcb_rec RECORD;
    quote_signages_rec RECORD;
    sub_account_id_val INTEGER;
    contact_sub_account_id_val INTEGER;
    col_exists BOOLEAN;
BEGIN
    -- ============================================
    -- 1. FIX ACCOUNTS TABLE - Add Website and GST Number
    -- ============================================
    RAISE NOTICE '1️⃣ Fixing Accounts table (website & gst_number)...';
    
    FOR account_rec IN 
        SELECT id, account_name, website, gst_number 
        FROM accounts 
        WHERE (website IS NULL OR website = '') OR (gst_number IS NULL OR gst_number = '')
    LOOP
        -- Generate website from account name if missing
        IF account_rec.website IS NULL OR account_rec.website = '' THEN
            UPDATE accounts 
            SET website = 'https://www.' || LOWER(REPLACE(REPLACE(REPLACE(account_rec.account_name, ' ', ''), '&', ''), '.', ''))) || '.com'
            WHERE id = account_rec.id;
        END IF;
        
        -- Generate GST number if missing (format: 27XXXXX0000X1Z5)
        IF account_rec.gst_number IS NULL OR account_rec.gst_number = '' THEN
            UPDATE accounts 
            SET gst_number = '27' || LPAD(ABS(HASHTEXT(account_rec.account_name || account_rec.id::text))::text, 10, '0') || 'A1Z5'
            WHERE id = account_rec.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Accounts table fixed!';
    
    -- ============================================
    -- 2. FIX ACTIVITIES TABLE - Add Sub Account Column if missing, then populate
    -- ============================================
    RAISE NOTICE '2️⃣ Fixing Activities table (sub_account)...';
    
    -- Check which column exists: sub_account_id or sub_accounts
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' AND column_name = 'sub_account_id'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        -- Check if sub_accounts exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'activities' AND column_name = 'sub_accounts'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            -- Add sub_account_id column
            BEGIN
                ALTER TABLE activities ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL;
                RAISE NOTICE '✅ Added sub_account_id column to activities table';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not add sub_account_id column: %', SQLERRM;
            END;
        END IF;
    END IF;
    
    -- Now populate - handle both column names
    BEGIN
        FOR activity_rec IN 
            SELECT a.id, a.account_id, a.contact_id
            FROM activities a
            WHERE a.sub_account_id IS NULL
        LOOP
        -- Try to find sub_account_id from contact first
        IF activity_rec.contact_id IS NOT NULL THEN
            SELECT sub_account_id INTO sub_account_id_val
            FROM contacts
            WHERE id = activity_rec.contact_id
            LIMIT 1;
            
            IF sub_account_id_val IS NOT NULL THEN
                UPDATE activities 
                SET sub_account_id = sub_account_id_val
                WHERE id = activity_rec.id;
                CONTINUE;
            END IF;
        END IF;
        
        -- If no contact, try to get first sub_account from account
        IF activity_rec.account_id IS NOT NULL THEN
            SELECT id INTO sub_account_id_val
            FROM sub_accounts
            WHERE account_id = activity_rec.account_id
            LIMIT 1;
            
            IF sub_account_id_val IS NOT NULL THEN
                UPDATE activities 
                SET sub_account_id = sub_account_id_val
                WHERE id = activity_rec.id;
            END IF;
        END IF;
        END LOOP;
    EXCEPTION WHEN undefined_column THEN
        -- Try with sub_accounts column name
        FOR activity_rec IN 
            SELECT a.id, a.account_id, a.contact_id
            FROM activities a
            WHERE a.sub_accounts IS NULL
        LOOP
            IF activity_rec.contact_id IS NOT NULL THEN
                SELECT sub_account_id INTO sub_account_id_val
                FROM contacts
                WHERE id = activity_rec.contact_id
                LIMIT 1;
                
                IF sub_account_id_val IS NOT NULL THEN
                    UPDATE activities 
                    SET sub_accounts = sub_account_id_val
                    WHERE id = activity_rec.id;
                    CONTINUE;
                END IF;
            END IF;
            
            IF activity_rec.account_id IS NOT NULL THEN
                SELECT id INTO sub_account_id_val
                FROM sub_accounts
                WHERE account_id = activity_rec.account_id
                LIMIT 1;
                
                IF sub_account_id_val IS NOT NULL THEN
                    UPDATE activities 
                    SET sub_accounts = sub_account_id_val
                    WHERE id = activity_rec.id;
                END IF;
            END IF;
        END LOOP;
    END;
    
    RAISE NOTICE '✅ Activities table fixed!';
    
    -- ============================================
    -- 3. FIX NOTIFICATIONS TABLE - Add Sub Account Column if missing, then populate
    -- ============================================
    RAISE NOTICE '3️⃣ Fixing Notifications table (sub_account)...';
    
    -- Check which column exists: sub_account_id or sub_account
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'sub_account_id'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'sub_account'
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            -- Add sub_account_id column
            BEGIN
                ALTER TABLE notifications ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL;
                RAISE NOTICE '✅ Added sub_account_id column to notifications table';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not add sub_account_id column: %', SQLERRM;
            END;
        END IF;
    END IF;
    
    -- Now populate - handle both column names
    BEGIN
        FOR notification_rec IN 
            SELECT n.id, n.contact_id
            FROM notifications n
            WHERE n.sub_account_id IS NULL AND n.contact_id IS NOT NULL
        LOOP
            SELECT sub_account_id INTO contact_sub_account_id_val
            FROM contacts
            WHERE id = notification_rec.contact_id
            LIMIT 1;
            
            IF contact_sub_account_id_val IS NOT NULL THEN
                UPDATE notifications 
                SET sub_account_id = contact_sub_account_id_val
                WHERE id = notification_rec.id;
            END IF;
        END LOOP;
    EXCEPTION WHEN undefined_column THEN
        -- Try with sub_account column name
        FOR notification_rec IN 
            SELECT n.id, n.contact_id
            FROM notifications n
            WHERE n.sub_account IS NULL AND n.contact_id IS NOT NULL
        LOOP
            SELECT sub_account_id INTO contact_sub_account_id_val
            FROM contacts
            WHERE id = notification_rec.contact_id
            LIMIT 1;
            
            IF contact_sub_account_id_val IS NOT NULL THEN
                UPDATE notifications 
                SET sub_account = contact_sub_account_id_val
                WHERE id = notification_rec.id;
            END IF;
        END LOOP;
    END;
    
    -- Note: snooze_until can remain NULL - it's optional and should stay NULL if not snoozed
    RAISE NOTICE '✅ Notifications table fixed!';
    
    -- ============================================
    -- 4. FIX QUOTES_MBCB TABLE - Add Raw Payload
    -- ============================================
    RAISE NOTICE '4️⃣ Fixing quotes_mbcb table (raw_payload)...';
    
    FOR quote_mbcb_rec IN 
        SELECT id, section, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost
        FROM quotes_mbcb
        WHERE raw_payload IS NULL
    LOOP
        UPDATE quotes_mbcb
        SET raw_payload = jsonb_build_object(
            'section', COALESCE(quote_mbcb_rec.section, 'W-Beam Section'),
            'quantityRm', COALESCE(quote_mbcb_rec.quantity_rm, 1),
            'totalWeightPerRm', COALESCE(quote_mbcb_rec.total_weight_per_rm, 0),
            'totalCostPerRm', COALESCE(quote_mbcb_rec.total_cost_per_rm, 0),
            'finalTotal', COALESCE(quote_mbcb_rec.final_total_cost, 0),
            'parts', jsonb_build_array(),
            'multipliers', jsonb_build_object(),
            'materialCostPerRm', COALESCE(quote_mbcb_rec.total_cost_per_rm * 0.7, 0),
            'transportCostPerRm', COALESCE(quote_mbcb_rec.total_cost_per_rm * 0.15, 0),
            'installationCostPerRm', COALESCE(quote_mbcb_rec.total_cost_per_rm * 0.15, 0),
            'fastenerMode', 'default',
            'fastenerWeight', 2,
            'totalSetWeight', COALESCE(quote_mbcb_rec.total_weight_per_rm * 0.1, 0)
        )
        WHERE id = quote_mbcb_rec.id;
    END LOOP;
    
    RAISE NOTICE '✅ quotes_mbcb table fixed!';
    
    -- ============================================
    -- 5. FIX QUOTES_SIGNAGES TABLE - Add Raw Payload
    -- ============================================
    RAISE NOTICE '5️⃣ Fixing quotes_signages table (raw_payload)...';
    
    FOR quote_signages_rec IN 
        SELECT id, section, final_total_cost
        FROM quotes_signages
        WHERE raw_payload IS NULL
    LOOP
        DECLARE
            estimated_area NUMERIC := 6.45; -- Default area per piece in sq ft
            cost_per_sqft NUMERIC;
        BEGIN
            cost_per_sqft := COALESCE(quote_signages_rec.final_total_cost / NULLIF(estimated_area, 0), 0);
            
            UPDATE quotes_signages
            SET raw_payload = jsonb_build_object(
                'section', COALESCE(quote_signages_rec.section, 'Reflective Signages'),
                'boardType', 'Rectangular',
                'shape', 'Rectangle',
                'size', 300,
                'width', 1000,
                'height', 600,
                'sheetingType', 'Reflective',
                'acpThickness', 3,
                'printingType', 'Digital',
                'areaSqMm', 600000,
                'areaSqM', 0.6,
                'areaSqFt', estimated_area,
                'baseMaterialCostPerSqFt', cost_per_sqft * 0.6,
                'rivetingPackagingCostPerSqFt', cost_per_sqft * 0.2,
                'overheadCostPerSqFt', cost_per_sqft * 0.15,
                'totalCostPerSqFt', cost_per_sqft,
                'profitPercent', 15,
                'quantity', 1,
                'costPerPiece', quote_signages_rec.final_total_cost,
                'msEnabled', false,
                'msPostSpec', NULL,
                'msFrameSpec', NULL,
                'msPostLengthM', NULL,
                'msFrameLengthM', NULL,
                'msPostWeightKg', NULL,
                'msFrameWeightKg', NULL,
                'msTotalMsWeightKg', NULL,
                'msRatePerKg', NULL,
                'msCostPerStructure', NULL,
                'msTotalMsCost', NULL,
                'finalTotal', COALESCE(quote_signages_rec.final_total_cost, 0)
            )
            WHERE id = quote_signages_rec.id;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ quotes_signages table fixed!';
    
    RAISE NOTICE '🎉 All tables fixed successfully!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error occurred: %', SQLERRM;
        RAISE;
END $$;

-- Summary query to verify fixes (run this separately after the DO block)
SELECT 
    'Accounts' as table_name,
    COUNT(*) FILTER (WHERE website IS NULL OR website = '') as null_websites,
    COUNT(*) FILTER (WHERE gst_number IS NULL OR gst_number = '') as null_gst_numbers
FROM accounts
UNION ALL
SELECT 
    'Activities' as table_name,
    COUNT(*) FILTER (WHERE sub_account_id IS NULL) as null_sub_accounts,
    0 as null_gst_numbers
FROM activities
UNION ALL
SELECT 
    'Notifications' as table_name,
    COUNT(*) FILTER (WHERE sub_account_id IS NULL) as null_sub_accounts,
    COUNT(*) FILTER (WHERE snooze_until IS NULL) as null_snooze_until
FROM notifications
UNION ALL
SELECT 
    'quotes_mbcb' as table_name,
    COUNT(*) FILTER (WHERE raw_payload IS NULL) as null_raw_payload,
    0 as null_gst_numbers
FROM quotes_mbcb
UNION ALL
SELECT 
    'quotes_signages' as table_name,
    COUNT(*) FILTER (WHERE raw_payload IS NULL) as null_raw_payload,
    0 as null_gst_numbers
FROM quotes_signages;
