-- =====================================================
-- COMPREHENSIVE DUMMY DATA FOR YNM SAFETY CRM & PRICE ENGINE
-- This script creates realistic dummy data linking CRM and Price Engine
-- FIXED: Uses actual state/city IDs or creates them if missing
-- =====================================================

-- Clear existing data (except users, states, cities)
TRUNCATE TABLE quotes_mbcb CASCADE;
TRUNCATE TABLE quotes_signages CASCADE;
TRUNCATE TABLE quotes_paint CASCADE;
TRUNCATE TABLE contacts CASCADE;
TRUNCATE TABLE sub_accounts CASCADE;
TRUNCATE TABLE accounts CASCADE;
TRUNCATE TABLE leads CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE activities CASCADE;

-- Reset sequences
ALTER SEQUENCE accounts_id_seq RESTART WITH 1;
ALTER SEQUENCE sub_accounts_id_seq RESTART WITH 1;
ALTER SEQUENCE contacts_id_seq RESTART WITH 1;
ALTER SEQUENCE quotes_mbcb_id_seq RESTART WITH 1;
ALTER SEQUENCE quotes_signages_id_seq RESTART WITH 1;
ALTER SEQUENCE quotes_paint_id_seq RESTART WITH 1;
ALTER SEQUENCE leads_id_seq RESTART WITH 1;
ALTER SEQUENCE tasks_id_seq RESTART WITH 1;
ALTER SEQUENCE activities_id_seq RESTART WITH 1;

-- =====================================================
-- STEP 0: GET OR CREATE STATES AND CITIES
-- =====================================================

-- First, check if we have states/cities, if not create common ones
-- Get existing state IDs or create them
DO $$
DECLARE
    mh_state_id INTEGER;
    gj_state_id INTEGER;
    ka_state_id INTEGER;
    dl_state_id INTEGER;
    ts_state_id INTEGER;
    mh_mumbai_city_id INTEGER;
    mh_pune_city_id INTEGER;
    mh_nashik_city_id INTEGER;
    gj_ahmedabad_city_id INTEGER;
    gj_surat_city_id INTEGER;
    ka_bangalore_city_id INTEGER;
    dl_delhi_city_id INTEGER;
    ts_hyderabad_city_id INTEGER;
BEGIN
    -- Get or create Maharashtra state
    SELECT id INTO mh_state_id FROM states WHERE state_name = 'Maharashtra' LIMIT 1;
    IF mh_state_id IS NULL THEN
        INSERT INTO states (state_name) VALUES ('Maharashtra') RETURNING id INTO mh_state_id;
    END IF;

    -- Get or create Gujarat state
    SELECT id INTO gj_state_id FROM states WHERE state_name = 'Gujarat' LIMIT 1;
    IF gj_state_id IS NULL THEN
        INSERT INTO states (state_name) VALUES ('Gujarat') RETURNING id INTO gj_state_id;
    END IF;

    -- Get or create Karnataka state
    SELECT id INTO ka_state_id FROM states WHERE state_name = 'Karnataka' LIMIT 1;
    IF ka_state_id IS NULL THEN
        INSERT INTO states (state_name) VALUES ('Karnataka') RETURNING id INTO ka_state_id;
    END IF;

    -- Get or create Delhi state
    SELECT id INTO dl_state_id FROM states WHERE state_name = 'Delhi' LIMIT 1;
    IF dl_state_id IS NULL THEN
        INSERT INTO states (state_name) VALUES ('Delhi') RETURNING id INTO dl_state_id;
    END IF;

    -- Get or create Telangana state
    SELECT id INTO ts_state_id FROM states WHERE state_name = 'Telangana' LIMIT 1;
    IF ts_state_id IS NULL THEN
        INSERT INTO states (state_name) VALUES ('Telangana') RETURNING id INTO ts_state_id;
    END IF;

    -- Get or create cities
    SELECT id INTO mh_mumbai_city_id FROM cities WHERE city_name = 'Mumbai' AND state_id = mh_state_id LIMIT 1;
    IF mh_mumbai_city_id IS NULL THEN
        INSERT INTO cities (city_name, state_id) VALUES ('Mumbai', mh_state_id) RETURNING id INTO mh_mumbai_city_id;
    END IF;

    SELECT id INTO mh_pune_city_id FROM cities WHERE city_name = 'Pune' AND state_id = mh_state_id LIMIT 1;
    IF mh_pune_city_id IS NULL THEN
        INSERT INTO cities (city_name, state_id) VALUES ('Pune', mh_state_id) RETURNING id INTO mh_pune_city_id;
    END IF;

    SELECT id INTO mh_nashik_city_id FROM cities WHERE city_name = 'Nashik' AND state_id = mh_state_id LIMIT 1;
    IF mh_nashik_city_id IS NULL THEN
        INSERT INTO cities (city_name, state_id) VALUES ('Nashik', mh_state_id) RETURNING id INTO mh_nashik_city_id;
    END IF;

    SELECT id INTO gj_ahmedabad_city_id FROM cities WHERE city_name = 'Ahmedabad' AND state_id = gj_state_id LIMIT 1;
    IF gj_ahmedabad_city_id IS NULL THEN
        INSERT INTO cities (city_name, state_id) VALUES ('Ahmedabad', gj_state_id) RETURNING id INTO gj_ahmedabad_city_id;
    END IF;

    SELECT id INTO gj_surat_city_id FROM cities WHERE city_name = 'Surat' AND state_id = gj_state_id LIMIT 1;
    IF gj_surat_city_id IS NULL THEN
        INSERT INTO cities (city_name, state_id) VALUES ('Surat', gj_state_id) RETURNING id INTO gj_surat_city_id;
    END IF;

    SELECT id INTO ka_bangalore_city_id FROM cities WHERE city_name = 'Bangalore' AND state_id = ka_state_id LIMIT 1;
    IF ka_bangalore_city_id IS NULL THEN
        INSERT INTO cities (city_name, state_id) VALUES ('Bangalore', ka_state_id) RETURNING id INTO ka_bangalore_city_id;
    END IF;

    SELECT id INTO dl_delhi_city_id FROM cities WHERE city_name = 'New Delhi' AND state_id = dl_state_id LIMIT 1;
    IF dl_delhi_city_id IS NULL THEN
        INSERT INTO cities (city_name, state_id) VALUES ('New Delhi', dl_state_id) RETURNING id INTO dl_delhi_city_id;
    END IF;

    SELECT id INTO ts_hyderabad_city_id FROM cities WHERE city_name = 'Hyderabad' AND state_id = ts_state_id LIMIT 1;
    IF ts_hyderabad_city_id IS NULL THEN
        INSERT INTO cities (city_name, state_id) VALUES ('Hyderabad', ts_state_id) RETURNING id INTO ts_hyderabad_city_id;
    END IF;

    -- Now create accounts using the actual IDs
    -- Store IDs in a temporary table for later use
    CREATE TEMP TABLE IF NOT EXISTS temp_state_city_ids AS
    SELECT 
        mh_state_id as mh_id,
        gj_state_id as gj_id,
        ka_state_id as ka_id,
        dl_state_id as dl_id,
        ts_state_id as ts_id,
        mh_mumbai_city_id as mh_mumbai_id,
        mh_pune_city_id as mh_pune_id,
        mh_nashik_city_id as mh_nashik_id,
        gj_ahmedabad_city_id as gj_ahmedabad_id,
        gj_surat_city_id as gj_surat_id,
        ka_bangalore_city_id as ka_bangalore_id,
        dl_delhi_city_id as dl_delhi_id,
        ts_hyderabad_city_id as ts_hyderabad_id;
END $$;

-- =====================================================
-- STEP 1: CREATE ACCOUNTS (Parent Companies)
-- Using actual state/city IDs from the database
-- =====================================================

WITH state_city_map AS (
    SELECT 
        (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) as mh_state_id,
        (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) as gj_state_id,
        (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1) as ka_state_id,
        (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1) as dl_state_id,
        (SELECT id FROM states WHERE state_name = 'Telangana' LIMIT 1) as ts_state_id,
        (SELECT id FROM cities WHERE city_name = 'Mumbai' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1) as mh_mumbai_city_id,
        (SELECT id FROM cities WHERE city_name = 'Pune' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1) as mh_pune_city_id,
        (SELECT id FROM cities WHERE city_name = 'Ahmedabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) LIMIT 1) as gj_ahmedabad_city_id,
        (SELECT id FROM cities WHERE city_name = 'Bangalore' AND state_id = (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1) LIMIT 1) as ka_bangalore_city_id,
        (SELECT id FROM cities WHERE city_name = 'New Delhi' AND state_id = (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1) LIMIT 1) as dl_delhi_city_id,
        (SELECT id FROM cities WHERE city_name = 'Hyderabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Telangana' LIMIT 1) LIMIT 1) as ts_hyderabad_city_id
)
INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, website, gst_number, notes, is_active, engagement_score, created_at, updated_at)
SELECT * FROM (VALUES
    -- Enterprise Accounts (High Engagement)
    ('Tata Infrastructure Ltd', 'Enterprise', 'Customer', (SELECT mh_state_id FROM state_city_map), (SELECT mh_mumbai_city_id FROM state_city_map), 'Rajesh Kumar', '9876543210', 'rajesh@tatainfra.com', 'Mumbai, Maharashtra', 'https://tatainfra.com', '27AABCU9603R1Z5', 'Major infrastructure client. High volume orders.', true, 0, NOW(), NOW()),
    ('Reliance Industries Ltd', 'Enterprise', 'Customer', (SELECT mh_state_id FROM state_city_map), (SELECT mh_mumbai_city_id FROM state_city_map), 'Priya Sharma', '9876543211', 'priya@ril.com', 'Mumbai, Maharashtra', 'https://ril.com', '27AAACR1234A1Z6', 'Enterprise client. Regular orders.', true, 0, NOW(), NOW()),
    ('Adani Group', 'Enterprise', 'Customer', (SELECT gj_state_id FROM state_city_map), (SELECT gj_ahmedabad_city_id FROM state_city_map), 'Amit Patel', '9876543212', 'amit@adani.com', 'Ahmedabad, Gujarat', 'https://adani.com', '24AABCD1234E1Z7', 'Large enterprise client.', true, 0, NOW(), NOW()),
    
    -- SMB Accounts (Medium Engagement)
    ('Maharashtra Roadways Pvt Ltd', 'SMB', 'Customer', (SELECT mh_state_id FROM state_city_map), (SELECT mh_mumbai_city_id FROM state_city_map), 'Sanjay Mehta', '9876543213', 'sanjay@mhroadways.com', 'Mumbai, Maharashtra', NULL, '27AABCM1234F1Z8', 'Regional contractor. Good relationship.', true, 0, NOW(), NOW()),
    ('Gujarat Construction Co', 'SMB', 'Prospect', (SELECT gj_state_id FROM state_city_map), (SELECT gj_ahmedabad_city_id FROM state_city_map), 'Deepak Shah', '9876543214', 'deepak@gujconstruct.com', 'Ahmedabad, Gujarat', NULL, '24AABCG1234H1Z9', 'New prospect. Following up.', true, 0, NOW(), NOW()),
    ('Karnataka Builders', 'SMB', 'Onboard', (SELECT ka_state_id FROM state_city_map), (SELECT ka_bangalore_city_id FROM state_city_map), 'Vikram Reddy', '9876543215', 'vikram@karbuilders.com', 'Bangalore, Karnataka', NULL, '29AABCK1234I1Z0', 'Recently onboarded client.', true, 0, NOW(), NOW()),
    
    -- Pan India Accounts
    ('National Highways Corp', 'Pan India', 'Customer', (SELECT mh_state_id FROM state_city_map), (SELECT mh_mumbai_city_id FROM state_city_map), 'Kiran Desai', '9876543216', 'kiran@nhcorp.com', 'Mumbai, Maharashtra', 'https://nhcorp.com', '27AABCN1234J1Z1', 'Pan India operations. Multiple projects.', true, 0, NOW(), NOW()),
    ('India Infrastructure Pvt Ltd', 'Pan India', 'Retention', (SELECT ka_state_id FROM state_city_map), (SELECT ka_bangalore_city_id FROM state_city_map), 'Ramesh Iyer', '9876543217', 'ramesh@iipl.com', 'Bangalore, Karnataka', NULL, '29AABCI1234K1Z2', 'Requires retention efforts.', true, 0, NOW(), NOW()),
    
    -- Regional Accounts
    ('Delhi Metro Rail Corp', 'SMB', 'Customer', (SELECT dl_state_id FROM state_city_map), (SELECT dl_delhi_city_id FROM state_city_map), 'Suresh Gupta', '9876543218', 'suresh@dmrc.com', 'New Delhi', 'https://dmrc.com', '07AABCD1234L1Z3', 'Metro rail projects. Regular orders.', true, 0, NOW(), NOW()),
    ('Hyderabad Construction', 'SMB', 'New', (SELECT ts_state_id FROM state_city_map), (SELECT ts_hyderabad_city_id FROM state_city_map), 'Karthik Rao', '9876543219', 'karthik@hydconstruct.com', 'Hyderabad, Telangana', NULL, '36AABCH1234M1Z4', 'New account. Initial contact.', true, 0, NOW(), NOW())
) AS v(account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, website, gst_number, notes, is_active, engagement_score, created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM accounts WHERE account_name = v.account_name
);

-- =====================================================
-- STEP 2: CREATE SUB-ACCOUNTS (Branches/Locations)
-- =====================================================

WITH state_city_map AS (
    SELECT 
        (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) as mh_state_id,
        (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) as gj_state_id,
        (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1) as ka_state_id,
        (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1) as dl_state_id,
        (SELECT id FROM states WHERE state_name = 'Telangana' LIMIT 1) as ts_state_id,
        (SELECT id FROM cities WHERE city_name = 'Mumbai' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1) as mh_mumbai_city_id,
        (SELECT id FROM cities WHERE city_name = 'Pune' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1) as mh_pune_city_id,
        (SELECT id FROM cities WHERE city_name = 'Nashik' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1) as mh_nashik_city_id,
        (SELECT id FROM cities WHERE city_name = 'Ahmedabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) LIMIT 1) as gj_ahmedabad_city_id,
        (SELECT id FROM cities WHERE city_name = 'Surat' AND state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) LIMIT 1) as gj_surat_city_id,
        (SELECT id FROM cities WHERE city_name = 'Bangalore' AND state_id = (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1) LIMIT 1) as ka_bangalore_city_id,
        (SELECT id FROM cities WHERE city_name = 'New Delhi' AND state_id = (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1) LIMIT 1) as dl_delhi_city_id,
        (SELECT id FROM cities WHERE city_name = 'Hyderabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Telangana' LIMIT 1) LIMIT 1) as ts_hyderabad_city_id
),
account_map AS (
    SELECT id, account_name FROM accounts
)
INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM account_map WHERE account_name = v.account_name),
    v.sub_account_name,
    v.assigned_employee,
    v.engagement_score,
    v.is_active,
    v.created_at,
    v.updated_at
FROM (VALUES
    ('Tata Infrastructure Ltd', 'Tata Infrastructure - Mumbai Branch', 'Employee1', 85, true, NOW(), NOW()),
    ('Tata Infrastructure Ltd', 'Tata Infrastructure - Pune Branch', 'Employee2', 75, true, NOW(), NOW()),
    ('Tata Infrastructure Ltd', 'Tata Infrastructure - Nashik Branch', 'Employee3', 65, true, NOW(), NOW()),
    ('Reliance Industries Ltd', 'Reliance Industries - Mumbai HQ', 'Employee1', 90, true, NOW(), NOW()),
    ('Reliance Industries Ltd', 'Reliance Industries - Navi Mumbai', 'Employee2', 70, true, NOW(), NOW()),
    ('Adani Group', 'Adani Group - Ahmedabad Main', 'Employee2', 80, true, NOW(), NOW()),
    ('Adani Group', 'Adani Group - Surat Branch', 'Employee3', 60, true, NOW(), NOW()),
    ('Maharashtra Roadways Pvt Ltd', 'Maharashtra Roadways - Mumbai', 'Employee1', 55, true, NOW(), NOW()),
    ('Gujarat Construction Co', 'Gujarat Construction - Ahmedabad', 'Employee2', 45, true, NOW(), NOW()),
    ('Karnataka Builders', 'Karnataka Builders - Bangalore', 'Employee3', 50, true, NOW(), NOW()),
    ('National Highways Corp', 'NHC - Mumbai Office', 'Employee1', 75, true, NOW(), NOW()),
    ('National Highways Corp', 'NHC - Delhi Office', 'Employee2', 70, true, NOW(), NOW()),
    ('National Highways Corp', 'NHC - Bangalore Office', 'Employee3', 65, true, NOW(), NOW()),
    ('India Infrastructure Pvt Ltd', 'IIPL - Bangalore Main', 'Employee3', 60, true, NOW(), NOW()),
    ('Delhi Metro Rail Corp', 'DMRC - Delhi Central', 'Employee1', 70, true, NOW(), NOW()),
    ('Hyderabad Construction', 'Hyderabad Construction - Main', 'Employee2', 35, true, NOW(), NOW())
) AS v(account_name, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at);

-- =====================================================
-- STEP 3: CREATE CONTACTS
-- =====================================================

WITH sub_account_map AS (
    SELECT sa.id, sa.sub_account_name, a.account_name 
    FROM sub_accounts sa 
    JOIN accounts a ON sa.account_id = a.id
)
INSERT INTO contacts (sub_account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by, created_at, updated_at)
SELECT 
    (SELECT id FROM sub_account_map WHERE sub_account_name = v.sub_account_name),
    v.name,
    v.designation,
    v.email,
    v.phone,
    v.call_status,
    v.notes,
    v.follow_up_date,
    v.created_by,
    v.created_at,
    v.updated_at
FROM (VALUES
    ('Tata Infrastructure - Mumbai Branch', 'Rajesh Kumar', 'Project Manager', 'rajesh.kumar@tatainfra.com', '9876543210', 'Connected', 'Decision maker. Interested in bulk orders.', NULL, 'Employee1', NOW(), NOW()),
    ('Tata Infrastructure - Mumbai Branch', 'Anita Desai', 'Procurement Head', 'anita.desai@tatainfra.com', '9876543220', 'Connected', 'Handles procurement decisions.', NULL, 'Employee1', NOW(), NOW()),
    ('Tata Infrastructure - Pune Branch', 'Mahesh Patil', 'Operations Manager', 'mahesh.patil@tatainfra.com', '9876543230', 'DNP', 'Did not pick. Call back tomorrow.', NOW() + INTERVAL '1 day', 'Employee2', NOW(), NOW()),
    ('Tata Infrastructure - Nashik Branch', 'Suresh Gaikwad', 'Site Engineer', 'suresh.g@tatainfra.com', '9876543240', 'ATCBL', 'Available to call back later today.', NOW() + INTERVAL '2 hours', 'Employee3', NOW(), NOW()),
    ('Reliance Industries - Mumbai HQ', 'Priya Sharma', 'VP Procurement', 'priya.sharma@ril.com', '9876543211', 'Connected', 'Key decision maker. High priority.', NULL, 'Employee1', NOW(), NOW()),
    ('Reliance Industries - Mumbai HQ', 'Rohit Singh', 'Technical Head', 'rohit.singh@ril.com', '9876543250', 'Connected', 'Technical queries contact.', NULL, 'Employee1', NOW(), NOW()),
    ('Reliance Industries - Navi Mumbai', 'Kavita Joshi', 'Operations Lead', 'kavita.j@ril.com', '9876543260', 'Connected', 'Regular communication.', NULL, 'Employee2', NOW(), NOW()),
    ('Adani Group - Ahmedabad Main', 'Amit Patel', 'General Manager', 'amit.patel@adani.com', '9876543212', 'Connected', 'Main contact for Adani group.', NULL, 'Employee2', NOW(), NOW()),
    ('Adani Group - Surat Branch', 'Harsh Shah', 'Project Coordinator', 'harsh.shah@adani.com', '9876543270', 'Unable to connect', 'Number seems incorrect. Verify.', NULL, 'Employee3', NOW(), NOW()),
    ('Maharashtra Roadways - Mumbai', 'Sanjay Mehta', 'Owner', 'sanjay@mhroadways.com', '9876543213', 'Connected', 'Direct owner. Quick decisions.', NULL, 'Employee1', NOW(), NOW()),
    ('Gujarat Construction - Ahmedabad', 'Deepak Shah', 'Managing Director', 'deepak@gujconstruct.com', '9876543214', 'DNP', 'New prospect. Follow up needed.', NOW() + INTERVAL '2 days', 'Employee2', NOW(), NOW()),
    ('Karnataka Builders - Bangalore', 'Vikram Reddy', 'CEO', 'vikram@karbuilders.com', '9876543215', 'Connected', 'Newly onboarded. Regular follow-up.', NULL, 'Employee3', NOW(), NOW()),
    ('NHC - Mumbai Office', 'Kiran Desai', 'Director Projects', 'kiran@nhcorp.com', '9876543216', 'Connected', 'High-value client.', NULL, 'Employee1', NOW(), NOW()),
    ('NHC - Delhi Office', 'Ravi Kapoor', 'Project Head', 'ravi.k@nhcorp.com', '9876543280', 'Connected', 'Delhi operations head.', NULL, 'Employee2', NOW(), NOW()),
    ('NHC - Bangalore Office', 'Arjun Nair', 'Regional Manager', 'arjun.n@nhcorp.com', '9876543290', 'DNP', 'Call back scheduled.', NOW() + INTERVAL '1 day', 'Employee3', NOW(), NOW()),
    ('IIPL - Bangalore Main', 'Ramesh Iyer', 'Operations Director', 'ramesh@iipl.com', '9876543217', 'Connected', 'Requires attention for retention.', NULL, 'Employee3', NOW(), NOW()),
    ('DMRC - Delhi Central', 'Suresh Gupta', 'Chief Engineer', 'suresh@dmrc.com', '9876543218', 'Connected', 'Metro rail projects.', NULL, 'Employee1', NOW(), NOW()),
    ('Hyderabad Construction - Main', 'Karthik Rao', 'Founder', 'karthik@hydconstruct.com', '9876543219', 'New', 'New account. Initial contact made.', NULL, 'Employee2', NOW(), NOW())
) AS v(sub_account_name, name, designation, email, phone, call_status, notes, follow_up_date, created_by, created_at, updated_at);

-- =====================================================
-- STEP 4: CREATE QUOTATIONS (Price Engine Data)
-- =====================================================

WITH state_city_map AS (
    SELECT 
        (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) as mh_state_id,
        (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) as gj_state_id,
        (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1) as ka_state_id,
        (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1) as dl_state_id,
        (SELECT id FROM states WHERE state_name = 'Telangana' LIMIT 1) as ts_state_id,
        (SELECT id FROM cities WHERE city_name = 'Mumbai' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1) as mh_mumbai_city_id,
        (SELECT id FROM cities WHERE city_name = 'Pune' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1) as mh_pune_city_id,
        (SELECT id FROM cities WHERE city_name = 'Ahmedabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) LIMIT 1) as gj_ahmedabad_city_id,
        (SELECT id FROM cities WHERE city_name = 'Surat' AND state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) LIMIT 1) as gj_surat_city_id,
        (SELECT id FROM cities WHERE city_name = 'Bangalore' AND state_id = (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1) LIMIT 1) as ka_bangalore_city_id,
        (SELECT id FROM cities WHERE city_name = 'New Delhi' AND state_id = (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1) LIMIT 1) as dl_delhi_city_id,
        (SELECT id FROM cities WHERE city_name = 'Hyderabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Telangana' LIMIT 1) LIMIT 1) as ts_hyderabad_city_id
),
sub_account_map AS (
    SELECT sa.id, sa.sub_account_name 
    FROM sub_accounts sa
)
INSERT INTO quotes_mbcb (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, status, created_by, is_saved, created_at, updated_at)
SELECT 
    v.section,
    (SELECT CASE 
        WHEN v.state_name = 'Maharashtra' THEN mh_state_id
        WHEN v.state_name = 'Gujarat' THEN gj_state_id
        WHEN v.state_name = 'Karnataka' THEN ka_state_id
        WHEN v.state_name = 'Delhi' THEN dl_state_id
        WHEN v.state_name = 'Telangana' THEN ts_state_id
    END FROM state_city_map),
    (SELECT CASE 
        WHEN v.city_name = 'Mumbai' THEN mh_mumbai_city_id
        WHEN v.city_name = 'Pune' THEN mh_pune_city_id
        WHEN v.city_name = 'Ahmedabad' THEN gj_ahmedabad_city_id
        WHEN v.city_name = 'Surat' THEN gj_surat_city_id
        WHEN v.city_name = 'Bangalore' THEN ka_bangalore_city_id
        WHEN v.city_name = 'New Delhi' THEN dl_delhi_city_id
        WHEN v.city_name = 'Hyderabad' THEN ts_hyderabad_city_id
    END FROM state_city_map),
    (SELECT id FROM sub_account_map WHERE sub_account_name = v.sub_account_name),
    v.customer_name,
    v.purpose,
    v.date::DATE,
    v.quantity_rm,
    v.total_weight_per_rm,
    v.total_cost_per_rm,
    v.final_total_cost,
    v.status,
    v.created_by,
    v.is_saved,
    v.created_at,
    v.updated_at
FROM (VALUES
    ('W-Beam', 'Maharashtra', 'Mumbai', 'Tata Infrastructure - Mumbai Branch', 'Tata Infrastructure - Mumbai Branch', 'Highway Construction', '2024-01-15', 500, 45.5, 2500.00, 1250000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '45 days', NOW() - INTERVAL '10 days'),
    ('Thrie Beam', 'Maharashtra', 'Mumbai', 'Tata Infrastructure - Mumbai Branch', 'Tata Infrastructure - Mumbai Branch', 'Expressway Project', '2024-02-01', 300, 52.3, 2800.00, 840000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'),
    ('W-Beam', 'Maharashtra', 'Mumbai', 'Reliance Industries - Mumbai HQ', 'Reliance Industries - Mumbai HQ', 'Factory Road', '2024-02-10', 250, 45.5, 2500.00, 625000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '21 days', NOW() - INTERVAL '3 days'),
    ('Double W-Beam', 'Gujarat', 'Ahmedabad', 'Adani Group - Ahmedabad Main', 'Adani Group - Ahmedabad Main', 'Port Access Road', '2024-03-05', 400, 91.0, 5000.00, 2000000.00, 'sent', 'Employee2', true, NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days'),
    ('W-Beam', 'Maharashtra', 'Mumbai', 'NHC - Mumbai Office', 'NHC - Mumbai Office', 'NH-48 Expansion', '2024-03-08', 600, 45.5, 2500.00, 1500000.00, 'negotiation', 'Employee1', true, NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'),
    ('Thrie Beam', 'Delhi', 'New Delhi', 'DMRC - Delhi Central', 'DMRC - Delhi Central', 'Metro Rail Corridor', '2024-03-10', 350, 52.3, 2800.00, 980000.00, 'sent', 'Employee1', true, NOW() - INTERVAL '2 days', NOW()),
    ('W-Beam', 'Maharashtra', 'Pune', 'Reliance Industries - Navi Mumbai', 'Reliance Industries - Navi Mumbai', 'Warehouse Road', '2024-03-11', 150, 45.5, 2500.00, 375000.00, 'draft', 'Employee2', true, NOW() - INTERVAL '1 day', NOW()),
    ('Thrie Beam', 'Karnataka', 'Bangalore', 'Karnataka Builders - Bangalore', 'Karnataka Builders - Bangalore', 'Commercial Complex', '2024-03-11', 200, 52.3, 2800.00, 560000.00, 'draft', 'Employee3', true, NOW() - INTERVAL '1 day', NOW()),
    ('W-Beam', 'Maharashtra', 'Mumbai', 'Maharashtra Roadways - Mumbai', 'Maharashtra Roadways - Mumbai', 'City Road Renovation', '2024-03-12', 180, 45.5, 2500.00, 450000.00, 'draft', 'Employee1', true, NOW(), NOW()),
    ('Double W-Beam', 'Gujarat', 'Surat', 'Adani Group - Surat Branch', 'Adani Group - Surat Branch', 'Industrial Zone', '2024-02-20', 300, 91.0, 5000.00, 1500000.00, 'on_hold', 'Employee3', true, NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days'),
    ('W-Beam', 'Maharashtra', 'Pune', 'Tata Infrastructure - Pune Branch', 'Tata Infrastructure - Pune Branch', 'City Bypass', '2024-01-20', 400, 45.5, 2500.00, 1000000.00, 'closed_lost', 'Employee2', true, NOW() - INTERVAL '50 days', NOW() - INTERVAL '45 days')
) AS v(section, state_name, city_name, sub_account_name, customer_name, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, status, created_by, is_saved, created_at, updated_at);

-- Signages Quotations
WITH state_city_map AS (
    SELECT 
        (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) as mh_state_id,
        (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) as gj_state_id,
        (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1) as ka_state_id,
        (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1) as dl_state_id,
        (SELECT id FROM states WHERE state_name = 'Telangana' LIMIT 1) as ts_state_id,
        (SELECT id FROM cities WHERE city_name = 'Mumbai' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1) as mh_mumbai_city_id,
        (SELECT id FROM cities WHERE city_name = 'Ahmedabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Gujarat' LIMIT 1) LIMIT 1) as gj_ahmedabad_city_id,
        (SELECT id FROM cities WHERE city_name = 'Bangalore' AND state_id = (SELECT id FROM states WHERE state_name = 'Karnataka' LIMIT 1) LIMIT 1) as ka_bangalore_city_id,
        (SELECT id FROM cities WHERE city_name = 'New Delhi' AND state_id = (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1) LIMIT 1) as dl_delhi_city_id,
        (SELECT id FROM cities WHERE city_name = 'Hyderabad' AND state_id = (SELECT id FROM states WHERE state_name = 'Telangana' LIMIT 1) LIMIT 1) as ts_hyderabad_city_id
),
sub_account_map AS (
    SELECT sa.id, sa.sub_account_name 
    FROM sub_accounts sa
)
INSERT INTO quotes_signages (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity, area_sq_ft, cost_per_piece, final_total_cost, status, created_by, is_saved, created_at, updated_at)
SELECT 
    v.section,
    (SELECT CASE 
        WHEN v.state_name = 'Maharashtra' THEN mh_state_id
        WHEN v.state_name = 'Gujarat' THEN gj_state_id
        WHEN v.state_name = 'Karnataka' THEN ka_state_id
        WHEN v.state_name = 'Delhi' THEN dl_state_id
        WHEN v.state_name = 'Telangana' THEN ts_state_id
    END FROM state_city_map),
    (SELECT CASE 
        WHEN v.city_name = 'Mumbai' THEN mh_mumbai_city_id
        WHEN v.city_name = 'Ahmedabad' THEN gj_ahmedabad_city_id
        WHEN v.city_name = 'Bangalore' THEN ka_bangalore_city_id
        WHEN v.city_name = 'New Delhi' THEN dl_delhi_city_id
        WHEN v.city_name = 'Hyderabad' THEN ts_hyderabad_city_id
    END FROM state_city_map),
    (SELECT id FROM sub_account_map WHERE sub_account_name = v.sub_account_name),
    v.customer_name,
    v.purpose,
    v.date::DATE,
    v.quantity,
    v.area_sq_ft,
    v.cost_per_piece,
    v.final_total_cost,
    v.status,
    v.created_by,
    v.is_saved,
    v.created_at,
    v.updated_at
FROM (VALUES
    ('Reflective Signages', 'Maharashtra', 'Mumbai', 'Tata Infrastructure - Mumbai Branch', 'Tata Infrastructure - Mumbai Branch', 'Highway Signages', '2024-02-05', 50, 1250.00, 1500.00, 75000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '35 days', NOW() - INTERVAL '12 days'),
    ('Reflective Signages', 'Delhi', 'New Delhi', 'DMRC - Delhi Central', 'DMRC - Delhi Central', 'Metro Station Signages', '2024-03-01', 30, 900.00, 1200.00, 36000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days'),
    ('Reflective Signages', 'Gujarat', 'Ahmedabad', 'Adani Group - Ahmedabad Main', 'Adani Group - Ahmedabad Main', 'Port Signages', '2024-03-07', 40, 1000.00, 1400.00, 56000.00, 'sent', 'Employee2', true, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
    ('Reflective Signages', 'Karnataka', 'Bangalore', 'IIPL - Bangalore Main', 'IIPL - Bangalore Main', 'IT Park Signages', '2024-03-09', 25, 750.00, 1300.00, 32500.00, 'negotiation', 'Employee3', true, NOW() - INTERVAL '3 days', NOW()),
    ('Reflective Signages', 'Maharashtra', 'Mumbai', 'NHC - Mumbai Office', 'NHC - Mumbai Office', 'Highway Directional Signs', '2024-03-12', 60, 1500.00, 1450.00, 87000.00, 'draft', 'Employee1', true, NOW(), NOW()),
    ('Reflective Signages', 'Telangana', 'Hyderabad', 'Hyderabad Construction - Main', 'Hyderabad Construction - Main', 'Commercial Building', '2024-02-25', 20, 600.00, 1250.00, 25000.00, 'on_hold', 'Employee2', true, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days')
) AS v(section, state_name, city_name, sub_account_name, customer_name, purpose, date, quantity, area_sq_ft, cost_per_piece, final_total_cost, status, created_by, is_saved, created_at, updated_at);

-- Paint Quotations
WITH state_city_map AS (
    SELECT 
        (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) as mh_state_id,
        (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1) as dl_state_id,
        (SELECT id FROM cities WHERE city_name = 'Mumbai' AND state_id = (SELECT id FROM states WHERE state_name = 'Maharashtra' LIMIT 1) LIMIT 1) as mh_mumbai_city_id,
        (SELECT id FROM cities WHERE city_name = 'New Delhi' AND state_id = (SELECT id FROM states WHERE state_name = 'Delhi' LIMIT 1) LIMIT 1) as dl_delhi_city_id
),
sub_account_map AS (
    SELECT sa.id, sa.sub_account_name 
    FROM sub_accounts sa
)
INSERT INTO quotes_paint (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity, area_sq_ft, cost_per_piece, final_total_cost, status, created_by, is_saved, created_at, updated_at)
SELECT 
    v.section,
    (SELECT CASE 
        WHEN v.state_name = 'Maharashtra' THEN mh_state_id
        WHEN v.state_name = 'Delhi' THEN dl_state_id
    END FROM state_city_map),
    (SELECT CASE 
        WHEN v.city_name = 'Mumbai' THEN mh_mumbai_city_id
        WHEN v.city_name = 'New Delhi' THEN dl_delhi_city_id
    END FROM state_city_map),
    (SELECT id FROM sub_account_map WHERE sub_account_name = v.sub_account_name),
    v.customer_name,
    v.purpose,
    v.date::DATE,
    v.quantity,
    v.area_sq_ft,
    v.cost_per_piece,
    v.final_total_cost,
    v.status,
    v.created_by,
    v.is_saved,
    v.created_at,
    v.updated_at
FROM (VALUES
    ('Paint', 'Maharashtra', 'Mumbai', 'Tata Infrastructure - Mumbai Branch', 'Tata Infrastructure - Mumbai Branch', 'Road Marking', '2024-02-15', 1000, 25000.00, 50.00, 50000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '25 days', NOW() - INTERVAL '8 days'),
    ('Paint', 'Delhi', 'New Delhi', 'DMRC - Delhi Central', 'DMRC - Delhi Central', 'Parking Marking', '2024-03-06', 500, 12500.00, 45.00, 22500.00, 'sent', 'Employee1', true, NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day')
) AS v(section, state_name, city_name, sub_account_name, customer_name, purpose, date, quantity, area_sq_ft, cost_per_piece, final_total_cost, status, created_by, is_saved, created_at, updated_at);

-- =====================================================
-- STEP 5: UPDATE ENGAGEMENT SCORES
-- =====================================================

UPDATE accounts SET engagement_score = (
  SELECT COALESCE(SUM(engagement_score), 0)
  FROM sub_accounts
  WHERE sub_accounts.account_id = accounts.id
  AND sub_accounts.is_active = true
);

-- =====================================================
-- STEP 6: CREATE ACTIVITIES
-- =====================================================

WITH account_map AS (
    SELECT id, account_name FROM accounts
),
contact_map AS (
    SELECT c.id, c.name, sa.sub_account_name 
    FROM contacts c 
    JOIN sub_accounts sa ON c.sub_account_id = sa.id
)
INSERT INTO activities (account_id, contact_id, employee_id, type, description, timestamp, created_at)
SELECT 
    (SELECT id FROM account_map WHERE account_name = v.account_name),
    (SELECT id FROM contact_map WHERE name = v.contact_name),
    v.employee_id,
    v.type,
    v.description,
    v.timestamp,
    v.created_at
FROM (VALUES
    ('Tata Infrastructure Ltd', 'Rajesh Kumar', 'Employee1', 'call', 'Successful call with Rajesh Kumar. Discussed new highway project requirements.', NOW() - INTERVAL '2 days', NOW()),
    ('Tata Infrastructure Ltd', 'Rajesh Kumar', 'Employee1', 'note', 'Follow-up: Rajesh confirmed interest in bulk W-Beam order for Q2.', NOW() - INTERVAL '1 day', NOW()),
    ('Reliance Industries Ltd', 'Priya Sharma', 'Employee1', 'call', 'Connected with Priya Sharma. She requested quotation for factory road project.', NOW() - INTERVAL '5 days', NOW()),
    ('Reliance Industries Ltd', 'Priya Sharma', 'Employee1', 'quotation', 'Quotation #4 created and sent for Reliance Industries factory road project.', NOW() - INTERVAL '3 days', NOW()),
    ('Adani Group', 'Amit Patel', 'Employee2', 'call', 'Initial call with Amit Patel from Adani. Discussed port access road requirements.', NOW() - INTERVAL '8 days', NOW()),
    ('Adani Group', 'Amit Patel', 'Employee2', 'quotation', 'Quotation #5 sent to Adani for Double W-Beam project.', NOW() - INTERVAL '7 days', NOW()),
    ('National Highways Corp', 'Kiran Desai', 'Employee1', 'call', 'Meeting with Kiran Desai about NH-48 expansion project.', NOW() - INTERVAL '4 days', NOW()),
    ('Delhi Metro Rail Corp', 'Suresh Gupta', 'Employee1', 'quotation', 'Quotation #6 created for DMRC metro rail corridor project.', NOW() - INTERVAL '2 days', NOW())
) AS v(account_name, contact_name, employee_id, type, description, timestamp, created_at);

-- =====================================================
-- STEP 7: CREATE LEADS
-- =====================================================

WITH account_map AS (
    SELECT id, account_name FROM accounts
)
INSERT INTO leads (account_id, lead_name, phone, email, requirements, lead_source, status, assigned_employee, created_at, updated_at)
SELECT 
    (SELECT id FROM account_map WHERE account_name = v.account_name),
    v.lead_name,
    v.phone,
    v.email,
    v.requirements,
    v.lead_source,
    v.status,
    v.assigned_employee,
    v.created_at,
    v.updated_at
FROM (VALUES
    ('Hyderabad Construction', 'Telangana Infrastructure Development', '9876543300', 'contact@telinfra.com', 'Requires W-Beam for new expressway project', 'Website', 'New', 'Employee2', NOW() - INTERVAL '3 days', NOW()),
    ('Gujarat Construction Co', 'Gujarat Metro Corporation', '9876543301', 'procurement@gujmetro.com', 'Looking for signages for metro stations', 'Referral', 'In Progress', 'Employee2', NOW() - INTERVAL '5 days', NOW()),
    (NULL, 'Chennai Construction Works', '9876543302', 'info@chennaiworks.com', 'Road safety barriers for city roads', 'Cold Call', 'Quotation Sent', 'Employee3', NOW() - INTERVAL '2 days', NOW())
) AS v(account_name, lead_name, phone, email, requirements, lead_source, status, assigned_employee, created_at, updated_at);

-- =====================================================
-- STEP 8: CREATE TASKS
-- =====================================================

WITH account_map AS (
    SELECT id, account_name FROM accounts
)
INSERT INTO tasks (account_id, title, description, task_type, due_date, status, assigned_to, created_at, updated_at)
SELECT 
    (SELECT id FROM account_map WHERE account_name = v.account_name),
    v.title,
    v.description,
    v.task_type,
    v.due_date,
    v.status,
    v.assigned_to,
    v.created_at,
    v.updated_at
FROM (VALUES
    ('Tata Infrastructure Ltd', 'Follow-up with Rajesh on new project', 'Call Rajesh Kumar to discuss Q2 project timeline', 'Follow-up', NOW() + INTERVAL '3 days', 'In Progress', 'Employee1', NOW() - INTERVAL '1 day', NOW()),
    ('Reliance Industries Ltd', 'Submit revised quotation to Reliance', 'Prepare and send updated quotation with new pricing', 'Follow-up', NOW() + INTERVAL '2 days', 'In Progress', 'Employee1', NOW(), NOW()),
    ('Gujarat Construction Co', 'Initial meeting with Deepak Shah', 'Schedule introductory meeting with Gujarat Construction MD', 'Meeting', NOW() + INTERVAL '5 days', 'Pending', 'Employee2', NOW() - INTERVAL '2 days', NOW()),
    ('Hyderabad Construction', 'Contact verification for Karthik Rao', 'Verify contact details for Hyderabad Construction founder', 'Call', NOW() + INTERVAL '1 day', 'Pending', 'Employee2', NOW(), NOW()),
    ('National Highways Corp', 'Send project update to NHC', 'Provide status update on NH-48 expansion quotation', 'Follow-up', NOW() + INTERVAL '4 days', 'Pending', 'Employee1', NOW() - INTERVAL '1 day', NOW())
) AS v(account_name, title, description, task_type, due_date, status, assigned_to, created_at, updated_at);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Dummy data created successfully!';
    RAISE NOTICE '📊 Accounts: %', (SELECT COUNT(*) FROM accounts);
    RAISE NOTICE '🏢 Sub-Accounts: %', (SELECT COUNT(*) FROM sub_accounts);
    RAISE NOTICE '👥 Contacts: %', (SELECT COUNT(*) FROM contacts);
    RAISE NOTICE '📋 Quotations MBCB: %', (SELECT COUNT(*) FROM quotes_mbcb);
    RAISE NOTICE '📋 Quotations Signages: %', (SELECT COUNT(*) FROM quotes_signages);
    RAISE NOTICE '📋 Quotations Paint: %', (SELECT COUNT(*) FROM quotes_paint);
    RAISE NOTICE '🎯 Leads: %', (SELECT COUNT(*) FROM leads);
    RAISE NOTICE '✅ Tasks: %', (SELECT COUNT(*) FROM tasks);
    RAISE NOTICE '📝 Activities: %', (SELECT COUNT(*) FROM activities);
END $$;

