-- =====================================================
-- UPDATE EXISTING SUB_ACCOUNTS WITH NULL STATE/CITY
-- This script helps update existing sub-accounts that have NULL state_id or city_id
-- You'll need to manually set appropriate values based on your data
-- =====================================================

-- First, check which sub-accounts have NULL state_id or city_id
SELECT 
    id,
    sub_account_name,
    account_id,
    state_id,
    city_id,
    assigned_employee
FROM sub_accounts
WHERE state_id IS NULL OR city_id IS NULL
ORDER BY id;

-- Option 1: Update specific sub-accounts manually
-- Replace the IDs and values as needed
-- Example:
-- UPDATE sub_accounts 
-- SET state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1),
--     city_id = (SELECT id FROM cities WHERE city_name = 'Mumbai' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1)
-- WHERE id = 1;

-- Option 2: Set default state/city for all NULL values (use with caution!)
-- Uncomment and modify as needed:
/*
DO $$
DECLARE
    default_state_id INTEGER;
    default_city_id INTEGER;
BEGIN
    -- Get default state and city IDs (using first available)
    SELECT id INTO default_state_id FROM states ORDER BY id LIMIT 1;
    SELECT id INTO default_city_id FROM cities ORDER BY id LIMIT 1;
    
    -- Only proceed if defaults exist
    IF default_state_id IS NOT NULL AND default_city_id IS NOT NULL THEN
        UPDATE sub_accounts 
        SET state_id = default_state_id, 
            city_id = default_city_id
        WHERE state_id IS NULL OR city_id IS NULL;
        
        RAISE NOTICE 'Updated % sub-accounts with default state_id=% and city_id=%', 
            (SELECT COUNT(*) FROM sub_accounts WHERE state_id = default_state_id AND city_id = default_city_id),
            default_state_id,
            default_city_id;
    ELSE
        RAISE NOTICE 'No default state/city found. Please create states and cities first.';
    END IF;
END $$;
*/

-- Verify updates
SELECT 
    id,
    sub_account_name,
    state_id,
    city_id,
    (SELECT state_name FROM states WHERE id = sub_accounts.state_id) as state_name,
    (SELECT city_name FROM cities WHERE id = sub_accounts.city_id) as city_name
FROM sub_accounts
ORDER BY id;

