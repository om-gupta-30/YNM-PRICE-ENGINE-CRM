-- =====================================================
-- POPULATE NULL STATE_ID AND CITY_ID IN SUB_ACCOUNTS
-- This will update all NULL values based on sub-account names
-- =====================================================

-- STEP 1: First, see what sub-accounts have NULL values
SELECT 
    sa.id,
    sa.sub_account_name,
    sa.assigned_employee,
    sa.state_id,
    sa.city_id,
    a.account_name as parent_account
FROM sub_accounts sa
LEFT JOIN accounts a ON sa.account_id = a.id
WHERE sa.state_id IS NULL OR sa.city_id IS NULL
ORDER BY sa.id;

-- STEP 2: Update based on city names in sub-account name
-- This will match common city names and assign appropriate state/city

-- Ahmedabad -> Gujarat, Ahmedabad
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Ahmedabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) LIMIT 1)
WHERE (state_id IS NULL OR city_id IS NULL)
    AND (sub_account_name ILIKE '%ahmedabad%' OR sub_account_name ILIKE '%amdavad%');

-- Surat -> Gujarat, Surat
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Surat' AND state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) LIMIT 1)
WHERE (state_id IS NULL OR city_id IS NULL)
    AND sub_account_name ILIKE '%surat%';

-- Mumbai -> Maharashtra, Mumbai
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Mumbai' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1)
WHERE (state_id IS NULL OR city_id IS NULL)
    AND (sub_account_name ILIKE '%mumbai%' OR sub_account_name ILIKE '%bombay%');

-- Pune -> Maharashtra, Pune
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Pune' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1)
WHERE (state_id IS NULL OR city_id IS NULL)
    AND sub_account_name ILIKE '%pune%';

-- Nashik -> Maharashtra, Nashik
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Nashik' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1)
WHERE (state_id IS NULL OR city_id IS NULL)
    AND sub_account_name ILIKE '%nashik%';

-- Bangalore/Bengaluru -> Karnataka, Bangalore
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Bangalore' AND state_id = (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1) LIMIT 1)
WHERE (state_id IS NULL OR city_id IS NULL)
    AND (sub_account_name ILIKE '%bangalore%' OR sub_account_name ILIKE '%bengaluru%');

-- Delhi/New Delhi -> Delhi, New Delhi
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'New Delhi' AND state_id = (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1) LIMIT 1)
WHERE (state_id IS NULL OR city_id IS NULL)
    AND (sub_account_name ILIKE '%delhi%');

-- Hyderabad -> Telangana, Hyderabad
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Telangana' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Hyderabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Telangana' LIMIT 1) LIMIT 1)
WHERE (state_id IS NULL OR city_id IS NULL)
    AND sub_account_name ILIKE '%hyderabad%';

-- STEP 3: For any remaining NULL values, assign defaults based on assigned employee
-- Employee1 -> Maharashtra, Mumbai
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Mumbai' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1)
WHERE (state_id IS NULL OR city_id IS NULL)
    AND assigned_employee = 'Employee1';

-- Employee2 -> Gujarat, Ahmedabad
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Ahmedabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) LIMIT 1)
WHERE (state_id IS NULL OR city_id IS NULL)
    AND assigned_employee = 'Employee2';

-- Employee3 -> Karnataka, Bangalore
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Bangalore' AND state_id = (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1) LIMIT 1)
WHERE (state_id IS NULL OR city_id IS NULL)
    AND assigned_employee = 'Employee3';

-- STEP 4: Final catch-all - assign Maharashtra, Mumbai to any remaining NULLs
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Mumbai' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1)
WHERE state_id IS NULL OR city_id IS NULL;

-- STEP 5: Verify all updates were successful
SELECT 
    sa.id,
    sa.sub_account_name,
    sa.assigned_employee,
    (SELECT state_name FROM states WHERE id = sa.state_id) as state_name,
    (SELECT city_name FROM cities WHERE id = sa.city_id) as city_name,
    CASE 
        WHEN sa.state_id IS NULL OR sa.city_id IS NULL THEN '❌ Still NULL'
        ELSE '✅ OK'
    END as status
FROM sub_accounts sa
ORDER BY sa.id;

-- STEP 6: Count summary
SELECT 
    COUNT(*) as total_sub_accounts,
    COUNT(CASE WHEN state_id IS NULL OR city_id IS NULL THEN 1 END) as still_null_count,
    COUNT(CASE WHEN state_id IS NOT NULL AND city_id IS NOT NULL THEN 1 END) as complete_count
FROM sub_accounts;

