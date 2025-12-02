-- ============================================
-- ADD GST NUMBER AND WEBSITE TO SUB_ACCOUNTS TABLE
-- ============================================
-- This script adds gst_number and website columns to sub_accounts table
-- ============================================
-- Run this in your Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- ADD COLUMNS TO SUB_ACCOUNTS TABLE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Adding columns to sub_accounts table...';
    
    -- Add gst_number column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'gst_number'
    ) THEN
        ALTER TABLE sub_accounts ADD COLUMN gst_number TEXT;
        RAISE NOTICE '✓ Added gst_number column to sub_accounts';
    ELSE
        RAISE NOTICE 'gst_number column already exists';
    END IF;
    
    -- Add website column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'website'
    ) THEN
        ALTER TABLE sub_accounts ADD COLUMN website TEXT;
        RAISE NOTICE '✓ Added website column to sub_accounts';
    ELSE
        RAISE NOTICE 'website column already exists';
    END IF;
    
    RAISE NOTICE 'Column addition completed!';
END $$;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    has_gst BOOLEAN;
    has_website BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'gst_number'
    ) INTO has_gst;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sub_accounts' AND column_name = 'website'
    ) INTO has_website;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'gst_number column: %', CASE WHEN has_gst THEN '✓ EXISTS' ELSE '✗ MISSING' END;
    RAISE NOTICE 'website column: %', CASE WHEN has_website THEN '✓ EXISTS' ELSE '✗ MISSING' END;
    RAISE NOTICE '========================================';
END $$;
