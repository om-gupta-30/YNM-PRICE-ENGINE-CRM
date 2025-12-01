-- Sample Leads Data for Testing
-- Run this SQL in your Supabase SQL Editor to insert sample leads
-- Make sure you have at least one account and sub-account in your database first

-- First, let's get some account and sub-account IDs to use (adjust these based on your actual data)
DO $$
DECLARE
    first_account_id INTEGER;
    second_account_id INTEGER;
    first_sub_account_id INTEGER;
    second_sub_account_id INTEGER;
    third_sub_account_id INTEGER;
BEGIN
    -- Get first account ID
    SELECT id INTO first_account_id FROM accounts LIMIT 1;
    
    -- Get second account ID
    SELECT id INTO second_account_id FROM accounts OFFSET 1 LIMIT 1;
    
    -- If we don't have 2 accounts, use the first one for both
    IF second_account_id IS NULL THEN
        second_account_id := first_account_id;
    END IF;
    
    -- Get sub-account IDs
    SELECT id INTO first_sub_account_id FROM sub_accounts WHERE account_id = first_account_id LIMIT 1;
    SELECT id INTO second_sub_account_id FROM sub_accounts WHERE account_id = first_account_id OFFSET 1 LIMIT 1;
    SELECT id INTO third_sub_account_id FROM sub_accounts WHERE account_id = second_account_id LIMIT 1;
    
    -- Insert sample leads only if they don't already exist
    -- Lead 1: New lead from Website
    INSERT INTO leads (lead_name, contact_person, phone, email, requirements, lead_source, status, assigned_employee, account_id, sub_account_id, created_by, created_at, updated_at)
    SELECT 
        'Highway Construction Project - Mumbai',
        'Rajesh Kumar',
        '+91 9876543210',
        'rajesh.kumar@mumbaiconstruction.in',
        'Need W-Beam guardrails for 50km highway stretch. Require quotation for Phase 1 (10km) with installation included.',
        'Website',
        'New',
        'Admin',
        first_account_id,
        first_sub_account_id,
        'Admin',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '5 days'
    WHERE NOT EXISTS (
        SELECT 1 FROM leads WHERE lead_name = 'Highway Construction Project - Mumbai'
    );
    
    -- Lead 2: In Progress lead from Referral
    INSERT INTO leads (lead_name, contact_person, phone, email, requirements, lead_source, status, assigned_employee, account_id, sub_account_id, created_by, created_at, updated_at)
    SELECT 
        'City Road Safety Upgrade - Delhi',
        'Priya Sharma',
        '+91 9876543211',
        'priya.sharma@delhiroads.gov.in',
        'Looking for reflective signages for city-wide road safety upgrade. Need 500+ signages of various types.',
        'Referral',
        'In Progress',
        'Employee1',
        first_account_id,
        COALESCE(second_sub_account_id, first_sub_account_id),
        'Admin',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '2 days'
    WHERE NOT EXISTS (
        SELECT 1 FROM leads WHERE lead_name = 'City Road Safety Upgrade - Delhi'
    );
    
    -- Lead 3: Quotation Sent from Inbound Call
    INSERT INTO leads (lead_name, contact_person, phone, email, requirements, lead_source, status, assigned_employee, account_id, sub_account_id, created_by, created_at, updated_at)
    SELECT 
        'Bridge Safety Barriers - Gujarat',
        'Amit Patel',
        '+91 9876543212',
        'amit.patel@gujaratbridge.in',
        'Double W-Beam barriers needed for new bridge construction. Total length: 2km. Need urgent quotation.',
        'Inbound Call',
        'Quotation Sent',
        'Employee2',
        COALESCE(second_account_id, first_account_id),
        COALESCE(third_sub_account_id, first_sub_account_id),
        'Admin',
        NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '1 day'
    WHERE NOT EXISTS (
        SELECT 1 FROM leads WHERE lead_name = 'Bridge Safety Barriers - Gujarat'
    );
    
    -- Lead 4: Follow-up from Existing Customer
    INSERT INTO leads (lead_name, contact_person, phone, email, requirements, lead_source, status, assigned_employee, account_id, sub_account_id, created_by, created_at, updated_at)
    SELECT 
        'Thrie Beam Installation - Karnataka',
        'Suresh Reddy',
        '+91 9876543213',
        'suresh.reddy@karnatakahighway.in',
        'Follow-up on previous quotation. Need Thrie Beam sections for expressway project. Budget approved.',
        'Existing Customer',
        'Follow-up',
        'Employee1',
        first_account_id,
        first_sub_account_id,
        'Employee1',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '3 hours'
    WHERE NOT EXISTS (
        SELECT 1 FROM leads WHERE lead_name = 'Thrie Beam Installation - Karnataka'
    );
    
    -- Lead 5: Closed Won from Marketing
    INSERT INTO leads (lead_name, contact_person, phone, email, requirements, lead_source, status, assigned_employee, account_id, sub_account_id, created_by, created_at, updated_at)
    SELECT 
        'Airport Runway Signages - Pune',
        'Neha Desai',
        '+91 9876543214',
        'neha.desai@puneairport.in',
        'Reflective signages for airport runway. Project completed successfully. Order value: ₹25,00,000',
        'Marketing',
        'Closed',
        'Employee2',
        COALESCE(second_account_id, first_account_id),
        COALESCE(third_sub_account_id, first_sub_account_id),
        'Employee2',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '5 days'
    WHERE NOT EXISTS (
        SELECT 1 FROM leads WHERE lead_name = 'Airport Runway Signages - Pune'
    );
    
    -- Lead 6: New lead from Other
    INSERT INTO leads (lead_name, contact_person, phone, email, requirements, lead_source, status, assigned_employee, account_id, sub_account_id, created_by, created_at, updated_at)
    SELECT 
        'Industrial Zone Safety Barriers - Chennai',
        'Karthik Ram',
        '+91 9876543215',
        'karthik.ram@chennaiindustrial.in',
        'W-Beam barriers required for industrial zone perimeter. Need competitive pricing.',
        'Other',
        'New',
        'Admin',
        first_account_id,
        COALESCE(second_sub_account_id, first_sub_account_id),
        'Admin',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days'
    WHERE NOT EXISTS (
        SELECT 1 FROM leads WHERE lead_name = 'Industrial Zone Safety Barriers - Chennai'
    );
    
    -- Lead 7: Lost lead
    INSERT INTO leads (lead_name, contact_person, phone, email, requirements, lead_source, status, assigned_employee, account_id, sub_account_id, created_by, created_at, updated_at)
    SELECT 
        'Metro Station Signages - Bangalore',
        'Anjali Nair',
        '+91 9876543216',
        'anjali.nair@bangaloremetro.in',
        'Budget constraints. Project cancelled. Client went with different vendor.',
        'Website',
        'Lost',
        'Employee1',
        first_account_id,
        first_sub_account_id,
        'Employee1',
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '8 days'
    WHERE NOT EXISTS (
        SELECT 1 FROM leads WHERE lead_name = 'Metro Station Signages - Bangalore'
    );
    
    -- Lead 8: In Progress from Referral
    INSERT INTO leads (lead_name, contact_person, phone, email, requirements, lead_source, status, assigned_employee, account_id, sub_account_id, created_by, created_at, updated_at)
    SELECT 
        'Highway Toll Plaza Barriers - UP',
        'Vikram Singh',
        '+91 9876543217',
        'vikram.singh@uptoll.in',
        'Double W-Beam barriers for new toll plaza. Need 5km installation. Site inspection scheduled.',
        'Referral',
        'In Progress',
        'Employee2',
        COALESCE(second_account_id, first_account_id),
        COALESCE(third_sub_account_id, first_sub_account_id),
        'Employee2',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '1 day'
    WHERE NOT EXISTS (
        SELECT 1 FROM leads WHERE lead_name = 'Highway Toll Plaza Barriers - UP'
    );
    
    -- Lead 9: Quotation Sent from Inbound Call
    INSERT INTO leads (lead_name, contact_person, phone, email, requirements, lead_source, status, assigned_employee, account_id, sub_account_id, created_by, created_at, updated_at)
    SELECT 
        'City Bus Stand Signages - Jaipur',
        'Meera Jain',
        '+91 9876543218',
        'meera.jain@jaipurbus.in',
        'Reflective signages for new bus stand. Need 200+ signages with custom designs.',
        'Inbound Call',
        'Quotation Sent',
        'Admin',
        first_account_id,
        COALESCE(second_sub_account_id, first_sub_account_id),
        'Admin',
        NOW() - INTERVAL '6 days',
        NOW() - INTERVAL '12 hours'
    WHERE NOT EXISTS (
        SELECT 1 FROM leads WHERE lead_name = 'City Bus Stand Signages - Jaipur'
    );
    
    -- Lead 10: New from Website
    INSERT INTO leads (lead_name, contact_person, phone, email, requirements, lead_source, status, assigned_employee, account_id, sub_account_id, created_by, created_at, updated_at)
    SELECT 
        'Expressway Guardrails - Hyderabad',
        'Ravi Teja',
        '+91 9876543219',
        'ravi.teja@hyderabadexpressway.in',
        'W-Beam guardrails for 30km expressway section. Need quotation within 3 days.',
        'Website',
        'New',
        'Employee1',
        first_account_id,
        first_sub_account_id,
        'Admin',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    WHERE NOT EXISTS (
        SELECT 1 FROM leads WHERE lead_name = 'Expressway Guardrails - Hyderabad'
    );
    
    RAISE NOTICE 'Sample leads inserted successfully!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error inserting leads: %', SQLERRM;
END $$;


