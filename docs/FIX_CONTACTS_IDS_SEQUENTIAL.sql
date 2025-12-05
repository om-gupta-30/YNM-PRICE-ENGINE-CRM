-- Fix Contacts Table IDs to be Sequential (starting from 1)
-- This script renumbers all contact IDs and updates foreign key references

-- Step 1: Disable triggers temporarily
SET session_replication_role = replica;

-- Step 2: Create a temporary mapping table
DROP TABLE IF EXISTS contact_id_mapping;
CREATE TEMP TABLE contact_id_mapping AS
SELECT 
    id as old_id,
    ROW_NUMBER() OVER (ORDER BY id) as new_id
FROM contacts;

-- View the mapping (for verification)
SELECT * FROM contact_id_mapping ORDER BY old_id;

-- Step 3: Update foreign key references in related tables

-- Update notifications table
DO $$
BEGIN
    UPDATE notifications 
    SET contact_id = m.new_id::INTEGER
    FROM contact_id_mapping m 
    WHERE notifications.contact_id = m.old_id;
    RAISE NOTICE 'Updated notifications table';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notifications table: %', SQLERRM;
END $$;

-- Update activities table
DO $$
BEGIN
    UPDATE activities 
    SET contact_id = m.new_id::INTEGER
    FROM contact_id_mapping m 
    WHERE activities.contact_id = m.old_id;
    RAISE NOTICE 'Updated activities table';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'activities table: %', SQLERRM;
END $$;

-- Update leads table
DO $$
BEGIN
    UPDATE leads 
    SET contact_id = m.new_id::INTEGER
    FROM contact_id_mapping m 
    WHERE leads.contact_id = m.old_id;
    RAISE NOTICE 'Updated leads table';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'leads table: %', SQLERRM;
END $$;

-- Step 4: Update the contacts table IDs
-- We need to do this carefully to avoid conflicts

-- First, shift all IDs to negative to avoid conflicts
UPDATE contacts 
SET id = -id;

-- Then set the new sequential IDs
UPDATE contacts c
SET id = m.new_id::INTEGER
FROM contact_id_mapping m 
WHERE c.id = -m.old_id;

-- Step 5: Reset the sequence
SELECT setval(
    pg_get_serial_sequence('contacts', 'id'),
    COALESCE((SELECT MAX(id) FROM contacts), 0) + 1,
    false
);

-- Step 6: Re-enable triggers
SET session_replication_role = DEFAULT;

-- Step 7: Verify the results
SELECT 'Contacts table now has IDs from 1 to ' || MAX(id) || ' (' || COUNT(*) || ' total records)' as result
FROM contacts;

-- Clean up
DROP TABLE IF EXISTS contact_id_mapping;
