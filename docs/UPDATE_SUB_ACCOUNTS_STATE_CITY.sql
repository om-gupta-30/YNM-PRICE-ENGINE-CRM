-- =====================================================
-- UPDATE NULL STATE_ID AND CITY_ID IN SUB_ACCOUNTS
-- This script updates sub-accounts with NULL state_id/city_id
-- You'll need to adjust the values based on your actual data
-- =====================================================

-- STEP 1: See which sub-accounts have NULL values
SELECT 
    sa.id,
    sa.sub_account_name,
    a.account_name as parent_account,
    sa.assigned_employee,
    sa.state_id,
    sa.city_id
FROM sub_accounts sa
LEFT JOIN accounts a ON sa.account_id = a.id
WHERE sa.state_id IS NULL OR sa.city_id IS NULL
ORDER BY sa.id;

-- STEP 2: Update sub-accounts based on their names or assigned employees
-- This is a template - you need to customize it based on your actual sub-account names

-- Example: Update "Adani Group - Ahmedabad Main" to Gujarat, Ahmedabad
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Ahmedabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) LIMIT 1)
WHERE sub_account_name LIKE '%Ahmedabad%' 
    AND (state_id IS NULL OR city_id IS NULL);

-- Example: Update "Adani Group - Surat Branch" to Gujarat, Surat
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Surat' AND state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) LIMIT 1)
WHERE sub_account_name LIKE '%Surat%' 
    AND (state_id IS NULL OR city_id IS NULL);

-- Example: Update Mumbai sub-accounts
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Mumbai' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1)
WHERE sub_account_name LIKE '%Mumbai%' 
    AND (state_id IS NULL OR city_id IS NULL);

-- Example: Update Pune sub-accounts
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Pune' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1)
WHERE sub_account_name LIKE '%Pune%' 
    AND (state_id IS NULL OR city_id IS NULL);

-- Example: Update Bangalore sub-accounts
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Bangalore' AND state_id = (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1) LIMIT 1)
WHERE sub_account_name LIKE '%Bangalore%' OR sub_account_name LIKE '%Bengaluru%'
    AND (state_id IS NULL OR city_id IS NULL);

-- Example: Update Delhi sub-accounts
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'New Delhi' AND state_id = (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1) LIMIT 1)
WHERE sub_account_name LIKE '%Delhi%'
    AND (state_id IS NULL OR city_id IS NULL);

-- Example: Update Hyderabad sub-accounts
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Telangana' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Hyderabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Telangana' LIMIT 1) LIMIT 1)
WHERE sub_account_name LIKE '%Hyderabad%'
    AND (state_id IS NULL OR city_id IS NULL);

-- STEP 3: For any remaining NULL values, assign based on assigned employee
-- Employee1 -> Default to Maharashtra, Mumbai
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Mumbai' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1)
WHERE assigned_employee = 'Employee1'
    AND (state_id IS NULL OR city_id IS NULL);

-- Employee2 -> Default to Gujarat, Ahmedabad
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Ahmedabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) LIMIT 1)
WHERE assigned_employee = 'Employee2'
    AND (state_id IS NULL OR city_id IS NULL);

-- Employee3 -> Default to Karnataka, Bangalore
UPDATE sub_accounts
SET 
    state_id = (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1),
    city_id = (SELECT id FROM cities WHERE city_name = 'Bangalore' AND state_id = (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1) LIMIT 1)
WHERE assigned_employee = 'Employee3'
    AND (state_id IS NULL OR city_id IS NULL);

-- STEP 4: Verify all updates
SELECT 
    sa.id,
    sa.sub_account_name,
    a.account_name as parent_account,
    sa.assigned_employee,
    (SELECT state_name FROM states WHERE id = sa.state_id) as state_name,
    (SELECT city_name FROM cities WHERE id = sa.city_id) as city_name,
    CASE 
        WHEN sa.state_id IS NULL OR sa.city_id IS NULL THEN '⚠️ Still NULL'
        ELSE '✅ OK'
    END as status
FROM sub_accounts sa
LEFT JOIN accounts a ON sa.account_id = a.id
ORDER BY sa.id;

-- STEP 5: Count how many are still NULL (should be 0 after running updates)
SELECT 
    COUNT(*) as null_count,
    COUNT(CASE WHEN state_id IS NULL THEN 1 END) as null_state_count,
    COUNT(CASE WHEN city_id IS NULL THEN 1 END) as null_city_count
FROM sub_accounts
WHERE state_id IS NULL OR city_id IS NULL;

