-- ============================================================================
-- ADD 'away' AND 'inactive' TO activity_type_enum
-- ============================================================================
-- This script adds the 'away' and 'inactive' values to the activity_type_enum
-- These are needed for status tracking of employees and data analysts
--
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Add 'away' and 'inactive' to activity_type_enum if they don't exist
DO $$
BEGIN
    -- Check if 'away' exists in enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'away' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')
    ) THEN
        ALTER TYPE activity_type_enum ADD VALUE 'away';
        RAISE NOTICE 'Added "away" to activity_type_enum';
    ELSE
        RAISE NOTICE '"away" already exists in activity_type_enum';
    END IF;

    -- Check if 'inactive' exists in enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'inactive' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')
    ) THEN
        ALTER TYPE activity_type_enum ADD VALUE 'inactive';
        RAISE NOTICE 'Added "inactive" to activity_type_enum';
    ELSE
        RAISE NOTICE '"inactive" already exists in activity_type_enum';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all enum values
SELECT 
    enumlabel as activity_type_value
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')
ORDER BY enumsortorder;

-- Expected values after running this script:
-- - call
-- - note
-- - followup
-- - quotation
-- - email
-- - task
-- - meeting
-- - login (if added previously)
-- - logout (if added previously)
-- - away (new)
-- - inactive (new)

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
