-- =====================================================
-- COMPREHENSIVE DUMMY DATA FOR YNM SAFETY CRM & PRICE ENGINE
-- This script creates realistic dummy data linking CRM and Price Engine
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
-- 1. CREATE ACCOUNTS (Parent Companies)
-- =====================================================

INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, website, gst_number, notes, is_active, engagement_score, created_at, updated_at) VALUES
-- Enterprise Accounts (High Engagement)
('Tata Infrastructure Ltd', 'Enterprise', 'Customer', 1, 1, 'Rajesh Kumar', '9876543210', 'rajesh@tatainfra.com', 'Mumbai, Maharashtra', 'https://tatainfra.com', '27AABCU9603R1Z5', 'Major infrastructure client. High volume orders.', true, 0, NOW(), NOW()),
('Reliance Industries Ltd', 'Enterprise', 'Customer', 1, 2, 'Priya Sharma', '9876543211', 'priya@ril.com', 'Mumbai, Maharashtra', 'https://ril.com', '27AAACR1234A1Z6', 'Enterprise client. Regular orders.', true, 0, NOW(), NOW()),
('Adani Group', 'Enterprise', 'Customer', 2, 3, 'Amit Patel', '9876543212', 'amit@adani.com', 'Ahmedabad, Gujarat', 'https://adani.com', '24AABCD1234E1Z7', 'Large enterprise client.', true, 0, NOW(), NOW()),

-- SMB Accounts (Medium Engagement)
('Maharashtra Roadways Pvt Ltd', 'SMB', 'Customer', 1, 1, 'Sanjay Mehta', '9876543213', 'sanjay@mhroadways.com', 'Mumbai, Maharashtra', NULL, '27AABCM1234F1Z8', 'Regional contractor. Good relationship.', true, 0, NOW(), NOW()),
('Gujarat Construction Co', 'SMB', 'Prospect', 2, 3, 'Deepak Shah', '9876543214', 'deepak@gujconstruct.com', 'Ahmedabad, Gujarat', NULL, '24AABCG1234H1Z9', 'New prospect. Following up.', true, 0, NOW(), NOW()),
('Karnataka Builders', 'SMB', 'Onboard', 3, 5, 'Vikram Reddy', '9876543215', 'vikram@karbuilders.com', 'Bangalore, Karnataka', NULL, '29AABCK1234I1Z0', 'Recently onboarded client.', true, 0, NOW(), NOW()),

-- Pan India Accounts
('National Highways Corp', 'Pan India', 'Customer', 1, 1, 'Kiran Desai', '9876543216', 'kiran@nhcorp.com', 'Mumbai, Maharashtra', 'https://nhcorp.com', '27AABCN1234J1Z1', 'Pan India operations. Multiple projects.', true, 0, NOW(), NOW()),
('India Infrastructure Pvt Ltd', 'Pan India', 'Retention', 3, 5, 'Ramesh Iyer', '9876543217', 'ramesh@iipl.com', 'Bangalore, Karnataka', NULL, '29AABCI1234K1Z2', 'Requires retention efforts.', true, 0, NOW(), NOW()),

-- Regional Accounts
('Delhi Metro Rail Corp', 'SMB', 'Customer', 4, 7, 'Suresh Gupta', '9876543218', 'suresh@dmrc.com', 'New Delhi', 'https://dmrc.com', '07AABCD1234L1Z3', 'Metro rail projects. Regular orders.', true, 0, NOW(), NOW()),
('Hyderabad Construction', 'SMB', 'New', 5, 9, 'Karthik Rao', '9876543219', 'karthik@hydconstruct.com', 'Hyderabad, Telangana', NULL, '36AABCH1234M1Z4', 'New account. Initial contact.', true, 0, NOW(), NOW());

-- =====================================================
-- 2. CREATE SUB-ACCOUNTS (Branches/Locations)
-- =====================================================

INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active, created_at, updated_at) VALUES
-- Sub-accounts for Account 1 (Tata Infrastructure)
(1, 'Tata Infrastructure - Mumbai Branch', 'Employee1', 85, true, NOW(), NOW()),
(1, 'Tata Infrastructure - Pune Branch', 'Employee2', 75, true, NOW(), NOW()),
(1, 'Tata Infrastructure - Nashik Branch', 'Employee3', 65, true, NOW(), NOW()),

-- Sub-accounts for Account 2 (Reliance)
(2, 'Reliance Industries - Mumbai HQ', 'Employee1', 90, true, NOW(), NOW()),
(2, 'Reliance Industries - Navi Mumbai', 'Employee2', 70, true, NOW(), NOW()),

-- Sub-accounts for Account 3 (Adani)
(3, 'Adani Group - Ahmedabad Main', 'Employee2', 80, true, NOW(), NOW()),
(3, 'Adani Group - Surat Branch', 'Employee3', 60, true, NOW(), NOW()),

-- Sub-accounts for Account 4 (Maharashtra Roadways)
(4, 'Maharashtra Roadways - Mumbai', 'Employee1', 55, true, NOW(), NOW()),

-- Sub-accounts for Account 5 (Gujarat Construction)
(5, 'Gujarat Construction - Ahmedabad', 'Employee2', 45, true, NOW(), NOW()),

-- Sub-accounts for Account 6 (Karnataka Builders)
(6, 'Karnataka Builders - Bangalore', 'Employee3', 50, true, NOW(), NOW()),

-- Sub-accounts for Account 7 (National Highways)
(7, 'NHC - Mumbai Office', 'Employee1', 75, true, NOW(), NOW()),
(7, 'NHC - Delhi Office', 'Employee2', 70, true, NOW(), NOW()),
(7, 'NHC - Bangalore Office', 'Employee3', 65, true, NOW(), NOW()),

-- Sub-accounts for Account 8 (India Infrastructure)
(8, 'IIPL - Bangalore Main', 'Employee3', 60, true, NOW(), NOW()),

-- Sub-accounts for Account 9 (Delhi Metro)
(9, 'DMRC - Delhi Central', 'Employee1', 70, true, NOW(), NOW()),

-- Sub-accounts for Account 10 (Hyderabad Construction)
(10, 'Hyderabad Construction - Main', 'Employee2', 35, true, NOW(), NOW());

-- =====================================================
-- 3. CREATE CONTACTS
-- =====================================================

INSERT INTO contacts (sub_account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by, created_at, updated_at) VALUES
-- Contacts for Sub-account 1 (Tata Mumbai)
(1, 'Rajesh Kumar', 'Project Manager', 'rajesh.kumar@tatainfra.com', '9876543210', 'Connected', 'Decision maker. Interested in bulk orders.', NULL, 'Employee1', NOW(), NOW()),
(1, 'Anita Desai', 'Procurement Head', 'anita.desai@tatainfra.com', '9876543220', 'Connected', 'Handles procurement decisions.', NULL, 'Employee1', NOW(), NOW()),

-- Contacts for Sub-account 2 (Tata Pune)
(2, 'Mahesh Patil', 'Operations Manager', 'mahesh.patil@tatainfra.com', '9876543230', 'DNP', 'Did not pick. Call back tomorrow.', NOW() + INTERVAL '1 day', 'Employee2', NOW(), NOW()),

-- Contacts for Sub-account 3 (Tata Nashik)
(3, 'Suresh Gaikwad', 'Site Engineer', 'suresh.g@tatainfra.com', '9876543240', 'ATCBL', 'Available to call back later today.', NOW() + INTERVAL '2 hours', 'Employee3', NOW(), NOW()),

-- Contacts for Sub-account 4 (Reliance Mumbai)
(4, 'Priya Sharma', 'VP Procurement', 'priya.sharma@ril.com', '9876543211', 'Connected', 'Key decision maker. High priority.', NULL, 'Employee1', NOW(), NOW()),
(4, 'Rohit Singh', 'Technical Head', 'rohit.singh@ril.com', '9876543250', 'Connected', 'Technical queries contact.', NULL, 'Employee1', NOW(), NOW()),

-- Contacts for Sub-account 5 (Reliance Navi Mumbai)
(5, 'Kavita Joshi', 'Operations Lead', 'kavita.j@ril.com', '9876543260', 'Connected', 'Regular communication.', NULL, 'Employee2', NOW(), NOW()),

-- Contacts for Sub-account 6 (Adani Ahmedabad)
(6, 'Amit Patel', 'General Manager', 'amit.patel@adani.com', '9876543212', 'Connected', 'Main contact for Adani group.', NULL, 'Employee2', NOW(), NOW()),

-- Contacts for Sub-account 7 (Adani Surat)
(7, 'Harsh Shah', 'Project Coordinator', 'harsh.shah@adani.com', '9876543270', 'Unable to connect', 'Number seems incorrect. Verify.', NULL, 'Employee3', NOW(), NOW()),

-- Contacts for Sub-account 8 (Maharashtra Roadways)
(8, 'Sanjay Mehta', 'Owner', 'sanjay@mhroadways.com', '9876543213', 'Connected', 'Direct owner. Quick decisions.', NULL, 'Employee1', NOW(), NOW()),

-- Contacts for Sub-account 9 (Gujarat Construction)
(9, 'Deepak Shah', 'Managing Director', 'deepak@gujconstruct.com', '9876543214', 'DNP', 'New prospect. Follow up needed.', NOW() + INTERVAL '2 days', 'Employee2', NOW(), NOW()),

-- Contacts for Sub-account 10 (Karnataka Builders)
(10, 'Vikram Reddy', 'CEO', 'vikram@karbuilders.com', '9876543215', 'Connected', 'Newly onboarded. Regular follow-up.', NULL, 'Employee3', NOW(), NOW()),

-- Contacts for Sub-account 11 (NHC Mumbai)
(11, 'Kiran Desai', 'Director Projects', 'kiran@nhcorp.com', '9876543216', 'Connected', 'High-value client.', NULL, 'Employee1', NOW(), NOW()),

-- Contacts for Sub-account 12 (NHC Delhi)
(12, 'Ravi Kapoor', 'Project Head', 'ravi.k@nhcorp.com', '9876543280', 'Connected', 'Delhi operations head.', NULL, 'Employee2', NOW(), NOW()),

-- Contacts for Sub-account 13 (NHC Bangalore)
(13, 'Arjun Nair', 'Regional Manager', 'arjun.n@nhcorp.com', '9876543290', 'DNP', 'Call back scheduled.', NOW() + INTERVAL '1 day', 'Employee3', NOW(), NOW()),

-- Contacts for Sub-account 14 (IIPL Bangalore)
(14, 'Ramesh Iyer', 'Operations Director', 'ramesh@iipl.com', '9876543217', 'Connected', 'Requires attention for retention.', NULL, 'Employee3', NOW(), NOW()),

-- Contacts for Sub-account 15 (DMRC Delhi)
(15, 'Suresh Gupta', 'Chief Engineer', 'suresh@dmrc.com', '9876543218', 'Connected', 'Metro rail projects.', NULL, 'Employee1', NOW(), NOW()),

-- Contacts for Sub-account 16 (Hyderabad Construction)
(16, 'Karthik Rao', 'Founder', 'karthik@hydconstruct.com', '9876543219', 'New', 'New account. Initial contact made.', NULL, 'Employee2', NOW(), NOW());

-- =====================================================
-- 4. CREATE QUOTATIONS (Price Engine Data)
-- Different statuses and values
-- =====================================================

-- MBCB Quotations
INSERT INTO quotes_mbcb (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, status, created_by, is_saved, created_at, updated_at) VALUES
-- Closed Won Quotations (High Value)
('W-Beam', 1, 1, 1, 'Tata Infrastructure - Mumbai Branch', 'Highway Construction', '2024-01-15', 500, 45.5, 2500.00, 1250000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '45 days', NOW() - INTERVAL '10 days'),
('Thrie Beam', 1, 1, 1, 'Tata Infrastructure - Mumbai Branch', 'Expressway Project', '2024-02-01', 300, 52.3, 2800.00, 840000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'),
('W-Beam', 1, 2, 4, 'Reliance Industries - Mumbai HQ', 'Factory Road', '2024-02-10', 250, 45.5, 2500.00, 625000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '21 days', NOW() - INTERVAL '3 days'),

-- Sent/Negotiation Quotations (Medium Value)
('Double W-Beam', 2, 3, 6, 'Adani Group - Ahmedabad Main', 'Port Access Road', '2024-03-05', 400, 91.0, 5000.00, 2000000.00, 'sent', 'Employee2', true, NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days'),
('W-Beam', 1, 1, 11, 'NHC - Mumbai Office', 'NH-48 Expansion', '2024-03-08', 600, 45.5, 2500.00, 1500000.00, 'negotiation', 'Employee1', true, NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'),
('Thrie Beam', 4, 7, 15, 'DMRC - Delhi Central', 'Metro Rail Corridor', '2024-03-10', 350, 52.3, 2800.00, 980000.00, 'sent', 'Employee1', true, NOW() - INTERVAL '2 days', NOW()),

-- Draft Quotations
('W-Beam', 1, 2, 5, 'Reliance Industries - Navi Mumbai', 'Warehouse Road', '2024-03-11', 150, 45.5, 2500.00, 375000.00, 'draft', 'Employee2', true, NOW() - INTERVAL '1 day', NOW()),
('Thrie Beam', 3, 5, 10, 'Karnataka Builders - Bangalore', 'Commercial Complex', '2024-03-11', 200, 52.3, 2800.00, 560000.00, 'draft', 'Employee3', true, NOW() - INTERVAL '1 day', NOW()),
('W-Beam', 1, 1, 8, 'Maharashtra Roadways - Mumbai', 'City Road Renovation', '2024-03-12', 180, 45.5, 2500.00, 450000.00, 'draft', 'Employee1', true, NOW(), NOW()),

-- On Hold Quotations
('Double W-Beam', 2, 3, 7, 'Adani Group - Surat Branch', 'Industrial Zone', '2024-02-20', 300, 91.0, 5000.00, 1500000.00, 'on_hold', 'Employee3', true, NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days'),

-- Closed Lost Quotations
('W-Beam', 1, 1, 2, 'Tata Infrastructure - Pune Branch', 'City Bypass', '2024-01-20', 400, 45.5, 2500.00, 1000000.00, 'closed_lost', 'Employee2', true, NOW() - INTERVAL '50 days', NOW() - INTERVAL '45 days');

-- Signages Quotations
INSERT INTO quotes_signages (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity, area_sq_ft, cost_per_piece, final_total_cost, status, created_by, is_saved, created_at, updated_at) VALUES
-- Closed Won
('Reflective Signages', 1, 1, 1, 'Tata Infrastructure - Mumbai Branch', 'Highway Signages', '2024-02-05', 50, 1250.00, 1500.00, 75000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '35 days', NOW() - INTERVAL '12 days'),
('Reflective Signages', 4, 7, 15, 'DMRC - Delhi Central', 'Metro Station Signages', '2024-03-01', 30, 900.00, 1200.00, 36000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days'),

-- Sent/Negotiation
('Reflective Signages', 2, 3, 6, 'Adani Group - Ahmedabad Main', 'Port Signages', '2024-03-07', 40, 1000.00, 1400.00, 56000.00, 'sent', 'Employee2', true, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
('Reflective Signages', 3, 5, 14, 'IIPL - Bangalore Main', 'IT Park Signages', '2024-03-09', 25, 750.00, 1300.00, 32500.00, 'negotiation', 'Employee3', true, NOW() - INTERVAL '3 days', NOW()),

-- Draft
('Reflective Signages', 1, 1, 11, 'NHC - Mumbai Office', 'Highway Directional Signs', '2024-03-12', 60, 1500.00, 1450.00, 87000.00, 'draft', 'Employee1', true, NOW(), NOW()),

-- On Hold
('Reflective Signages', 5, 9, 16, 'Hyderabad Construction - Main', 'Commercial Building', '2024-02-25', 20, 600.00, 1250.00, 25000.00, 'on_hold', 'Employee2', true, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days');

-- Paint Quotations (Fewer, as paint is less common)
INSERT INTO quotes_paint (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity, area_sq_ft, cost_per_piece, final_total_cost, status, created_by, is_saved, created_at, updated_at) VALUES
('Paint', 1, 1, 1, 'Tata Infrastructure - Mumbai Branch', 'Road Marking', '2024-02-15', 1000, 25000.00, 50.00, 50000.00, 'closed_won', 'Employee1', true, NOW() - INTERVAL '25 days', NOW() - INTERVAL '8 days'),
('Paint', 4, 7, 15, 'DMRC - Delhi Central', 'Parking Marking', '2024-03-06', 500, 12500.00, 45.00, 22500.00, 'sent', 'Employee1', true, NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day');

-- =====================================================
-- 5. UPDATE ENGAGEMENT SCORES based on activities
-- =====================================================

-- Update engagement scores for accounts based on sub-account scores
UPDATE accounts SET engagement_score = (
  SELECT COALESCE(SUM(engagement_score), 0)
  FROM sub_accounts
  WHERE sub_accounts.account_id = accounts.id
  AND sub_accounts.is_active = true
) WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

-- =====================================================
-- 6. CREATE SOME ACTIVITIES
-- =====================================================

INSERT INTO activities (account_id, contact_id, employee_id, type, description, timestamp, created_at) VALUES
(1, 1, 1, 'call', 'Successful call with Rajesh Kumar. Discussed new highway project requirements.', NOW() - INTERVAL '2 days', NOW()),
(1, 1, 1, 'note', 'Follow-up: Rajesh confirmed interest in bulk W-Beam order for Q2.', NOW() - INTERVAL '1 day', NOW()),
(2, 4, 1, 'call', 'Connected with Priya Sharma. She requested quotation for factory road project.', NOW() - INTERVAL '5 days', NOW()),
(2, 4, 1, 'quotation', 'Quotation #4 created and sent for Reliance Industries factory road project.', NOW() - INTERVAL '3 days', NOW()),
(3, 6, 2, 'call', 'Initial call with Amit Patel from Adani. Discussed port access road requirements.', NOW() - INTERVAL '8 days', NOW()),
(3, 6, 2, 'quotation', 'Quotation #5 sent to Adani for Double W-Beam project.', NOW() - INTERVAL '7 days', NOW()),
(7, 11, 1, 'call', 'Meeting with Kiran Desai about NH-48 expansion project.', NOW() - INTERVAL '4 days', NOW()),
(9, 15, 1, 'quotation', 'Quotation #6 created for DMRC metro rail corridor project.', NOW() - INTERVAL '2 days', NOW());

-- =====================================================
-- 7. CREATE SOME LEADS
-- =====================================================

INSERT INTO leads (account_id, lead_name, phone, email, requirements, lead_source, status, assigned_employee, created_at, updated_at) VALUES
(10, 'Telangana Infrastructure Development', '9876543300', 'contact@telinfra.com', 'Requires W-Beam for new expressway project', 'Website', 'New', 'Employee2', NOW() - INTERVAL '3 days', NOW()),
(5, 'Gujarat Metro Corporation', '9876543301', 'procurement@gujmetro.com', 'Looking for signages for metro stations', 'Referral', 'In Progress', 'Employee2', NOW() - INTERVAL '5 days', NOW()),
(NULL, 'Chennai Construction Works', '9876543302', 'info@chennaiworks.com', 'Road safety barriers for city roads', 'Cold Call', 'Quotation Sent', 'Employee3', NOW() - INTERVAL '2 days', NOW());

-- =====================================================
-- 8. CREATE SOME TASKS
-- =====================================================

INSERT INTO tasks (account_id, title, description, task_type, due_date, status, assigned_to, created_at, updated_at) VALUES
(1, 'Follow-up with Rajesh on new project', 'Call Rajesh Kumar to discuss Q2 project timeline', 'Follow-up', NOW() + INTERVAL '3 days', 'In Progress', 'Employee1', NOW() - INTERVAL '1 day', NOW()),
(2, 'Submit revised quotation to Reliance', 'Prepare and send updated quotation with new pricing', 'Follow-up', NOW() + INTERVAL '2 days', 'In Progress', 'Employee1', NOW(), NOW()),
(5, 'Initial meeting with Deepak Shah', 'Schedule introductory meeting with Gujarat Construction MD', 'Meeting', NOW() + INTERVAL '5 days', 'Pending', 'Employee2', NOW() - INTERVAL '2 days', NOW()),
(10, 'Contact verification for Karthik Rao', 'Verify contact details for Hyderabad Construction founder', 'Call', NOW() + INTERVAL '1 day', 'Pending', 'Employee2', NOW(), NOW()),
(7, 'Send project update to NHC', 'Provide status update on NH-48 expansion quotation', 'Follow-up', NOW() + INTERVAL '4 days', 'Pending', 'Employee1', NOW() - INTERVAL '1 day', NOW());

-- =====================================================
-- SUMMARY
-- =====================================================
-- Accounts: 10 (Various stages and tags)
-- Sub-accounts: 16 (Assigned to different employees)
-- Contacts: 16 (Various call statuses and follow-ups)
-- Quotations MBCB: 10 (Various statuses: closed_won, sent, negotiation, draft, on_hold, closed_lost)
-- Quotations Signages: 6 (Various statuses)
-- Quotations Paint: 2
-- Activities: 8 (Calls, notes, quotations)
-- Leads: 3 (New, In Progress, Quotation Sent)
-- Tasks: 5 (Various types and statuses)

-- All data is properly linked:
-- - Accounts → Sub-accounts → Contacts
-- - Sub-accounts → Quotations
-- - Accounts → Activities, Leads, Tasks
-- - Quotations linked to Price Engine tables (quotes_mbcb, quotes_signages, quotes_paint)

