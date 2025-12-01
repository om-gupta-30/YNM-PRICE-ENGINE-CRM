-- =====================================================
-- REMOVE REDUNDANT COLUMNS - SINGLE SQL SCRIPT
-- Fixes schema to match current system architecture:
-- 1. Removes customer_name from quotes tables (we use sub_account_id)
-- 2. Removes contact details from accounts table (contacts are in contacts table)
-- 3. Removes state_id and city_id from accounts table (parent accounts don't have location)
-- =====================================================

-- STEP 1: Remove customer_name column from quotes_mbcb table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes_mbcb' AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE quotes_mbcb DROP COLUMN customer_name;
        RAISE NOTICE 'Removed customer_name column from quotes_mbcb table';
    ELSE
        RAISE NOTICE 'customer_name column does not exist in quotes_mbcb table (already removed or never existed)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing customer_name from quotes_mbcb: %', SQLERRM;
END $$;

-- STEP 2: Remove customer_name column from quotes_signages table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes_signages' AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE quotes_signages DROP COLUMN customer_name;
        RAISE NOTICE 'Removed customer_name column from quotes_signages table';
    ELSE
        RAISE NOTICE 'customer_name column does not exist in quotes_signages table (already removed or never existed)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing customer_name from quotes_signages: %', SQLERRM;
END $$;

-- STEP 3: Remove customer_name column from quotes_paint table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes_paint' AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE quotes_paint DROP COLUMN customer_name;
        RAISE NOTICE 'Removed customer_name column from quotes_paint table';
    ELSE
        RAISE NOTICE 'customer_name column does not exist in quotes_paint table (already removed or never existed)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing customer_name from quotes_paint: %', SQLERRM;
END $$;

-- STEP 4: Remove contact_person column from accounts table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'contact_person'
    ) THEN
        ALTER TABLE accounts DROP COLUMN contact_person;
        RAISE NOTICE 'Removed contact_person column from accounts table';
    ELSE
        RAISE NOTICE 'contact_person column does not exist in accounts table (already removed or never existed)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing contact_person from accounts: %', SQLERRM;
END $$;

-- STEP 5: Remove phone column from accounts table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'phone'
    ) THEN
        ALTER TABLE accounts DROP COLUMN phone;
        RAISE NOTICE 'Removed phone column from accounts table';
    ELSE
        RAISE NOTICE 'phone column does not exist in accounts table (already removed or never existed)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing phone from accounts: %', SQLERRM;
END $$;

-- STEP 6: Remove email column from accounts table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'email'
    ) THEN
        ALTER TABLE accounts DROP COLUMN email;
        RAISE NOTICE 'Removed email column from accounts table';
    ELSE
        RAISE NOTICE 'email column does not exist in accounts table (already removed or never existed)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing email from accounts: %', SQLERRM;
END $$;

-- STEP 7: Remove address column from accounts table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'address'
    ) THEN
        ALTER TABLE accounts DROP COLUMN address;
        RAISE NOTICE 'Removed address column from accounts table';
    ELSE
        RAISE NOTICE 'address column does not exist in accounts table (already removed or never existed)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing address from accounts: %', SQLERRM;
END $$;

-- STEP 8: Remove state_id column from accounts table (parent accounts don't have location)
DO $$
BEGIN
    -- First, drop foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'accounts' 
            AND kcu.column_name = 'state_id'
            AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE accounts DROP CONSTRAINT accounts_state_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint for accounts.state_id';
    END IF;

    -- Now drop the column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'state_id'
    ) THEN
        ALTER TABLE accounts DROP COLUMN state_id;
        RAISE NOTICE 'Removed state_id column from accounts table';
    ELSE
        RAISE NOTICE 'state_id column does not exist in accounts table (already removed or never existed)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing state_id from accounts: %', SQLERRM;
END $$;

-- STEP 9: Remove city_id column from accounts table (parent accounts don't have location)
DO $$
BEGIN
    -- First, drop foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'accounts' 
            AND kcu.column_name = 'city_id'
            AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE accounts DROP CONSTRAINT accounts_city_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint for accounts.city_id';
    END IF;

    -- Now drop the column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'city_id'
    ) THEN
        ALTER TABLE accounts DROP COLUMN city_id;
        RAISE NOTICE 'Removed city_id column from accounts table';
    ELSE
        RAISE NOTICE 'city_id column does not exist in accounts table (already removed or never existed)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing city_id from accounts: %', SQLERRM;
END $$;

-- STEP 10: Drop old indexes on customer_name if they exist
DROP INDEX IF EXISTS idx_quotes_mbcb_customer_name;
DROP INDEX IF EXISTS idx_quotes_signages_customer_name;
DROP INDEX IF EXISTS idx_quotes_paint_customer_name;

-- STEP 11: Drop indexes on accounts state_id and city_id if they exist
DROP INDEX IF EXISTS idx_accounts_state_id;
DROP INDEX IF EXISTS idx_accounts_city_id;

-- STEP 12: Verify changes
DO $$
DECLARE
    mbcb_has_customer_name BOOLEAN;
    signages_has_customer_name BOOLEAN;
    paint_has_customer_name BOOLEAN;
    accounts_has_contact_person BOOLEAN;
    accounts_has_phone BOOLEAN;
    accounts_has_email BOOLEAN;
    accounts_has_address BOOLEAN;
    accounts_has_state_id BOOLEAN;
    accounts_has_city_id BOOLEAN;
BEGIN
    -- Check quotes tables
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes_mbcb' AND column_name = 'customer_name'
    ) INTO mbcb_has_customer_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes_signages' AND column_name = 'customer_name'
    ) INTO signages_has_customer_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes_paint' AND column_name = 'customer_name'
    ) INTO paint_has_customer_name;
    
    -- Check accounts table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'contact_person'
    ) INTO accounts_has_contact_person;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'phone'
    ) INTO accounts_has_phone;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'email'
    ) INTO accounts_has_email;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'address'
    ) INTO accounts_has_address;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'state_id'
    ) INTO accounts_has_state_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounts' AND column_name = 'city_id'
    ) INTO accounts_has_city_id;
    
    RAISE NOTICE '=== COLUMN REMOVAL SUMMARY ===';
    RAISE NOTICE 'quotes_mbcb.customer_name exists: %', mbcb_has_customer_name;
    RAISE NOTICE 'quotes_signages.customer_name exists: %', signages_has_customer_name;
    RAISE NOTICE 'quotes_paint.customer_name exists: %', paint_has_customer_name;
    RAISE NOTICE 'accounts.contact_person exists: %', accounts_has_contact_person;
    RAISE NOTICE 'accounts.phone exists: %', accounts_has_phone;
    RAISE NOTICE 'accounts.email exists: %', accounts_has_email;
    RAISE NOTICE 'accounts.address exists: %', accounts_has_address;
    RAISE NOTICE 'accounts.state_id exists: %', accounts_has_state_id;
    RAISE NOTICE 'accounts.city_id exists: %', accounts_has_city_id;
    RAISE NOTICE '================================';
END $$;

-- Final verification query (returns results you can check)
SELECT 
    'quotes_mbcb' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'quotes_mbcb'
  AND column_name IN ('customer_name', 'sub_account_id', 'sub_account_name')
UNION ALL
SELECT 
    'quotes_signages' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'quotes_signages'
  AND column_name IN ('customer_name', 'sub_account_id', 'sub_account_name')
UNION ALL
SELECT 
    'quotes_paint' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'quotes_paint'
  AND column_name IN ('customer_name', 'sub_account_id', 'sub_account_name')
UNION ALL
SELECT 
    'accounts' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'accounts'
  AND column_name IN ('contact_person', 'phone', 'email', 'address', 'state_id', 'city_id')
ORDER BY table_name, column_name;
