-- =====================================================
-- FINAL WORKING DUMMY DATA SCRIPT - NO ERRORS
-- YNM Safety CRM & Price Engine Integration
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
DO $$
BEGIN
    ALTER SEQUENCE IF EXISTS accounts_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS sub_accounts_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS contacts_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS quotes_mbcb_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS quotes_signages_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS quotes_paint_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS leads_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS tasks_id_seq RESTART WITH 1;
    ALTER SEQUENCE IF EXISTS activities_id_seq RESTART WITH 1;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- =====================================================
-- STEP 1: CREATE STATES
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM states WHERE state_name = 'Maharashtra') THEN
        INSERT INTO states (state_name) VALUES ('Maharashtra');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM states WHERE state_name = 'Gujarat') THEN
        INSERT INTO states (state_name) VALUES ('Gujarat');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM states WHERE state_name = 'Karnataka') THEN
        INSERT INTO states (state_name) VALUES ('Karnataka');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM states WHERE state_name = 'Delhi') THEN
        INSERT INTO states (state_name) VALUES ('Delhi');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM states WHERE state_name = 'Telangana') THEN
        INSERT INTO states (state_name) VALUES ('Telangana');
    END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE CITIES
-- =====================================================
DO $$
DECLARE
    mh_id INTEGER;
    gj_id INTEGER;
    ka_id INTEGER;
    dl_id INTEGER;
    ts_id INTEGER;
BEGIN
    SELECT id INTO mh_id FROM states WHERE state_name = 'Maharashtra' LIMIT 1;
    SELECT id INTO gj_id FROM states WHERE state_name = 'Gujarat' LIMIT 1;
    SELECT id INTO ka_id FROM states WHERE state_name = 'Karnataka' LIMIT 1;
    SELECT id INTO dl_id FROM states WHERE state_name = 'Delhi' LIMIT 1;
    SELECT id INTO ts_id FROM states WHERE state_name = 'Telangana' LIMIT 1;

    IF mh_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM cities WHERE city_name = 'Mumbai' AND state_id = mh_id) THEN
            INSERT INTO cities (city_name, state_id) VALUES ('Mumbai', mh_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM cities WHERE city_name = 'Pune' AND state_id = mh_id) THEN
            INSERT INTO cities (city_name, state_id) VALUES ('Pune', mh_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM cities WHERE city_name = 'Nashik' AND state_id = mh_id) THEN
            INSERT INTO cities (city_name, state_id) VALUES ('Nashik', mh_id);
        END IF;
    END IF;

    IF gj_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM cities WHERE city_name = 'Ahmedabad' AND state_id = gj_id) THEN
            INSERT INTO cities (city_name, state_id) VALUES ('Ahmedabad', gj_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM cities WHERE city_name = 'Surat' AND state_id = gj_id) THEN
            INSERT INTO cities (city_name, state_id) VALUES ('Surat', gj_id);
        END IF;
    END IF;

    IF ka_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM cities WHERE city_name = 'Bangalore' AND state_id = ka_id) THEN
            INSERT INTO cities (city_name, state_id) VALUES ('Bangalore', ka_id);
        END IF;
    END IF;

    IF dl_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM cities WHERE city_name = 'New Delhi' AND state_id = dl_id) THEN
            INSERT INTO cities (city_name, state_id) VALUES ('New Delhi', dl_id);
        END IF;
    END IF;

    IF ts_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM cities WHERE city_name = 'Hyderabad' AND state_id = ts_id) THEN
            INSERT INTO cities (city_name, state_id) VALUES ('Hyderabad', ts_id);
        END IF;
    END IF;
END $$;

-- =====================================================
-- STEP 3: CREATE ACCOUNTS
-- =====================================================
DO $$
DECLARE
    mh_mumbai_id INTEGER;
    gj_ahmedabad_id INTEGER;
    ka_bangalore_id INTEGER;
    dl_delhi_id INTEGER;
    ts_hyderabad_id INTEGER;
BEGIN
    SELECT c.id INTO mh_mumbai_id FROM cities c JOIN states s ON s.id = c.state_id 
        WHERE s.state_name = 'Maharashtra' AND c.city_name = 'Mumbai' LIMIT 1;
    SELECT c.id INTO gj_ahmedabad_id FROM cities c JOIN states s ON s.id = c.state_id 
        WHERE s.state_name = 'Gujarat' AND c.city_name = 'Ahmedabad' LIMIT 1;
    SELECT c.id INTO ka_bangalore_id FROM cities c JOIN states s ON s.id = c.state_id 
        WHERE s.state_name = 'Karnataka' AND c.city_name = 'Bangalore' LIMIT 1;
    SELECT c.id INTO dl_delhi_id FROM cities c JOIN states s ON s.id = c.state_id 
        WHERE s.state_name = 'Delhi' AND c.city_name = 'New Delhi' LIMIT 1;
    SELECT c.id INTO ts_hyderabad_id FROM cities c JOIN states s ON s.id = c.state_id 
        WHERE s.state_name = 'Telangana' AND c.city_name = 'Hyderabad' LIMIT 1;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Tata Infrastructure Ltd') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, website, gst_number, notes, is_active, engagement_score, created_at, updated_at)
        SELECT 'Tata Infrastructure Ltd', 'Enterprise', 'Customer', s.id, mh_mumbai_id, 'Rajesh Kumar', '9876543210', 'rajesh@tatainfra.com', 'Mumbai, Maharashtra', 'https://tatainfra.com', '27AABCU9603R1Z5', 'Major infrastructure client. High volume orders.', true, 0, NOW(), NOW()
        FROM states s WHERE s.state_name = 'Maharashtra';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Reliance Industries Ltd') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, website, gst_number, notes, is_active, engagement_score, created_at, updated_at)
        SELECT 'Reliance Industries Ltd', 'Enterprise', 'Customer', s.id, mh_mumbai_id, 'Priya Sharma', '9876543211', 'priya@ril.com', 'Mumbai, Maharashtra', 'https://ril.com', '27AAACR1234A1Z6', 'Enterprise client. Regular orders.', true, 0, NOW(), NOW()
        FROM states s WHERE s.state_name = 'Maharashtra';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Adani Group') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, website, gst_number, notes, is_active, engagement_score, created_at, updated_at)
        SELECT 'Adani Group', 'Enterprise', 'Customer', s.id, gj_ahmedabad_id, 'Amit Patel', '9876543212', 'amit@adani.com', 'Ahmedabad, Gujarat', 'https://adani.com', '24AABCD1234E1Z7', 'Large enterprise client.', true, 0, NOW(), NOW()
        FROM states s WHERE s.state_name = 'Gujarat';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Maharashtra Roadways Pvt Ltd') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, website, gst_number, notes, is_active, engagement_score, created_at, updated_at)
        SELECT 'Maharashtra Roadways Pvt Ltd', 'SMB', 'Customer', s.id, mh_mumbai_id, 'Sanjay Mehta', '9876543213', 'sanjay@mhroadways.com', 'Mumbai, Maharashtra', NULL, '27AABCM1234F1Z8', 'Regional contractor. Good relationship.', true, 0, NOW(), NOW()
        FROM states s WHERE s.state_name = 'Maharashtra';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Gujarat Construction Co') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, website, gst_number, notes, is_active, engagement_score, created_at, updated_at)
        SELECT 'Gujarat Construction Co', 'SMB', 'Prospect', s.id, gj_ahmedabad_id, 'Deepak Shah', '9876543214', 'deepak@gujconstruct.com', 'Ahmedabad, Gujarat', NULL, '24AABCG1234H1Z9', 'New prospect. Following up.', true, 0, NOW(), NOW()
        FROM states s WHERE s.state_name = 'Gujarat';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Karnataka Builders') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, website, gst_number, notes, is_active, engagement_score, created_at, updated_at)
        SELECT 'Karnataka Builders', 'SMB', 'Onboard', s.id, ka_bangalore_id, 'Vikram Reddy', '9876543215', 'vikram@karbuilders.com', 'Bangalore, Karnataka', NULL, '29AABCK1234I1Z0', 'Recently onboarded client.', true, 0, NOW(), NOW()
        FROM states s WHERE s.state_name = 'Karnataka';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'National Highways Corp') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, website, gst_number, notes, is_active, engagement_score, created_at, updated_at)
        SELECT 'National Highways Corp', 'Pan India', 'Customer', s.id, mh_mumbai_id, 'Kiran Desai', '9876543216', 'kiran@nhcorp.com', 'Mumbai, Maharashtra', 'https://nhcorp.com', '27AABCN1234J1Z1', 'Pan India operations. Multiple projects.', true, 0, NOW(), NOW()
        FROM states s WHERE s.state_name = 'Maharashtra';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'India Infrastructure Pvt Ltd') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, website, gst_number, notes, is_active, engagement_score, created_at, updated_at)
        SELECT 'India Infrastructure Pvt Ltd', 'Pan India', 'Retention', s.id, ka_bangalore_id, 'Ramesh Iyer', '9876543217', 'ramesh@iipl.com', 'Bangalore, Karnataka', NULL, '29AABCI1234K1Z2', 'Requires retention efforts.', true, 0, NOW(), NOW()
        FROM states s WHERE s.state_name = 'Karnataka';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Delhi Metro Rail Corp') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, website, gst_number, notes, is_active, engagement_score, created_at, updated_at)
        SELECT 'Delhi Metro Rail Corp', 'SMB', 'Customer', s.id, dl_delhi_id, 'Suresh Gupta', '9876543218', 'suresh@dmrc.com', 'New Delhi', 'https://dmrc.com', '07AABCD1234L1Z3', 'Metro rail projects. Regular orders.', true, 0, NOW(), NOW()
        FROM states s WHERE s.state_name = 'Delhi';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Hyderabad Construction') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, website, gst_number, notes, is_active, engagement_score, created_at, updated_at)
        SELECT 'Hyderabad Construction', 'SMB', 'New', s.id, ts_hyderabad_id, 'Karthik Rao', '9876543219', 'karthik@hydconstruct.com', 'Hyderabad, Telangana', NULL, '36AABCH1234M1Z4', 'New account. Initial contact.', true, 0, NOW(), NOW()
        FROM states s WHERE s.state_name = 'Telangana';
    END IF;
END $$;

-- =====================================================
-- STEP 4: CREATE SUB-ACCOUNTS
-- =====================================================
DO $$
DECLARE
    tata_id INTEGER;
    reliance_id INTEGER;
    adani_id INTEGER;
    mh_roadways_id INTEGER;
    guj_const_id INTEGER;
    karnataka_builders_id INTEGER;
    nhc_id INTEGER;
    iipl_id INTEGER;
    dmrc_id INTEGER;
    hyd_const_id INTEGER;
BEGIN
    SELECT id INTO tata_id FROM accounts WHERE account_name = 'Tata Infrastructure Ltd' LIMIT 1;
    SELECT id INTO reliance_id FROM accounts WHERE account_name = 'Reliance Industries Ltd' LIMIT 1;
    SELECT id INTO adani_id FROM accounts WHERE account_name = 'Adani Group' LIMIT 1;
    SELECT id INTO mh_roadways_id FROM accounts WHERE account_name = 'Maharashtra Roadways Pvt Ltd' LIMIT 1;
    SELECT id INTO guj_const_id FROM accounts WHERE account_name = 'Gujarat Construction Co' LIMIT 1;
    SELECT id INTO karnataka_builders_id FROM accounts WHERE account_name = 'Karnataka Builders' LIMIT 1;
    SELECT id INTO nhc_id FROM accounts WHERE account_name = 'National Highways Corp' LIMIT 1;
    SELECT id INTO iipl_id FROM accounts WHERE account_name = 'India Infrastructure Pvt Ltd' LIMIT 1;
    SELECT id INTO dmrc_id FROM accounts WHERE account_name = 'Delhi Metro Rail Corp' LIMIT 1;
    SELECT id INTO hyd_const_id FROM accounts WHERE account_name = 'Hyderabad Construction' LIMIT 1;

    IF tata_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = tata_id AND sub_account_name = 'Tata Infrastructure - Mumbai Branch') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (tata_id, 'Tata Infrastructure - Mumbai Branch', 'Employee1', 85, true, NOW(), NOW());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = tata_id AND sub_account_name = 'Tata Infrastructure - Pune Branch') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (tata_id, 'Tata Infrastructure - Pune Branch', 'Employee2', 75, true, NOW(), NOW());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = tata_id AND sub_account_name = 'Tata Infrastructure - Nashik Branch') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (tata_id, 'Tata Infrastructure - Nashik Branch', 'Employee3', 65, true, NOW(), NOW());
        END IF;
    END IF;

    IF reliance_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = reliance_id AND sub_account_name = 'Reliance Industries - Mumbai HQ') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (reliance_id, 'Reliance Industries - Mumbai HQ', 'Employee1', 90, true, NOW(), NOW());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = reliance_id AND sub_account_name = 'Reliance Industries - Navi Mumbai') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (reliance_id, 'Reliance Industries - Navi Mumbai', 'Employee2', 70, true, NOW(), NOW());
        END IF;
    END IF;

    IF adani_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = adani_id AND sub_account_name = 'Adani Group - Ahmedabad Main') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (adani_id, 'Adani Group - Ahmedabad Main', 'Employee2', 80, true, NOW(), NOW());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = adani_id AND sub_account_name = 'Adani Group - Surat Branch') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (adani_id, 'Adani Group - Surat Branch', 'Employee3', 60, true, NOW(), NOW());
        END IF;
    END IF;

    IF mh_roadways_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = mh_roadways_id AND sub_account_name = 'Maharashtra Roadways - Mumbai') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (mh_roadways_id, 'Maharashtra Roadways - Mumbai', 'Employee1', 55, true, NOW(), NOW());
        END IF;
    END IF;

    IF guj_const_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = guj_const_id AND sub_account_name = 'Gujarat Construction - Ahmedabad') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (guj_const_id, 'Gujarat Construction - Ahmedabad', 'Employee2', 45, true, NOW(), NOW());
        END IF;
    END IF;

    IF karnataka_builders_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = karnataka_builders_id AND sub_account_name = 'Karnataka Builders - Bangalore') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (karnataka_builders_id, 'Karnataka Builders - Bangalore', 'Employee3', 50, true, NOW(), NOW());
        END IF;
    END IF;

    IF nhc_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = nhc_id AND sub_account_name = 'NHC - Mumbai Office') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (nhc_id, 'NHC - Mumbai Office', 'Employee1', 75, true, NOW(), NOW());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = nhc_id AND sub_account_name = 'NHC - Delhi Office') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (nhc_id, 'NHC - Delhi Office', 'Employee2', 70, true, NOW(), NOW());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = nhc_id AND sub_account_name = 'NHC - Bangalore Office') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (nhc_id, 'NHC - Bangalore Office', 'Employee3', 65, true, NOW(), NOW());
        END IF;
    END IF;

    IF iipl_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = iipl_id AND sub_account_name = 'IIPL - Bangalore Main') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (iipl_id, 'IIPL - Bangalore Main', 'Employee3', 60, true, NOW(), NOW());
        END IF;
    END IF;

    IF dmrc_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = dmrc_id AND sub_account_name = 'DMRC - Delhi Central') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (dmrc_id, 'DMRC - Delhi Central', 'Employee1', 70, true, NOW(), NOW());
        END IF;
    END IF;

    IF hyd_const_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = hyd_const_id AND sub_account_name = 'Hyderabad Construction - Main') THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at)
            VALUES (hyd_const_id, 'Hyderabad Construction - Main', 'Employee2', 35, true, NOW(), NOW());
        END IF;
    END IF;
END $$;

-- =====================================================
-- STEP 5: UPDATE ENGAGEMENT SCORES FOR ACCOUNTS
-- =====================================================
UPDATE accounts SET engagement_score = (
    SELECT COALESCE(SUM(engagement_score), 0)
    FROM sub_accounts
    WHERE sub_accounts.account_id = accounts.id
    AND sub_accounts.is_active = true
);

-- =====================================================
-- STEP 6: CREATE CONTACTS
-- =====================================================
DO $$
DECLARE
    sa_id INTEGER;
    acc_id INTEGER;
BEGIN
    -- Tata Mumbai contacts
    SELECT sa.id, sa.account_id INTO sa_id, acc_id FROM sub_accounts sa WHERE sa.sub_account_name = 'Tata Infrastructure - Mumbai Branch' LIMIT 1;
    IF sa_id IS NOT NULL AND acc_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE account_id = acc_id AND sub_account_id = sa_id AND name = 'Rajesh Kumar') THEN
            INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by, created_at, updated_at)
            VALUES (acc_id, sa_id, 'Rajesh Kumar', 'Project Manager', 'rajesh.kumar@tatainfra.com', '9876543210', 'Connected', 'Decision maker. Interested in bulk orders.', NULL, 'Employee1', NOW(), NOW());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE account_id = acc_id AND sub_account_id = sa_id AND name = 'Anita Desai') THEN
            INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by, created_at, updated_at)
            VALUES (acc_id, sa_id, 'Anita Desai', 'Procurement Head', 'anita.desai@tatainfra.com', '9876543220', 'Connected', 'Handles procurement decisions.', NULL, 'Employee1', NOW(), NOW());
        END IF;
    END IF;

    -- Reliance contacts
    SELECT sa.id, sa.account_id INTO sa_id, acc_id FROM sub_accounts sa WHERE sa.sub_account_name = 'Reliance Industries - Mumbai HQ' LIMIT 1;
    IF sa_id IS NOT NULL AND acc_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE account_id = acc_id AND sub_account_id = sa_id AND name = 'Priya Sharma') THEN
            INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by, created_at, updated_at)
            VALUES (acc_id, sa_id, 'Priya Sharma', 'VP Procurement', 'priya.sharma@ril.com', '9876543211', 'Connected', 'Key decision maker. High priority.', NULL, 'Employee1', NOW(), NOW());
        END IF;
    END IF;

    -- Adani contacts
    SELECT sa.id, sa.account_id INTO sa_id, acc_id FROM sub_accounts sa WHERE sa.sub_account_name = 'Adani Group - Ahmedabad Main' LIMIT 1;
    IF sa_id IS NOT NULL AND acc_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE account_id = acc_id AND sub_account_id = sa_id AND name = 'Amit Patel') THEN
            INSERT INTO contacts (account_id, sub_account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by, created_at, updated_at)
            VALUES (acc_id, sa_id, 'Amit Patel', 'General Manager', 'amit.patel@adani.com', '9876543212', 'Connected', 'Main contact for Adani group.', NULL, 'Employee2', NOW(), NOW());
        END IF;
    END IF;
END $$;

-- =====================================================
-- STEP 7: CREATE QUOTATIONS (MBCB) - Sample
-- =====================================================
DO $$
DECLARE
    sa_id INTEGER;
    state_id_val INTEGER;
    city_id_val INTEGER;
BEGIN
    -- Tata Mumbai quotation
    SELECT sa.id, s.id, c.id INTO sa_id, state_id_val, city_id_val
    FROM sub_accounts sa
    JOIN accounts a ON a.id = sa.account_id
    JOIN states s ON s.id = a.state_id
    JOIN cities c ON c.id = a.city_id
    WHERE sa.sub_account_name = 'Tata Infrastructure - Mumbai Branch'
    LIMIT 1;

    IF sa_id IS NOT NULL AND state_id_val IS NOT NULL AND city_id_val IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM quotes_mbcb 
            WHERE sub_account_id = sa_id 
            AND purpose = 'Highway Construction'
            AND date = '2024-01-15'
        ) THEN
            INSERT INTO quotes_mbcb (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, status, created_by, is_saved, created_at, updated_at)
            VALUES ('W-Beam', state_id_val, city_id_val, sa_id, 'Tata Infrastructure - Mumbai Branch', 'Highway Construction', '2024-01-15', 500, 45.5, 2500.00, 1250000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '45 days', NOW() - INTERVAL '10 days');
        END IF;
    END IF;

    -- Reliance quotation
    SELECT sa.id, s.id, c.id INTO sa_id, state_id_val, city_id_val
    FROM sub_accounts sa
    JOIN accounts a ON a.id = sa.account_id
    JOIN states s ON s.id = a.state_id
    JOIN cities c ON c.id = a.city_id
    WHERE sa.sub_account_name = 'Reliance Industries - Mumbai HQ'
    LIMIT 1;

    IF sa_id IS NOT NULL AND state_id_val IS NOT NULL AND city_id_val IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM quotes_mbcb 
            WHERE sub_account_id = sa_id 
            AND purpose = 'Factory Road'
            AND date = '2024-02-10'
        ) THEN
            INSERT INTO quotes_mbcb (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, status, created_by, is_saved, created_at, updated_at)
            VALUES ('W-Beam', state_id_val, city_id_val, sa_id, 'Reliance Industries - Mumbai HQ', 'Factory Road', '2024-02-10', 250, 45.5, 2500.00, 625000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '21 days', NOW() - INTERVAL '3 days');
        END IF;
    END IF;

    -- Adani quotation
    SELECT sa.id, s.id, c.id INTO sa_id, state_id_val, city_id_val
    FROM sub_accounts sa
    JOIN accounts a ON a.id = sa.account_id
    JOIN states s ON s.id = a.state_id
    JOIN cities c ON c.id = a.city_id
    WHERE sa.sub_account_name = 'Adani Group - Ahmedabad Main'
    LIMIT 1;

    IF sa_id IS NOT NULL AND state_id_val IS NOT NULL AND city_id_val IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM quotes_mbcb 
            WHERE sub_account_id = sa_id 
            AND purpose = 'Port Access Road'
            AND date = '2024-03-05'
        ) THEN
            INSERT INTO quotes_mbcb (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, status, created_by, is_saved, created_at, updated_at)
            VALUES ('Double W-Beam', state_id_val, city_id_val, sa_id, 'Adani Group - Ahmedabad Main', 'Port Access Road', '2024-03-05', 400, 91.0, 5000.00, 2000000.00, 'sent', 'Employee2', true, NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days');
        END IF;
    END IF;
END $$;

-- =====================================================
-- STEP 8: CREATE ACTIVITIES
-- =====================================================
DO $$
DECLARE
    acc_id INTEGER;
    cont_id INTEGER;
BEGIN
    SELECT id INTO acc_id FROM accounts WHERE account_name = 'Tata Infrastructure Ltd' LIMIT 1;
    IF acc_id IS NOT NULL THEN
        SELECT c.id INTO cont_id FROM contacts c
        JOIN sub_accounts sa ON sa.id = c.sub_account_id
        WHERE sa.account_id = acc_id AND c.name = 'Rajesh Kumar'
        LIMIT 1;
        
        IF cont_id IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM activities WHERE account_id = acc_id AND contact_id = cont_id AND activity_type = 'call' AND description LIKE 'Successful call%') THEN
                INSERT INTO activities (account_id, contact_id, employee_id, activity_type, description, timestamp)
                VALUES (acc_id, cont_id, 'Employee1', 'call', 'Successful call with Rajesh Kumar. Discussed new highway project requirements.', NOW() - INTERVAL '2 days');
            END IF;
        END IF;
    END IF;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT '✅ Accounts: ' || COUNT(*)::TEXT as summary FROM accounts
UNION ALL SELECT '✅ Sub-Accounts: ' || COUNT(*)::TEXT FROM sub_accounts
UNION ALL SELECT '✅ Contacts: ' || COUNT(*)::TEXT FROM contacts
UNION ALL SELECT '✅ Quotations MBCB: ' || COUNT(*)::TEXT FROM quotes_mbcb
UNION ALL SELECT '✅ Quotations Signages: ' || COUNT(*)::TEXT FROM quotes_signages
UNION ALL SELECT '✅ Quotations Paint: ' || COUNT(*)::TEXT FROM quotes_paint
UNION ALL SELECT '✅ Activities: ' || COUNT(*)::TEXT FROM activities;

