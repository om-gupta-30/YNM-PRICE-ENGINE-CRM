-- =====================================================
-- FIND SUB_ACCOUNTS WITH NULL STATE/CITY
-- Run this to see which sub-accounts need to be updated
-- =====================================================

-- Find all sub-accounts with NULL state_id or city_id
SELECT 
    sa.id,
    sa.sub_account_name,
    a.account_name as parent_account,
    sa.assigned_employee,
    sa.state_id,
    sa.city_id,
    (SELECT state_name FROM states WHERE id = sa.state_id) as state_name,
    (SELECT city_name FROM cities WHERE id = sa.city_id) as city_name,
    CASE 
        WHEN sa.state_id IS NULL AND sa.city_id IS NULL THEN 'Both NULL'
        WHEN sa.state_id IS NULL THEN 'State NULL'
        WHEN sa.city_id IS NULL THEN 'City NULL'
        ELSE 'OK'
    END as status
FROM sub_accounts sa
LEFT JOIN accounts a ON sa.account_id = a.id
WHERE sa.state_id IS NULL OR sa.city_id IS NULL
ORDER BY sa.id;

-- Count summary
SELECT 
    COUNT(*) as total_sub_accounts,
    COUNT(CASE WHEN state_id IS NULL OR city_id IS NULL THEN 1 END) as null_state_city_count,
    COUNT(CASE WHEN state_id IS NOT NULL AND city_id IS NOT NULL THEN 1 END) as complete_count
FROM sub_accounts;

