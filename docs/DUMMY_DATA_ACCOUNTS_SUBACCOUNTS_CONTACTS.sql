-- ============================================
-- DUMMY DATA FOR ACCOUNTS, SUB-ACCOUNTS, AND CONTACTS
-- This script creates:
-- - 9 accounts (3 per employee: Employee1, Employee2, Employee3)
-- - 18 sub-accounts (2 per account)
-- - 27 contacts (1-2 per sub-account, varying)
-- ============================================

-- ============================================
-- 1. INSERT 9 ACCOUNTS (3 per employee)
-- ============================================

-- Employee1's Accounts
INSERT INTO accounts (account_name, company_stage, company_tag, website, gst_number, assigned_employee, notes, is_active, engagement_score) VALUES
('TechCorp Solutions', 'Enterprise', 'Customer', 'www.techcorp.com', 'GST123456789', 'Employee1', 'Major client for road safety solutions', true, 0),
('InfraBuild Pvt Ltd', 'SMB', 'Prospect', 'www.infrabuild.com', 'GST123456790', 'Employee1', 'Interested in MBCB products', true, 0),
('Highway Developers Inc', 'Pan India', 'New', 'www.highwaydev.com', 'GST123456791', 'Employee1', 'New account, needs follow-up', true, 0)
ON CONFLICT DO NOTHING;

-- Employee2's Accounts
INSERT INTO accounts (account_name, company_stage, company_tag, website, gst_number, assigned_employee, notes, is_active, engagement_score) VALUES
('RoadSafe Engineering', 'Enterprise', 'Onboard', 'www.roadsafe.com', 'GST123456792', 'Employee2', 'Recently onboarded, active engagement', true, 0),
('Metro Construction Co', 'SMB', 'Customer', 'www.metroconst.com', 'GST123456793', 'Employee2', 'Regular customer for signages', true, 0),
('Urban Infrastructure Ltd', 'Pan India', 'Prospect', 'www.urbaninfra.com', 'GST123456794', 'Employee2', 'Prospect for paint products', true, 0)
ON CONFLICT DO NOTHING;

-- Employee3's Accounts
INSERT INTO accounts (account_name, company_stage, company_tag, website, gst_number, assigned_employee, notes, is_active, engagement_score) VALUES
('National Highways Corp', 'Enterprise', 'Customer', 'www.nhcorp.com', 'GST123456795', 'Employee3', 'Large enterprise client', true, 0),
('City Development Authority', 'SMB', 'Onboard', 'www.citydev.com', 'GST123456796', 'Employee3', 'Government contract', true, 0),
('Smart Roads Pvt Ltd', 'Pan India', 'New', 'www.smartroads.com', 'GST123456797', 'Employee3', 'New prospect, initial contact made', true, 0)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. INSERT 18 SUB-ACCOUNTS (2 per account)
-- ============================================

-- TechCorp Solutions Sub-Accounts
INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'TechCorp Bangalore Office', 0, true FROM accounts WHERE account_name = 'TechCorp Solutions'
ON CONFLICT DO NOTHING;

INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'TechCorp Mumbai Branch', 0, true FROM accounts WHERE account_name = 'TechCorp Solutions'
ON CONFLICT DO NOTHING;

-- InfraBuild Pvt Ltd Sub-Accounts
INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'InfraBuild Main Office', 0, true FROM accounts WHERE account_name = 'InfraBuild Pvt Ltd'
ON CONFLICT DO NOTHING;

INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'InfraBuild Site Office', 0, true FROM accounts WHERE account_name = 'InfraBuild Pvt Ltd'
ON CONFLICT DO NOTHING;

-- Highway Developers Inc Sub-Accounts
INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'Highway Developers North', 0, true FROM accounts WHERE account_name = 'Highway Developers Inc'
ON CONFLICT DO NOTHING;

INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'Highway Developers South', 0, true FROM accounts WHERE account_name = 'Highway Developers Inc'
ON CONFLICT DO NOTHING;

-- RoadSafe Engineering Sub-Accounts
INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'RoadSafe HQ', 0, true FROM accounts WHERE account_name = 'RoadSafe Engineering'
ON CONFLICT DO NOTHING;

INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'RoadSafe Regional Office', 0, true FROM accounts WHERE account_name = 'RoadSafe Engineering'
ON CONFLICT DO NOTHING;

-- Metro Construction Co Sub-Accounts
INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'Metro Construction Chennai', 0, true FROM accounts WHERE account_name = 'Metro Construction Co'
ON CONFLICT DO NOTHING;

INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'Metro Construction Coimbatore', 0, true FROM accounts WHERE account_name = 'Metro Construction Co'
ON CONFLICT DO NOTHING;

-- Urban Infrastructure Ltd Sub-Accounts
INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'Urban Infrastructure Pune', 0, true FROM accounts WHERE account_name = 'Urban Infrastructure Ltd'
ON CONFLICT DO NOTHING;

INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'Urban Infrastructure Nashik', 0, true FROM accounts WHERE account_name = 'Urban Infrastructure Ltd'
ON CONFLICT DO NOTHING;

-- National Highways Corp Sub-Accounts
INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'NHC Eastern Region', 0, true FROM accounts WHERE account_name = 'National Highways Corp'
ON CONFLICT DO NOTHING;

INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'NHC Western Region', 0, true FROM accounts WHERE account_name = 'National Highways Corp'
ON CONFLICT DO NOTHING;

-- City Development Authority Sub-Accounts
INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'CDA Ahmedabad Main', 0, true FROM accounts WHERE account_name = 'City Development Authority'
ON CONFLICT DO NOTHING;

INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'CDA Gandhinagar Branch', 0, true FROM accounts WHERE account_name = 'City Development Authority'
ON CONFLICT DO NOTHING;

-- Smart Roads Pvt Ltd Sub-Accounts
INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'Smart Roads Jaipur', 0, true FROM accounts WHERE account_name = 'Smart Roads Pvt Ltd'
ON CONFLICT DO NOTHING;

INSERT INTO sub_accounts (account_id, sub_account_name, engagement_score, is_active) 
SELECT id, 'Smart Roads Udaipur', 0, true FROM accounts WHERE account_name = 'Smart Roads Pvt Ltd'
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. INSERT 27 CONTACTS (1-2 per sub-account)
-- ============================================

-- TechCorp Solutions - Bangalore Office (2 contacts)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Ramesh Iyer',
  'Project Manager',
  'ramesh.iyer@techcorp.com',
  '+91-9876543301',
  'Connected',
  'Primary contact for Bangalore projects',
  'Employee1'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'TechCorp Solutions' AND sa.sub_account_name = 'TechCorp Bangalore Office'
ON CONFLICT DO NOTHING;

INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Lakshmi Nair',
  'Procurement Head',
  'lakshmi.nair@techcorp.com',
  '+91-9876543302',
  'ATCBL',
  'Follow up scheduled for next week',
  'Employee1'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'TechCorp Solutions' AND sa.sub_account_name = 'TechCorp Bangalore Office'
ON CONFLICT DO NOTHING;

-- TechCorp Solutions - Mumbai Branch (1 contact)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Suresh Desai',
  'Operations Manager',
  'suresh.desai@techcorp.com',
  '+91-9876543303',
  'Connected',
  'Handles Mumbai operations',
  'Employee1'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'TechCorp Solutions' AND sa.sub_account_name = 'TechCorp Mumbai Branch'
ON CONFLICT DO NOTHING;

-- InfraBuild Main Office (2 contacts)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Priya Sharma',
  'CEO',
  'priya@infrabuild.com',
  '+91-9876543304',
  'Connected',
  'Decision maker for all purchases',
  'Employee1'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'InfraBuild Pvt Ltd' AND sa.sub_account_name = 'InfraBuild Main Office'
ON CONFLICT DO NOTHING;

INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Arjun Kapoor',
  'Technical Director',
  'arjun@infrabuild.com',
  '+91-9876543305',
  'DNP',
  'Technical queries contact',
  'Employee1'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'InfraBuild Pvt Ltd' AND sa.sub_account_name = 'InfraBuild Main Office'
ON CONFLICT DO NOTHING;

-- InfraBuild Site Office (1 contact)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Mohan Reddy',
  'Site Supervisor',
  'mohan@infrabuild.com',
  '+91-9876543306',
  'Connected',
  'On-site contact',
  'Employee1'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'InfraBuild Pvt Ltd' AND sa.sub_account_name = 'InfraBuild Site Office'
ON CONFLICT DO NOTHING;

-- Highway Developers North (2 contacts)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Amit Patel',
  'Regional Manager',
  'amit@highwaydev.com',
  '+91-9876543307',
  'Connected',
  'Manages northern region',
  'Employee1'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'Highway Developers Inc' AND sa.sub_account_name = 'Highway Developers North'
ON CONFLICT DO NOTHING;

INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Neha Gupta',
  'Purchase Manager',
  'neha@highwaydev.com',
  '+91-9876543308',
  'ATCBL',
  'Handles procurement',
  'Employee1'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'Highway Developers Inc' AND sa.sub_account_name = 'Highway Developers North'
ON CONFLICT DO NOTHING;

-- Highway Developers South (1 contact)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Kiran Rao',
  'South Zone Head',
  'kiran@highwaydev.com',
  '+91-9876543309',
  'Connected',
  'South region operations',
  'Employee1'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'Highway Developers Inc' AND sa.sub_account_name = 'Highway Developers South'
ON CONFLICT DO NOTHING;

-- RoadSafe HQ (2 contacts)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Sneha Reddy',
  'Managing Director',
  'sneha@roadsafe.com',
  '+91-9876543310',
  'Connected',
  'Company head, key decision maker',
  'Employee2'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'RoadSafe Engineering' AND sa.sub_account_name = 'RoadSafe HQ'
ON CONFLICT DO NOTHING;

INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Vikram Rao',
  'Head of Procurement',
  'vikram.rao@roadsafe.com',
  '+91-9876543311',
  'Connected',
  'All purchase decisions',
  'Employee2'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'RoadSafe Engineering' AND sa.sub_account_name = 'RoadSafe HQ'
ON CONFLICT DO NOTHING;

-- RoadSafe Regional Office (1 contact)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Pooja Menon',
  'Regional Coordinator',
  'pooja@roadsafe.com',
  '+91-9876543312',
  'Connected',
  'Coordinates regional activities',
  'Employee2'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'RoadSafe Engineering' AND sa.sub_account_name = 'RoadSafe Regional Office'
ON CONFLICT DO NOTHING;

-- Metro Construction Chennai (2 contacts)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Vikram Singh',
  'General Manager',
  'vikram@metroconst.com',
  '+91-9876543313',
  'Connected',
  'Chennai operations head',
  'Employee2'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'Metro Construction Co' AND sa.sub_account_name = 'Metro Construction Chennai'
ON CONFLICT DO NOTHING;

INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Deepa Krishnan',
  'Project Coordinator',
  'deepa@metroconst.com',
  '+91-9876543314',
  'DNP',
  'Project management contact',
  'Employee2'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'Metro Construction Co' AND sa.sub_account_name = 'Metro Construction Chennai'
ON CONFLICT DO NOTHING;

-- Metro Construction Coimbatore (1 contact)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Rajesh Nair',
  'Branch Manager',
  'rajesh.nair@metroconst.com',
  '+91-9876543315',
  'Connected',
  'Coimbatore branch head',
  'Employee2'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'Metro Construction Co' AND sa.sub_account_name = 'Metro Construction Coimbatore'
ON CONFLICT DO NOTHING;

-- Urban Infrastructure Pune (2 contacts)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Anjali Mehta',
  'Director',
  'anjali@urbaninfra.com',
  '+91-9876543316',
  'Connected',
  'Company director',
  'Employee2'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'Urban Infrastructure Ltd' AND sa.sub_account_name = 'Urban Infrastructure Pune'
ON CONFLICT DO NOTHING;

INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Rahul Deshmukh',
  'Operations Head',
  'rahul@urbaninfra.com',
  '+91-9876543317',
  'ATCBL',
  'Operations and logistics',
  'Employee2'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'Urban Infrastructure Ltd' AND sa.sub_account_name = 'Urban Infrastructure Pune'
ON CONFLICT DO NOTHING;

-- Urban Infrastructure Nashik (1 contact)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Siddharth Patil',
  'Site Manager',
  'siddharth@urbaninfra.com',
  '+91-9876543318',
  'Connected',
  'Nashik site operations',
  'Employee2'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'Urban Infrastructure Ltd' AND sa.sub_account_name = 'Urban Infrastructure Nashik'
ON CONFLICT DO NOTHING;

-- NHC Eastern Region (2 contacts)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Rohit Verma',
  'Regional Director',
  'rohit@nhcorp.com',
  '+91-9876543319',
  'Connected',
  'Eastern region head',
  'Employee3'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'National Highways Corp' AND sa.sub_account_name = 'NHC Eastern Region'
ON CONFLICT DO NOTHING;

INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Anita Das',
  'Procurement Manager',
  'anita@nhcorp.com',
  '+91-9876543320',
  'Connected',
  'Handles all procurement',
  'Employee3'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'National Highways Corp' AND sa.sub_account_name = 'NHC Eastern Region'
ON CONFLICT DO NOTHING;

-- NHC Western Region (1 contact)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Manish Shah',
  'Western Region Head',
  'manish@nhcorp.com',
  '+91-9876543321',
  'Connected',
  'Western operations',
  'Employee3'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'National Highways Corp' AND sa.sub_account_name = 'NHC Western Region'
ON CONFLICT DO NOTHING;

-- CDA Ahmedabad Main (2 contacts)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Meera Joshi',
  'Commissioner',
  'meera@citydev.com',
  '+91-9876543322',
  'Connected',
  'Government authority contact',
  'Employee3'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'City Development Authority' AND sa.sub_account_name = 'CDA Ahmedabad Main'
ON CONFLICT DO NOTHING;

INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Harsh Patel',
  'Technical Officer',
  'harsh@citydev.com',
  '+91-9876543323',
  'DNP',
  'Technical specifications contact',
  'Employee3'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'City Development Authority' AND sa.sub_account_name = 'CDA Ahmedabad Main'
ON CONFLICT DO NOTHING;

-- CDA Gandhinagar Branch (1 contact)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Kavita Trivedi',
  'Branch Officer',
  'kavita@citydev.com',
  '+91-9876543324',
  'Connected',
  'Gandhinagar branch operations',
  'Employee3'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'City Development Authority' AND sa.sub_account_name = 'CDA Gandhinagar Branch'
ON CONFLICT DO NOTHING;

-- Smart Roads Jaipur (2 contacts)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Karan Malhotra',
  'Founder & CEO',
  'karan@smartroads.com',
  '+91-9876543325',
  'Connected',
  'Company founder, decision maker',
  'Employee3'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'Smart Roads Pvt Ltd' AND sa.sub_account_name = 'Smart Roads Jaipur'
ON CONFLICT DO NOTHING;

INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Divya Sharma',
  'Business Development',
  'divya@smartroads.com',
  '+91-9876543326',
  'ATCBL',
  'BD and partnerships',
  'Employee3'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'Smart Roads Pvt Ltd' AND sa.sub_account_name = 'Smart Roads Jaipur'
ON CONFLICT DO NOTHING;

-- Smart Roads Udaipur (1 contact)
INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, created_by)
SELECT 
  a.id,
  sa.id,
  'Yash Agarwal',
  'Regional Manager',
  'yash@smartroads.com',
  '+91-9876543327',
  'Connected',
  'Udaipur region manager',
  'Employee3'
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
WHERE a.account_name = 'Smart Roads Pvt Ltd' AND sa.sub_account_name = 'Smart Roads Udaipur'
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. VERIFICATION QUERIES
-- ============================================

-- Count accounts per employee
SELECT 
  assigned_employee,
  COUNT(*) as account_count
FROM accounts
GROUP BY assigned_employee
ORDER BY assigned_employee;

-- Count sub-accounts per account
SELECT 
  a.account_name,
  a.assigned_employee,
  COUNT(sa.id) as sub_account_count
FROM accounts a
LEFT JOIN sub_accounts sa ON sa.account_id = a.id
GROUP BY a.id, a.account_name, a.assigned_employee
ORDER BY a.assigned_employee, a.account_name;

-- Count contacts per sub-account
SELECT 
  a.account_name,
  sa.sub_account_name,
  COUNT(c.id) as contact_count
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
LEFT JOIN contacts c ON c.sub_account_id = sa.id
GROUP BY a.account_name, sa.sub_account_name
ORDER BY a.account_name, sa.sub_account_name;

-- Summary
SELECT 
  'Total Accounts' as metric,
  COUNT(*)::text as value
FROM accounts
UNION ALL
SELECT 
  'Total Sub-Accounts',
  COUNT(*)::text
FROM sub_accounts
UNION ALL
SELECT 
  'Total Contacts',
  COUNT(*)::text
FROM contacts;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅ Dummy data inserted successfully! 9 accounts, 18 sub-accounts, and 27 contacts created.' as result;
