-- ============================================
-- SIMPLIFY ACCOUNTS TABLE AND REMOVE CUSTOMERS TABLE
-- ============================================
-- This script:
-- 1. Removes unnecessary columns from accounts table
-- 2. Drops customers table
-- 3. Drops employee_customer junction table
-- ============================================
-- Run this in your Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- 1. REMOVE COLUMNS FROM ACCOUNTS TABLE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Removing columns from accounts table...';
    
    -- Remove contact_person
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'contact_person') THEN
        ALTER TABLE accounts DROP COLUMN contact_person;
        RAISE NOTICE '✓ Removed contact_person column';
    END IF;
    
    -- Remove phone
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'phone') THEN
        ALTER TABLE accounts DROP COLUMN phone;
        RAISE NOTICE '✓ Removed phone column';
    END IF;
    
    -- Remove email
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'email') THEN
        ALTER TABLE accounts DROP COLUMN email;
        RAISE NOTICE '✓ Removed email column';
    END IF;
    
    -- Remove address
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'address') THEN
        ALTER TABLE accounts DROP COLUMN address;
        RAISE NOTICE '✓ Removed address column';
    END IF;
    
    -- Remove website
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'website') THEN
        ALTER TABLE accounts DROP COLUMN website;
        RAISE NOTICE '✓ Removed website column';
    END IF;
    
    -- Remove gst_number
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'gst_number') THEN
        ALTER TABLE accounts DROP COLUMN gst_number;
        RAISE NOTICE '✓ Removed gst_number column';
    END IF;
    
    -- Remove state_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'state_id') THEN
        ALTER TABLE accounts DROP COLUMN state_id CASCADE;
        RAISE NOTICE '✓ Removed state_id column';
    END IF;
    
    -- Remove city_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'city_id') THEN
        ALTER TABLE accounts DROP COLUMN city_id CASCADE;
        RAISE NOTICE '✓ Removed city_id column';
    END IF;
    
    -- Remove related_products (if it exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'related_products') THEN
        ALTER TABLE accounts DROP COLUMN related_products;
        RAISE NOTICE '✓ Removed related_products column';
    END IF;
    
    RAISE NOTICE 'Column removal completed!';
END $$;

-- ============================================
-- 1.5. REMOVE CUSTOMER_ID FROM TASKS TABLE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Removing customer_id and customer_name from tasks table...';
    
    -- Remove customer_id from tasks
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'customer_id') THEN
        ALTER TABLE tasks DROP COLUMN customer_id CASCADE;
        RAISE NOTICE '✓ Removed customer_id column from tasks';
    END IF;
    
    -- Remove customer_name from tasks
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'customer_name') THEN
        ALTER TABLE tasks DROP COLUMN customer_name;
        RAISE NOTICE '✓ Removed customer_name column from tasks';
    END IF;
    
    RAISE NOTICE 'Tasks table cleanup completed!';
END $$;

-- ============================================
-- 2. DROP EMPLOYEE_CUSTOMER JUNCTION TABLE
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_customer') THEN
        DROP TABLE IF EXISTS employee_customer CASCADE;
        RAISE NOTICE '✓ Dropped employee_customer table';
    ELSE
        RAISE NOTICE 'employee_customer table does not exist';
    END IF;
END $$;

-- ============================================
-- 3. DROP CUSTOMERS TABLE
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        -- First, drop foreign key constraints that reference customers
        -- Tasks table might reference customers
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%customer%' 
            AND table_name = 'tasks'
        ) THEN
            -- Drop foreign key constraint from tasks
            ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_customer_id_fkey CASCADE;
            RAISE NOTICE '✓ Dropped foreign key constraint from tasks';
        END IF;
        
        -- Quotes tables might reference customers
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%customer%' 
            AND table_name = 'quotes_mbcb'
        ) THEN
            ALTER TABLE quotes_mbcb DROP CONSTRAINT IF EXISTS quotes_mbcb_customer_id_fkey CASCADE;
            RAISE NOTICE '✓ Dropped foreign key constraint from quotes_mbcb';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%customer%' 
            AND table_name = 'quotes_signages'
        ) THEN
            ALTER TABLE quotes_signages DROP CONSTRAINT IF EXISTS quotes_signages_customer_id_fkey CASCADE;
            RAISE NOTICE '✓ Dropped foreign key constraint from quotes_signages';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%customer%' 
            AND table_name = 'quotes_paint'
        ) THEN
            ALTER TABLE quotes_paint DROP CONSTRAINT IF EXISTS quotes_paint_customer_id_fkey CASCADE;
            RAISE NOTICE '✓ Dropped foreign key constraint from quotes_paint';
        END IF;
        
        -- Now drop the customers table
        DROP TABLE IF EXISTS customers CASCADE;
        RAISE NOTICE '✓ Dropped customers table';
    ELSE
        RAISE NOTICE 'customers table does not exist';
    END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    account_columns TEXT[];
    customers_exists BOOLEAN;
    employee_customer_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '========================================';
    
    -- Check accounts table columns
    SELECT array_agg(column_name ORDER BY ordinal_position) INTO account_columns
    FROM information_schema.columns
    WHERE table_name = 'accounts' AND table_schema = 'public';
    
    RAISE NOTICE 'Accounts table columns: %', array_to_string(account_columns, ', ');
    
    -- Check if customers table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'customers' AND table_schema = 'public'
    ) INTO customers_exists;
    
    IF customers_exists THEN
        RAISE NOTICE '⚠ customers table still exists!';
    ELSE
        RAISE NOTICE '✓ customers table removed';
    END IF;
    
    -- Check if employee_customer table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'employee_customer' AND table_schema = 'public'
    ) INTO employee_customer_exists;
    
    IF employee_customer_exists THEN
        RAISE NOTICE '⚠ employee_customer table still exists!';
    ELSE
        RAISE NOTICE '✓ employee_customer table removed';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Expected accounts columns:';
    RAISE NOTICE '  - id, account_name, company_stage, company_tag';
    RAISE NOTICE '  - notes, engagement_score';
    RAISE NOTICE '  - assigned_employee, assigned_to';
    RAISE NOTICE '  - industries, industry_projects';
    RAISE NOTICE '  - is_active, created_at, updated_at, last_activity_at';
    RAISE NOTICE '========================================';
END $$;
