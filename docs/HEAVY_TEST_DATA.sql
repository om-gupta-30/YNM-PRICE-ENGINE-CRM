-- =====================================================
-- HEAVY TEST DATA - COMPREHENSIVE TESTING SCRIPT
-- YNM Safety CRM & Price Engine
-- Adds HEAVY amounts of accounts, sub-accounts, contacts, activities, and quotations
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
    mp_id INTEGER;
    wb_id INTEGER;
    ap_id INTEGER;
    
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
    indore_id INTEGER;
    kolkata_id INTEGER;
    
    -- Account and Sub-account IDs
    acc_id INTEGER;
    sa_id INTEGER;
    cont_id INTEGER;
    
    -- Employee assignments
    emp1 TEXT := 'Employee1';
    emp2 TEXT := 'Employee2';
    emp3 TEXT := 'Employee3';
    
    -- Loop counters
    i INTEGER;
    j INTEGER;
    k INTEGER;
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
    SELECT id INTO mp_id FROM states WHERE state_name = 'Madhya Pradesh' LIMIT 1;
    SELECT id INTO wb_id FROM states WHERE state_name = 'West Bengal' LIMIT 1;
    SELECT id INTO ap_id FROM states WHERE state_name = 'Andhra Pradesh' LIMIT 1;
    
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
    SELECT id INTO indore_id FROM cities WHERE city_name = 'Indore' AND state_id = mp_id LIMIT 1;
    SELECT id INTO kolkata_id FROM cities WHERE city_name = 'Kolkata' AND state_id = wb_id LIMIT 1;
    
    -- =====================================================
    -- CREATE 30+ MAJOR ACCOUNTS
    -- =====================================================
    
    RAISE NOTICE 'Creating major accounts...';
    
    -- Account 1-10: Large Enterprises
    FOR i IN 1..10 LOOP
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Enterprise Account ' || i) THEN
            INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
            VALUES ('Enterprise Account ' || i, 'Enterprise'::company_stage_enum, 'Customer'::company_tag_enum, 'Large enterprise customer with multiple projects.', 75 + (i * 2), true)
            RETURNING id INTO acc_id;
            
            -- Create 3-5 sub-accounts per enterprise
            FOR j IN 1..(3 + (i % 3)) LOOP
                IF j = 1 THEN
                    IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = acc_id AND sub_account_name = 'Enterprise Account ' || i || ' - Mumbai Office') THEN
                        INSERT INTO sub_accounts (account_id, sub_account_name, state_id, city_id, assigned_employee, engagement_score, is_active)
                        VALUES (acc_id, 'Enterprise Account ' || i || ' - Mumbai Office', mh_id, mumbai_id, 
                                CASE WHEN i % 3 = 0 THEN emp1 WHEN i % 3 = 1 THEN emp2 ELSE emp3 END,
                                70 + j * 5, true) RETURNING id INTO sa_id;
                    END IF;
                ELSIF j = 2 THEN
                    IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = acc_id AND sub_account_name = 'Enterprise Account ' || i || ' - Delhi Branch') THEN
                        INSERT INTO sub_accounts (account_id, sub_account_name, state_id, city_id, assigned_employee, engagement_score, is_active)
                        VALUES (acc_id, 'Enterprise Account ' || i || ' - Delhi Branch', dl_id, delhi_id,
                                CASE WHEN i % 3 = 0 THEN emp1 WHEN i % 3 = 1 THEN emp2 ELSE emp3 END,
                                70 + j * 5, true) RETURNING id INTO sa_id;
                    END IF;
                ELSE
                    IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = acc_id AND sub_account_name = 'Enterprise Account ' || i || ' - Branch ' || j) THEN
                        INSERT INTO sub_accounts (account_id, sub_account_name, state_id, city_id, assigned_employee, engagement_score, is_active)
                        VALUES (acc_id, 'Enterprise Account ' || i || ' - Branch ' || j, 
                                CASE WHEN j % 3 = 0 THEN mh_id WHEN j % 3 = 1 THEN gj_id ELSE ka_id END,
                                CASE WHEN j % 3 = 0 THEN mumbai_id WHEN j % 3 = 1 THEN ahmedabad_id ELSE bangalore_id END,
                                CASE WHEN i % 3 = 0 THEN emp1 WHEN i % 3 = 1 THEN emp2 ELSE emp3 END,
                                70 + j * 5, true) RETURNING id INTO sa_id;
                    END IF;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
    
    -- Account 11-20: SMB Accounts
    FOR i IN 11..20 LOOP
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'SMB Account ' || i) THEN
            INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
            VALUES ('SMB Account ' || i, 'SMB'::company_stage_enum, (CASE WHEN i % 2 = 0 THEN 'Customer' ELSE 'Prospect' END)::company_tag_enum, 
                    'Small to medium business account.', 50 + (i % 30), true)
            RETURNING id INTO acc_id;
            
            -- Create 1-2 sub-accounts per SMB
            FOR j IN 1..(1 + (i % 2)) LOOP
                IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = acc_id AND sub_account_name = 'SMB Account ' || i || ' - Location ' || j) THEN
                    INSERT INTO sub_accounts (account_id, sub_account_name, state_id, city_id, assigned_employee, engagement_score, is_active)
                    VALUES (acc_id, 'SMB Account ' || i || ' - Location ' || j,
                            CASE WHEN j = 1 THEN gj_id ELSE ka_id END,
                            CASE WHEN j = 1 THEN ahmedabad_id ELSE bangalore_id END,
                            CASE WHEN i % 3 = 0 THEN emp1 WHEN i % 3 = 1 THEN emp2 ELSE emp3 END,
                            40 + j * 10, true) RETURNING id INTO sa_id;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
    
    -- Account 21-30: Pan India Accounts
    FOR i IN 21..30 LOOP
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_name = 'Pan India Account ' || i) THEN
            INSERT INTO accounts (account_name, company_stage, company_tag, notes, engagement_score, is_active)
            VALUES ('Pan India Account ' || i, 'Pan India'::company_stage_enum, 'Customer'::company_tag_enum, 'Pan India operations with multiple locations.', 80 + (i % 20), true)
            RETURNING id INTO acc_id;
            
            -- Create 5-7 sub-accounts per Pan India account
            FOR j IN 1..(5 + (i % 3)) LOOP
                IF NOT EXISTS (SELECT 1 FROM sub_accounts WHERE account_id = acc_id AND sub_account_name = 'Pan India Account ' || i || ' - Region ' || j) THEN
                    INSERT INTO sub_accounts (account_id, sub_account_name, state_id, city_id, assigned_employee, engagement_score, is_active)
                    VALUES (acc_id, 'Pan India Account ' || i || ' - Region ' || j,
                            CASE j
                                WHEN 1 THEN mh_id
                                WHEN 2 THEN gj_id
                                WHEN 3 THEN ka_id
                                WHEN 4 THEN dl_id
                                WHEN 5 THEN ts_id
                                WHEN 6 THEN tn_id
                                ELSE rj_id
                            END,
                            CASE j
                                WHEN 1 THEN mumbai_id
                                WHEN 2 THEN ahmedabad_id
                                WHEN 3 THEN bangalore_id
                                WHEN 4 THEN delhi_id
                                WHEN 5 THEN hyderabad_id
                                WHEN 6 THEN chennai_id
                                ELSE jaipur_id
                            END,
                            CASE WHEN i % 3 = 0 THEN emp1 WHEN i % 3 = 1 THEN emp2 ELSE emp3 END,
                            75 + j * 3, true) RETURNING id INTO sa_id;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
    
    -- =====================================================
    -- CREATE 200+ CONTACTS ACROSS ALL SUB-ACCOUNTS
    -- =====================================================
    
    RAISE NOTICE 'Creating contacts...';
    
    -- Create contacts for each sub-account
    FOR acc_id IN SELECT id FROM accounts WHERE account_name LIKE '%Account%' LOOP
        FOR sa_id IN SELECT id FROM sub_accounts WHERE account_id = acc_id LOOP
            -- Create 3-8 contacts per sub-account
            FOR k IN 1..(3 + (sa_id % 6)) LOOP
                IF NOT EXISTS (SELECT 1 FROM contacts WHERE sub_account_id = sa_id AND name = 'Contact ' || k || ' for Sub-Account ' || sa_id) THEN
                    INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
                    VALUES (
                        sa_id, 
                        acc_id,
                        'Contact ' || k || ' for Sub-Account ' || sa_id,
                        CASE k % 5
                            WHEN 0 THEN 'General Manager'
                            WHEN 1 THEN 'Purchase Manager'
                            WHEN 2 THEN 'Project Manager'
                            WHEN 3 THEN 'Site Engineer'
                            ELSE 'Operations Head'
                        END,
                        'contact' || k || '_' || sa_id || '@example.com',
                        '98765' || LPAD((sa_id * 10 + k)::TEXT, 5, '0'),
                        (CASE k % 6
                            WHEN 0 THEN 'Connected'
                            WHEN 1 THEN 'ATCBL'
                            WHEN 2 THEN 'DNP'
                            WHEN 3 THEN 'Unable to connect'
                            WHEN 4 THEN 'Number doesn''t exist'
                            ELSE 'Wrong number'
                        END)::call_status_enum,
                        'Contact notes for contact ' || k || ' in sub-account ' || sa_id || '.',
                        CASE 
                            WHEN k % 6 IN (1, 2) THEN CURRENT_DATE + (k % 7)
                            WHEN k % 6 = 0 THEN NULL
                            ELSE NULL
                        END,
                        CASE WHEN sa_id % 3 = 0 THEN emp1 WHEN sa_id % 3 = 1 THEN emp2 ELSE emp3 END
                    );
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
    
    -- =====================================================
    -- CREATE 500+ ACTIVITIES
    -- =====================================================
    
    RAISE NOTICE 'Creating activities...';
    
    -- Create activities for contacts
    FOR cont_id IN (SELECT id FROM contacts ORDER BY id LIMIT 200) LOOP
        SELECT account_id INTO acc_id FROM contacts WHERE id = cont_id;
        
        -- Create 2-5 activities per contact
        FOR k IN 1..(2 + (cont_id % 4)) LOOP
            IF NOT EXISTS (SELECT 1 FROM activities WHERE account_id = acc_id AND contact_id = cont_id AND description = 'Activity ' || k || ' for Contact ' || cont_id) THEN
                INSERT INTO activities (account_id, contact_id, employee_id, activity_type, description, timestamp)
                VALUES (
                    acc_id,
                    cont_id,
                    CASE WHEN cont_id % 3 = 0 THEN emp1 WHEN cont_id % 3 = 1 THEN emp2 ELSE emp3 END,
                    (CASE k % 7
                        WHEN 0 THEN 'call'
                        WHEN 1 THEN 'note'
                        WHEN 2 THEN 'followup'
                        WHEN 3 THEN 'quotation'
                        WHEN 4 THEN 'email'
                        WHEN 5 THEN 'task'
                        ELSE 'meeting'
                    END)::activity_type_enum,
                    'Activity ' || k || ' for Contact ' || cont_id || ': ' ||
                    CASE k % 7
                        WHEN 0 THEN 'Successful call completed'
                        WHEN 1 THEN 'Added important notes'
                        WHEN 2 THEN 'Follow-up scheduled'
                        WHEN 3 THEN 'Quotation sent'
                        WHEN 4 THEN 'Email communication'
                        WHEN 5 THEN 'Task assigned'
                        ELSE 'Meeting scheduled'
                    END,
                    NOW() - (k || ' days')::INTERVAL
                );
            END IF;
        END LOOP;
    END LOOP;
    
    -- =====================================================
    -- CREATE 300+ QUOTATIONS (MBCB, Signages)
    -- Note: Paint module not included as it's not fully implemented
    -- =====================================================
    
    RAISE NOTICE 'Creating quotations...';
    
    -- Get all sub-accounts
    FOR sa_id IN SELECT id FROM sub_accounts WHERE account_id IN (SELECT id FROM accounts WHERE account_name LIKE '%Account%') LOOP
        SELECT account_id INTO acc_id FROM sub_accounts WHERE id = sa_id;
        SELECT state_id, city_id INTO mh_id, mumbai_id FROM sub_accounts WHERE id = sa_id;
        
        -- Create 5-10 quotations per sub-account
        FOR k IN 1..(5 + (sa_id % 6)) LOOP
            -- MBCB Quotations (70%)
            IF k % 10 < 7 THEN
                IF NOT EXISTS (SELECT 1 FROM quotes_mbcb WHERE sub_account_id = sa_id AND purpose = 'Quotation ' || k || ' for Sub-Account ' || sa_id) THEN
                    INSERT INTO quotes_mbcb (section, state_id, city_id, sub_account_id, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, created_by, is_saved, status, comments)
                    VALUES (
                        CASE k % 3
                            WHEN 0 THEN 'W-Beam Section'
                            WHEN 1 THEN 'Thrie-Beam Section'
                            ELSE 'Double W-Beam Section'
                        END,
                        mh_id,
                        COALESCE(mumbai_id, (SELECT id FROM cities WHERE state_id = mh_id LIMIT 1)),
                        sa_id,
                        'Quotation ' || k || ' for Sub-Account ' || sa_id,
                        TO_CHAR(NOW() - ((k % 30) || ' days')::INTERVAL, 'DD/MM/YYYY'),
                        500 + (k * 100),
                        40 + (k * 2),
                        3000 + (k * 100),
                        (500 + (k * 100)) * (3000 + (k * 100)),
                        CASE WHEN sa_id % 3 = 0 THEN emp1 WHEN sa_id % 3 = 1 THEN emp2 ELSE emp3 END,
                        true,
                        CASE k % 5
                            WHEN 0 THEN 'sent'
                            WHEN 1 THEN 'negotiation'
                            WHEN 2 THEN 'closed_won'
                            WHEN 3 THEN 'closed_lost'
                            ELSE 'draft'
                        END,
                        CASE k % 5
                            WHEN 0 THEN 'Quotation sent to customer'
                            WHEN 1 THEN 'Price negotiation ongoing'
                            WHEN 2 THEN 'Order confirmed'
                            WHEN 3 THEN 'Customer chose competitor'
                            ELSE 'Draft quotation'
                        END
                    );
                END IF;
            
            -- Signages Quotations (30%)
            ELSE
                IF NOT EXISTS (SELECT 1 FROM quotes_signages WHERE sub_account_id = sa_id AND purpose = 'Quotation ' || k || ' for Sub-Account ' || sa_id) THEN
                    INSERT INTO quotes_signages (section, state_id, city_id, sub_account_id, purpose, date, quantity, area_sq_ft, cost_per_piece, final_total_cost, created_by, is_saved, status, comments)
                    VALUES (
                        'Reflective Signages',
                        mh_id,
                        COALESCE(mumbai_id, (SELECT id FROM cities WHERE state_id = mh_id LIMIT 1)),
                        sa_id,
                        'Quotation ' || k || ' for Sub-Account ' || sa_id,
                        TO_CHAR(NOW() - ((k % 30) || ' days')::INTERVAL, 'DD/MM/YYYY'),
                        20 + (k * 5),
                        100 + (k * 10),
                        1200 + (k * 50),
                        (20 + (k * 5)) * (1200 + (k * 50)),
                        CASE WHEN sa_id % 3 = 0 THEN emp1 WHEN sa_id % 3 = 1 THEN emp2 ELSE emp3 END,
                        true,
                        CASE k % 5
                            WHEN 0 THEN 'sent'
                            WHEN 1 THEN 'negotiation'
                            WHEN 2 THEN 'closed_won'
                            WHEN 3 THEN 'closed_lost'
                            ELSE 'draft'
                        END,
                        CASE k % 5
                            WHEN 0 THEN 'Signage quotation sent'
                            WHEN 1 THEN 'Discussing design options'
                            WHEN 2 THEN 'Order placed'
                            WHEN 3 THEN 'Cancelled'
                            ELSE 'Draft quotation'
                        END
                    );
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    -- =====================================================
    -- SYNC NOTIFICATIONS FOR ALL CONTACTS WITH FOLLOW-UPS
    -- =====================================================
    
    RAISE NOTICE 'Syncing notifications...';
    
    -- This will automatically create notifications via the sync function when contacts are accessed
    -- But we can also manually create some to ensure they exist
    
    RAISE NOTICE 'Heavy test data creation completed!';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '- 30+ Accounts created';
    RAISE NOTICE '- 100+ Sub-accounts created';
    RAISE NOTICE '- 200+ Contacts created';
    RAISE NOTICE '- 500+ Activities created';
    RAISE NOTICE '- 300+ Quotations created (MBCB and Signages only)';
    
END $$;

