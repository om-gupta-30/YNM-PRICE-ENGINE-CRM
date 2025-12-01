-- =====================================================
-- ADD MORE COMPREHENSIVE DUMMY DATA - FINAL VERSION
-- YNM Safety CRM & Price Engine
-- Adds more accounts, sub-accounts, contacts, follow-ups, activities, and quotations
-- Safe to run multiple times (uses IF NOT EXISTS checks)
-- =====================================================

DO $$
DECLARE
    -- State IDs
    mh_id INTEGER;
    gj_id INTEGER;
    ka_id INTEGER;
    dl_id INTEGER;
    ts_id INTEGER;
    tn_id INTEGER;
    rj_id INTEGER;
    up_id INTEGER;
    
    -- City IDs
    mumbai_id INTEGER;
    pune_id INTEGER;
    ahmedabad_id INTEGER;
    surat_id INTEGER;
    bangalore_id INTEGER;
    delhi_id INTEGER;
    hyderabad_id INTEGER;
    chennai_id INTEGER;
    jaipur_id INTEGER;
    lucknow_id INTEGER;
    
    -- Account IDs
    acc1_id INTEGER;
    acc2_id INTEGER;
    acc3_id INTEGER;
    acc4_id INTEGER;
    acc5_id INTEGER;
    acc6_id INTEGER;
    acc7_id INTEGER;
    acc8_id INTEGER;
    acc9_id INTEGER;
    acc10_id INTEGER;
    acc11_id INTEGER;
    acc12_id INTEGER;
    acc13_id INTEGER;
    acc14_id INTEGER;
    acc15_id INTEGER;
    
    -- Sub-account IDs
    sa_id INTEGER;
    cont_id INTEGER;
BEGIN
    -- Get State IDs
    SELECT id INTO mh_id FROM states WHERE state_name = 'Maharashtra' LIMIT 1;
    SELECT id INTO gj_id FROM states WHERE state_name = 'Gujarat' LIMIT 1;
    SELECT id INTO ka_id FROM states WHERE state_name = 'Karnataka' LIMIT 1;
    SELECT id INTO dl_id FROM states WHERE state_name = 'Delhi' LIMIT 1;
    SELECT id INTO ts_id FROM states WHERE state_name = 'Telangana' LIMIT 1;
    SELECT id INTO tn_id FROM states WHERE state_name = 'Tamil Nadu' LIMIT 1;
    SELECT id INTO rj_id FROM states WHERE state_name = 'Rajasthan' LIMIT 1;
    SELECT id INTO up_id FROM states WHERE state_name = 'Uttar Pradesh' LIMIT 1;
    
    -- Get City IDs
    SELECT id INTO mumbai_id FROM cities WHERE city_name = 'Mumbai' AND state_id = mh_id LIMIT 1;
    SELECT id INTO pune_id FROM cities WHERE city_name = 'Pune' AND state_id = mh_id LIMIT 1;
    SELECT id INTO ahmedabad_id FROM cities WHERE city_name = 'Ahmedabad' AND state_id = gj_id LIMIT 1;
    SELECT id INTO surat_id FROM cities WHERE city_name = 'Surat' AND state_id = gj_id LIMIT 1;
    SELECT id INTO bangalore_id FROM cities WHERE city_name = 'Bangalore' AND state_id = ka_id LIMIT 1;
    SELECT id INTO delhi_id FROM cities WHERE city_name = 'New Delhi' AND state_id = dl_id LIMIT 1;
    SELECT id INTO hyderabad_id FROM cities WHERE city_name = 'Hyderabad' AND state_id = ts_id LIMIT 1;
    SELECT id INTO chennai_id FROM cities WHERE city_name = 'Chennai' AND state_id = tn_id LIMIT 1;
    SELECT id INTO jaipur_id FROM cities WHERE city_name = 'Jaipur' AND state_id = rj_id LIMIT 1;
    SELECT id INTO lucknow_id FROM cities WHERE city_name = 'Lucknow' AND state_id = up_id LIMIT 1;
    
    -- =====================================================
    -- CREATE MORE ACCOUNTS
    -- =====================================================
    
    -- Account 1: Reliance Industries Ltd
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Reliance Industries Ltd') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('Reliance Industries Ltd', 'Enterprise', 'Customer', 'One of India''s largest conglomerates. Regular orders for highway projects.', 95, true)
        RETURNING id INTO acc1_id;
    ELSE
        SELECT id INTO acc1_id FROM accounts WHERE account_name = 'Reliance Industries Ltd' LIMIT 1;
    END IF;
    
    -- Account 2: L&T Infrastructure
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'L&T Infrastructure') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('L&T Infrastructure', 'Enterprise', 'Customer', 'Leading infrastructure company with multiple ongoing projects.', 88, true)
        RETURNING id INTO acc2_id;
    ELSE
        SELECT id INTO acc2_id FROM accounts WHERE account_name = 'L&T Infrastructure' LIMIT 1;
    END IF;
    
    -- Account 3: GMR Group
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'GMR Group') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('GMR Group', 'Enterprise', 'Prospect', 'Infrastructure developer. Interested in bulk orders for airport and highway projects.', 72, true)
        RETURNING id INTO acc3_id;
    ELSE
        SELECT id INTO acc3_id FROM accounts WHERE account_name = 'GMR Group' LIMIT 1;
    END IF;
    
    -- Account 4: IRB Infrastructure
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'IRB Infrastructure') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('IRB Infrastructure', 'SMB', 'Customer', 'Highway construction company. Regular customer for road safety products.', 65, true)
        RETURNING id INTO acc4_id;
    ELSE
        SELECT id INTO acc4_id FROM accounts WHERE account_name = 'IRB Infrastructure' LIMIT 1;
    END IF;
    
    -- Account 5: Welspun Enterprises
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Welspun Enterprises') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('Welspun Enterprises', 'SMB', 'Onboard', 'Recently onboarded. First order pending.', 45, true)
        RETURNING id INTO acc5_id;
    ELSE
        SELECT id INTO acc5_id FROM accounts WHERE account_name = 'Welspun Enterprises' LIMIT 1;
    END IF;
    
    -- Account 6: NCC Limited
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'NCC Limited') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('NCC Limited', 'SMB', 'Customer', 'Construction company. Regular orders for various projects.', 58, true)
        RETURNING id INTO acc6_id;
    ELSE
        SELECT id INTO acc6_id FROM accounts WHERE account_name = 'NCC Limited' LIMIT 1;
    END IF;
    
    -- Account 7: Simplex Infrastructure
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Simplex Infrastructure') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('Simplex Infrastructure', 'SMB', 'Needs Attention', 'Customer with delayed payments. Follow up required.', 35, true)
        RETURNING id INTO acc7_id;
    ELSE
        SELECT id INTO acc7_id FROM accounts WHERE account_name = 'Simplex Infrastructure' LIMIT 1;
    END IF;
    
    -- Account 8: Essar Projects
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Essar Projects') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('Essar Projects', 'SMB', 'Renewal', 'Contract renewal discussion pending.', 50, true)
        RETURNING id INTO acc8_id;
    ELSE
        SELECT id INTO acc8_id FROM accounts WHERE account_name = 'Essar Projects' LIMIT 1;
    END IF;
    
    -- Account 9: GVK Power & Infrastructure
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'GVK Power & Infrastructure') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('GVK Power & Infrastructure', 'Enterprise', 'Prospect', 'Large infrastructure player. Initial discussions ongoing.', 62, true)
        RETURNING id INTO acc9_id;
    ELSE
        SELECT id INTO acc9_id FROM accounts WHERE account_name = 'GVK Power & Infrastructure' LIMIT 1;
    END IF;
    
    -- Account 10: Hindustan Construction Company
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Hindustan Construction Company') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('Hindustan Construction Company', 'Enterprise', 'Customer', 'Major construction company. Long-term customer.', 85, true)
        RETURNING id INTO acc10_id;
    ELSE
        SELECT id INTO acc10_id FROM accounts WHERE account_name = 'Hindustan Construction Company' LIMIT 1;
    END IF;
    
    -- Account 11: Dilip Buildcon
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Dilip Buildcon') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('Dilip Buildcon', 'SMB', 'Upselling', 'Existing customer. Potential for larger orders identified.', 75, true)
        RETURNING id INTO acc11_id;
    ELSE
        SELECT id INTO acc11_id FROM accounts WHERE account_name = 'Dilip Buildcon' LIMIT 1;
    END IF;
    
    -- Account 12: PNC Infratech
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'PNC Infratech') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('PNC Infratech', 'SMB', 'Customer', 'Infrastructure development company. Regular orders.', 68, true)
        RETURNING id INTO acc12_id;
    ELSE
        SELECT id INTO acc12_id FROM accounts WHERE account_name = 'PNC Infratech' LIMIT 1;
    END IF;
    
    -- Account 13: KNR Constructions
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'KNR Constructions') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('KNR Constructions', 'SMB', 'Retention', 'Risk of churn. Retention efforts required.', 40, true)
        RETURNING id INTO acc13_id;
    ELSE
        SELECT id INTO acc13_id FROM accounts WHERE account_name = 'KNR Constructions' LIMIT 1;
    END IF;
    
    -- Account 14: Sadbhav Engineering
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Sadbhav Engineering') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('Sadbhav Engineering', 'SMB', 'Lapsed', 'Former customer. Re-engagement campaign.', 25, true)
        RETURNING id INTO acc14_id;
    ELSE
        SELECT id INTO acc14_id FROM accounts WHERE account_name = 'Sadbhav Engineering' LIMIT 1;
    END IF;
    
    -- Account 15: MEP Infrastructure
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'MEP Infrastructure') THEN
        INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
        VALUES ('MEP Infrastructure', 'SMB', 'New', 'New lead. Initial contact made.', 30, true)
        RETURNING id INTO acc15_id;
    ELSE
        SELECT id INTO acc15_id FROM accounts WHERE account_name = 'MEP Infrastructure' LIMIT 1;
    END IF;
    
    -- =====================================================
    -- CREATE SUB-ACCOUNTS
    -- =====================================================
    
    -- Sub-accounts for Reliance Industries (Employee1)
    IF acc1_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'Reliance - Mumbai Office' AND account_id = acc1_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc1_id, 'Reliance - Mumbai Office', 'Employee1', mh_id, mumbai_id, 95, true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'Reliance - Ahmedabad Branch' AND account_id = acc1_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc1_id, 'Reliance - Ahmedabad Branch', 'Employee1', gj_id, ahmedabad_id, 88, true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'Reliance - Delhi Operations' AND account_id = acc1_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc1_id, 'Reliance - Delhi Operations', 'Employee2', dl_id, delhi_id, 92, true);
        END IF;
    END IF;
    
    -- Sub-accounts for L&T Infrastructure (Employee2)
    IF acc2_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'L&T - Pune Division' AND account_id = acc2_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc2_id, 'L&T - Pune Division', 'Employee2', mh_id, pune_id, 85, true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'L&T - Bangalore Unit' AND account_id = acc2_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc2_id, 'L&T - Bangalore Unit', 'Employee2', ka_id, bangalore_id, 82, true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'L&T - Hyderabad Branch' AND account_id = acc2_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc2_id, 'L&T - Hyderabad Branch', 'Employee3', ts_id, hyderabad_id, 90, true);
        END IF;
    END IF;
    
    -- Sub-accounts for GMR Group (Employee1)
    IF acc3_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'GMR - Delhi Airport' AND account_id = acc3_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc3_id, 'GMR - Delhi Airport', 'Employee1', dl_id, delhi_id, 70, true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'GMR - Hyderabad Airport' AND account_id = acc3_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc3_id, 'GMR - Hyderabad Airport', 'Employee1', ts_id, hyderabad_id, 75, true);
        END IF;
    END IF;
    
    -- Sub-accounts for IRB Infrastructure (Employee2)
    IF acc4_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'IRB - Mumbai Highway' AND account_id = acc4_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc4_id, 'IRB - Mumbai Highway', 'Employee2', mh_id, mumbai_id, 60, true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'IRB - Pune Projects' AND account_id = acc4_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc4_id, 'IRB - Pune Projects', 'Employee2', mh_id, pune_id, 70, true);
        END IF;
    END IF;
    
    -- Sub-accounts for Welspun Enterprises (Employee3)
    IF acc5_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'Welspun - Ahmedabad' AND account_id = acc5_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc5_id, 'Welspun - Ahmedabad', 'Employee3', gj_id, ahmedabad_id, 45, true);
        END IF;
    END IF;
    
    -- Sub-accounts for NCC Limited (Employee1)
    IF acc6_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'NCC - Bangalore' AND account_id = acc6_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc6_id, 'NCC - Bangalore', 'Employee1', ka_id, bangalore_id, 55, true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'NCC - Chennai' AND account_id = acc6_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc6_id, 'NCC - Chennai', 'Employee1', tn_id, chennai_id, 60, true);
        END IF;
    END IF;
    
    -- Sub-accounts for Simplex Infrastructure (Employee2)
    IF acc7_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'Simplex - Kolkata' AND account_id = acc7_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc7_id, 'Simplex - Kolkata', 'Employee2', up_id, lucknow_id, 35, true);
        END IF;
    END IF;
    
    -- Sub-accounts for Essar Projects (Employee3)
    IF acc8_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'Essar - Surat' AND account_id = acc8_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc8_id, 'Essar - Surat', 'Employee3', gj_id, surat_id, 50, true);
        END IF;
    END IF;
    
    -- Sub-accounts for GVK Power (Employee1)
    IF acc9_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'GVK - Mumbai' AND account_id = acc9_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc9_id, 'GVK - Mumbai', 'Employee1', mh_id, mumbai_id, 60, true);
        END IF;
    END IF;
    
    -- Sub-accounts for Hindustan Construction Company (Employee2)
    IF acc10_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'HCC - Mumbai Head Office' AND account_id = acc10_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc10_id, 'HCC - Mumbai Head Office', 'Employee2', mh_id, mumbai_id, 85, true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'HCC - Delhi Branch' AND account_id = acc10_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc10_id, 'HCC - Delhi Branch', 'Employee2', dl_id, delhi_id, 80, true);
        END IF;
    END IF;
    
    -- Sub-accounts for Dilip Buildcon (Employee3)
    IF acc11_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'Dilip Buildcon - Indore' AND account_id = acc11_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc11_id, 'Dilip Buildcon - Indore', 'Employee3', mh_id, pune_id, 75, true);
        END IF;
    END IF;
    
    -- Sub-accounts for PNC Infratech (Employee1)
    IF acc12_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'PNC - Lucknow' AND account_id = acc12_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc12_id, 'PNC - Lucknow', 'Employee1', up_id, lucknow_id, 68, true);
        END IF;
    END IF;
    
    -- Sub-accounts for KNR Constructions (Employee2)
    IF acc13_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'KNR - Hyderabad' AND account_id = acc13_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc13_id, 'KNR - Hyderabad', 'Employee2', ts_id, hyderabad_id, 40, true);
        END IF;
    END IF;
    
    -- Sub-accounts for Sadbhav Engineering (Employee3)
    IF acc14_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'Sadbhav - Ahmedabad' AND account_id = acc14_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc14_id, 'Sadbhav - Ahmedabad', 'Employee3', gj_id, ahmedabad_id, 25, true);
        END IF;
    END IF;
    
    -- Sub-accounts for MEP Infrastructure (Employee1)
    IF acc15_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE sub_account_name = 'MEP - Mumbai' AND account_id = acc15_id) THEN
            INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, state_id, city_id, engagement_score, is_active)
            VALUES (acc15_id, 'MEP - Mumbai', 'Employee1', mh_id, mumbai_id, 30, true);
        END IF;
    END IF;
    
    -- =====================================================
    -- CREATE CONTACTS WITH FOLLOW-UP DATES
    -- =====================================================
    
    -- Contacts for Reliance Mumbai
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'Reliance - Mumbai Office' AND account_id = acc1_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Rajesh Kumar') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc1_id, 'Rajesh Kumar', 'VP - Infrastructure', 'rajesh.kumar@ril.com', '9876543210', 'Connected', 'Primary decision maker. Very responsive.', NULL, 'Employee1');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Priya Sharma') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc1_id, 'Priya Sharma', 'Project Manager', 'priya.sharma@ril.com', '9876543211', 'ATCBL', 'Wants to discuss bulk pricing. Schedule callback.', (NOW() + INTERVAL '2 days'), 'Employee1');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Amit Patel') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc1_id, 'Amit Patel', 'Procurement Head', 'amit.patel@ril.com', '9876543212', 'Connected', 'Regular contact. Placed multiple orders.', (NOW() + INTERVAL '7 days'), 'Employee1');
        END IF;
    END IF;
    
    -- Contacts for L&T Pune
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'L&T - Pune Division' AND account_id = acc2_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Vikram Singh') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc2_id, 'Vikram Singh', 'General Manager', 'vikram.singh@lntinfra.com', '9876543213', 'Connected', 'Decision maker for highway projects.', NULL, 'Employee2');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Sneha Reddy') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc2_id, 'Sneha Reddy', 'Purchase Manager', 'sneha.reddy@lntinfra.com', '9876543214', 'DNP', 'Did not pick call. Try again tomorrow.', (NOW() + INTERVAL '1 day'), 'Employee2');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Rahul Mehta') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc2_id, 'Rahul Mehta', 'Site Engineer', 'rahul.mehta@lntinfra.com', '9876543215', 'ATCBL', 'Will call back after site visit.', (NOW() + INTERVAL '3 days'), 'Employee2');
        END IF;
    END IF;
    
    -- Contacts for GMR Delhi
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'GMR - Delhi Airport' AND account_id = acc3_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Anjali Desai') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc3_id, 'Anjali Desai', 'Business Development Manager', 'anjali.desai@gmrgroup.in', '9876543216', 'Connected', 'New prospect. Initial discussions ongoing.', (NOW() + INTERVAL '5 days'), 'Employee1');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Mohit Agarwal') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc3_id, 'Mohit Agarwal', 'Procurement Officer', 'mohit.agarwal@gmrgroup.in', '9876543217', 'Unable to connect', 'Number busy. Try alternative contact.', NULL, 'Employee1');
        END IF;
    END IF;
    
    -- Contacts for IRB Mumbai
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'IRB - Mumbai Highway' AND account_id = acc4_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Kiran Nair') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc4_id, 'Kiran Nair', 'Project Director', 'kiran.nair@irb.co.in', '9876543218', 'Connected', 'Regular customer. Monthly orders.', (NOW() + INTERVAL '10 days'), 'Employee2');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Deepak Joshi') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc4_id, 'Deepak Joshi', 'Material Manager', 'deepak.joshi@irb.co.in', '9876543219', 'DNP', 'Not responding. Send email instead.', NULL, 'Employee2');
        END IF;
    END IF;
    
    -- Contacts for Welspun Ahmedabad (with today's follow-up)
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'Welspun - Ahmedabad' AND account_id = acc5_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Ravi Shah') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc5_id, 'Ravi Shah', 'Operations Head', 'ravi.shah@welspun.com', '9876543220', 'ATCBL', 'Newly onboarded. Follow up on first order.', NOW(), 'Employee3');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Meera Patel') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc5_id, 'Meera Patel', 'Purchase Head', 'meera.patel@welspun.com', '9876543221', 'Connected', 'Warm contact. Interested in bulk orders.', (NOW() + INTERVAL '4 days'), 'Employee3');
        END IF;
    END IF;
    
    -- Contacts for NCC Bangalore (with today's follow-up)
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'NCC - Bangalore' AND account_id = acc6_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Arjun Rao') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc6_id, 'Arjun Rao', 'Site Manager', 'arjun.rao@ncc.co.in', '9876543222', 'ATCBL', 'Urgent follow-up needed. Pending quotation approval.', NOW(), 'Employee1');
        END IF;
    END IF;
    
    -- Contacts for Simplex Kolkata (with today's follow-up)
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'Simplex - Kolkata' AND account_id = acc7_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Subhash Roy') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc7_id, 'Subhash Roy', 'Accounts Manager', 'subhash.roy@simplex.co.in', '9876543223', 'DNP', 'Payment follow-up. Critical account.', NOW(), 'Employee2');
        END IF;
    END IF;
    
    -- Contacts for Essar Surat
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'Essar - Surat' AND account_id = acc8_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Neha Gupta') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc8_id, 'Neha Gupta', 'Contract Manager', 'neha.gupta@essar.com', '9876543224', 'Connected', 'Contract renewal discussion scheduled.', (NOW() + INTERVAL '6 days'), 'Employee3');
        END IF;
    END IF;
    
    -- Contacts for GVK Mumbai
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'GVK - Mumbai' AND account_id = acc9_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Prakash Iyer') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc9_id, 'Prakash Iyer', 'Business Head', 'prakash.iyer@gvk.com', '9876543225', 'Connected', 'Large prospect. Initial meeting went well.', (NOW() + INTERVAL '8 days'), 'Employee1');
        END IF;
    END IF;
    
    -- Contacts for HCC Mumbai
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'HCC - Mumbai Head Office' AND account_id = acc10_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Sunil Agarwal') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc10_id, 'Sunil Agarwal', 'VP - Procurement', 'sunil.agarwal@hccindia.com', '9876543226', 'Connected', 'Long-term customer. Very satisfied.', NULL, 'Employee2');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Lakshmi Menon') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc10_id, 'Lakshmi Menon', 'Material Manager', 'lakshmi.menon@hccindia.com', '9876543227', 'Connected', 'Regular orders. Good relationship.', (NOW() + INTERVAL '12 days'), 'Employee2');
        END IF;
    END IF;
    
    -- Contacts for Dilip Buildcon
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'Dilip Buildcon - Indore' AND account_id = acc11_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Vijay Malhotra') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc11_id, 'Vijay Malhotra', 'Director Operations', 'vijay.malhotra@dilipbuildcon.com', '9876543228', 'Connected', 'Upselling opportunity. Discuss larger volume orders.', (NOW() + INTERVAL '9 days'), 'Employee3');
        END IF;
    END IF;
    
    -- Contacts for PNC Lucknow
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'PNC - Lucknow' AND account_id = acc12_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Ramesh Tripathi') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc12_id, 'Ramesh Tripathi', 'Project Manager', 'ramesh.tripathi@pnc.in', '9876543229', 'Connected', 'Regular customer. Monthly orders.', (NOW() + INTERVAL '11 days'), 'Employee1');
        END IF;
    END IF;
    
    -- Contacts for KNR Hyderabad
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'KNR - Hyderabad' AND account_id = acc13_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Suresh Reddy') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc13_id, 'Suresh Reddy', 'Operations Manager', 'suresh.reddy@knr.co.in', '9876543230', 'DNP', 'Retention call required. Account at risk.', (NOW() + INTERVAL '2 days'), 'Employee2');
        END IF;
    END IF;
    
    -- Contacts for Sadbhav Ahmedabad
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'Sadbhav - Ahmedabad' AND account_id = acc14_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Hemant Patel') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc14_id, 'Hemant Patel', 'Business Development', 'hemant.patel@sadbhav.com', '9876543231', 'Wrong number', 'Number changed. Need updated contact.', NULL, 'Employee3');
        END IF;
    END IF;
    
    -- Contacts for MEP Mumbai (with today's follow-up)
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'MEP - Mumbai' AND account_id = acc15_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Amit Kumar') THEN
            INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
            VALUES (sa_id, acc15_id, 'Amit Kumar', 'Project Head', 'amit.kumar@mep.co.in', '9876543232', 'Connected', 'New lead. Initial contact made. Send quotation.', NOW(), 'Employee1');
        END IF;
    END IF;
    
    -- =====================================================
    -- CREATE ACTIVITIES
    -- =====================================================
    
    -- Activities for Reliance Mumbai contacts
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'Reliance - Mumbai Office' AND account_id = acc1_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        SELECT id INTO cont_id FROM contacts WHERE sub_account_id = sa_id AND name = 'Rajesh Kumar' LIMIT 1;
        IF cont_id IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM activities WHERE account_id = acc1_id AND contact_id = cont_id AND activity_type = 'call' AND description LIKE 'Successful call%') THEN
                INSERT INTO activities (account_id, contact_id, employee_id, activity_type, description, timestamp)
                VALUES (acc1_id, cont_id, 'Employee1', 'call', 'Successful call with Rajesh Kumar. Discussed upcoming project requirements.', NOW() - INTERVAL '2 days');
            END IF;
            
            IF NOT EXISTS (SELECT 1 FROM activities WHERE account_id = acc1_id AND contact_id = cont_id AND activity_type = 'note' AND description LIKE 'Customer very satisfied%') THEN
                INSERT INTO activities (account_id, contact_id, employee_id, activity_type, description, timestamp)
                VALUES (acc1_id, cont_id, 'Employee1', 'note', 'Customer very satisfied with last delivery. Rating 5/5.', NOW() - INTERVAL '5 days');
            END IF;
        END IF;
        
        SELECT id INTO cont_id FROM contacts WHERE sub_account_id = sa_id AND name = 'Priya Sharma' LIMIT 1;
        IF cont_id IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM activities WHERE account_id = acc1_id AND contact_id = cont_id AND activity_type = 'call' AND description LIKE 'Called Priya Sharma%') THEN
                INSERT INTO activities (account_id, contact_id, employee_id, activity_type, description, timestamp)
                VALUES (acc1_id, cont_id, 'Employee1', 'call', 'Called Priya Sharma. Interested in bulk pricing. Scheduled callback.', NOW() - INTERVAL '1 day');
            END IF;
        END IF;
    END IF;
    
    -- Activities for L&T Pune
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'L&T - Pune Division' AND account_id = acc2_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        SELECT id INTO cont_id FROM contacts WHERE sub_account_id = sa_id AND name = 'Vikram Singh' LIMIT 1;
        IF cont_id IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM activities WHERE account_id = acc2_id AND contact_id = cont_id AND activity_type = 'call' AND description LIKE 'Successful call with Vikram%') THEN
                INSERT INTO activities (account_id, contact_id, employee_id, activity_type, description, timestamp)
                VALUES (acc2_id, cont_id, 'Employee2', 'call', 'Successful call with Vikram Singh. New highway project discussion.', NOW() - INTERVAL '3 days');
            END IF;
        END IF;
        
        SELECT id INTO cont_id FROM contacts WHERE sub_account_id = sa_id AND name = 'Sneha Reddy' LIMIT 1;
        IF cont_id IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM activities WHERE account_id = acc2_id AND contact_id = cont_id AND activity_type = 'call' AND description LIKE 'Attempted call to Sneha%') THEN
                INSERT INTO activities (account_id, contact_id, employee_id, activity_type, description, timestamp)
                VALUES (acc2_id, cont_id, 'Employee2', 'call', 'Attempted call to Sneha Reddy. Did not pick. Try again tomorrow.', NOW());
            END IF;
        END IF;
    END IF;
    
    -- =====================================================
    -- CREATE SOME QUOTATIONS
    -- =====================================================
    
    -- Quotation for Reliance Mumbai (W-Beam)
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'Reliance - Mumbai Office' AND account_id = acc1_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM quotes_mbcb WHERE sub_account_id = sa_id AND section = 'W-Beam Section' AND purpose = 'Highway Safety Barrier Installation') THEN
            INSERT INTO quotes_mbcb (section, state_id, city_id, sub_account_id, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, created_by, is_saved, status, comments)
            VALUES ('W-Beam Section', mh_id, mumbai_id, sa_id, 'Highway Safety Barrier Installation', TO_CHAR(NOW(), 'DD/MM/YYYY'), 1000, 45.5, 3500, 3500000, 'Employee1', true, 'sent', 'Sent to customer. Awaiting response.');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM quotes_mbcb WHERE sub_account_id = sa_id AND section = 'Thrie-Beam Section' AND purpose = 'Expressway Project') THEN
            INSERT INTO quotes_mbcb (section, state_id, city_id, sub_account_id, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, created_by, is_saved, status, comments)
            VALUES ('Thrie-Beam Section', mh_id, mumbai_id, sa_id, 'Expressway Project', TO_CHAR(NOW(), 'DD/MM/YYYY'), 500, 52.3, 4200, 2100000, 'Employee1', true, 'closed_won', 'Order confirmed. Delivery scheduled.');
        END IF;
    END IF;
    
    -- Quotation for L&T Pune (Double W-Beam)
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'L&T - Pune Division' AND account_id = acc2_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM quotes_mbcb WHERE sub_account_id = sa_id AND section = 'Double W-Beam Section' AND purpose = 'Pune-Mumbai Expressway') THEN
            INSERT INTO quotes_mbcb (section, state_id, city_id, sub_account_id, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, created_by, is_saved, status, comments)
            VALUES ('Double W-Beam Section', mh_id, pune_id, sa_id, 'Pune-Mumbai Expressway', TO_CHAR(NOW(), 'DD/MM/YYYY'), 800, 65.2, 4800, 3840000, 'Employee2', true, 'negotiation', 'Price negotiation ongoing. Customer wants 5% discount.');
        END IF;
    END IF;
    
    -- Quotation for IRB Mumbai (Signages)
    SELECT id INTO sa_id FROM sub_accounts WHERE sub_account_name = 'IRB - Mumbai Highway' AND account_id = acc4_id LIMIT 1;
    IF sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM quotes_signages WHERE sub_account_id = sa_id AND section = 'Reflective Signages' AND purpose = 'Highway Signage Installation') THEN
            INSERT INTO quotes_signages (section, state_id, city_id, sub_account_id, purpose, date, quantity, area_sq_ft, cost_per_piece, final_total_cost, created_by, is_saved, status, comments)
            VALUES ('Reflective Signages', mh_id, mumbai_id, sa_id, 'Highway Signage Installation', TO_CHAR(NOW(), 'DD/MM/YYYY'), 50, 200, 1500, 75000, 'Employee2', true, 'sent', 'Quotation sent. Follow up in 3 days.');
        END IF;
    END IF;
    
    RAISE NOTICE 'All dummy data added successfully!';
END $$;

