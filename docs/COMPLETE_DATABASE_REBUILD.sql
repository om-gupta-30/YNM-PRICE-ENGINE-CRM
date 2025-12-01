-- ============================================
-- COMPLETE DATABASE REBUILD FOR YNM SAFETY
-- This script rebuilds all tables with proper relationships
-- KEEPS: users, states, cities tables
-- DELETES: All other tables and recreates them
-- ============================================

-- ============================================
-- STEP 1: DROP ALL TABLES (EXCEPT users, states, cities)
-- ============================================

-- Drop tables in correct order to handle foreign key dependencies
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS quotes_paint CASCADE;
DROP TABLE IF EXISTS quotes_signages CASCADE;
DROP TABLE IF EXISTS quotes_mbcb CASCADE;
DROP TABLE IF EXISTS sub_accounts CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS employee_customer CASCADE;
DROP TABLE IF EXISTS purposes CASCADE;

-- Drop ENUM types (they will be recreated)
DROP TYPE IF EXISTS notification_type_enum CASCADE;
DROP TYPE IF EXISTS activity_type_enum CASCADE;
DROP TYPE IF EXISTS call_status_enum CASCADE;
DROP TYPE IF EXISTS company_tag_enum CASCADE;
DROP TYPE IF EXISTS company_stage_enum CASCADE;

-- ============================================
-- STEP 2: CREATE ENUM TYPES
-- ============================================

-- Company Stage ENUM
CREATE TYPE company_stage_enum AS ENUM (
  'Enterprise',
  'SMB',
  'Pan India',
  'APAC',
  'Middle East & Africa',
  'Europe',
  'North America',
  'LATAM_SouthAmerica'
);

-- Company Tag ENUM
CREATE TYPE company_tag_enum AS ENUM (
  'New',
  'Prospect',
  'Customer',
  'Onboard',
  'Lapsed',
  'Needs Attention',
  'Retention',
  'Renewal',
  'Upselling'
);

-- Call Status ENUM
CREATE TYPE call_status_enum AS ENUM (
  'Connected',
  'DNP',
  'ATCBL',
  'Unable to connect',
  'Number doesn''t exist',
  'Wrong number'
);

-- Activity Type ENUM
CREATE TYPE activity_type_enum AS ENUM (
  'call',
  'note',
  'followup',
  'quotation',
  'email',
  'task',
  'meeting'
);

-- Notification Type ENUM
CREATE TYPE notification_type_enum AS ENUM (
  'followup_due',
  'callback_scheduled',
  'task_due',
  'quotation_update'
);

-- ============================================
-- STEP 3: CREATE PURPOSES TABLE (Price Engine)
-- ============================================
CREATE TABLE purposes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_purposes_name ON purposes(name);

-- ============================================
-- STEP 4: CREATE ACCOUNTS TABLE (Parent - CRM)
-- ============================================
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  account_name TEXT NOT NULL,
  company_stage company_stage_enum NOT NULL,
  company_tag company_tag_enum NOT NULL,
  state_id INTEGER REFERENCES states(id),
  city_id INTEGER REFERENCES cities(id),
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  website TEXT,
  gst_number TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  engagement_score DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_accounts_account_name ON accounts(account_name);
CREATE INDEX idx_accounts_company_stage ON accounts(company_stage);
CREATE INDEX idx_accounts_company_tag ON accounts(company_tag);
CREATE INDEX idx_accounts_state_id ON accounts(state_id);
CREATE INDEX idx_accounts_city_id ON accounts(city_id);
CREATE INDEX idx_accounts_is_active ON accounts(is_active);
CREATE INDEX idx_accounts_engagement_score ON accounts(engagement_score DESC);
CREATE INDEX idx_accounts_last_activity ON accounts(last_activity_at DESC);

-- ============================================
-- STEP 5: CREATE SUB_ACCOUNTS TABLE (Child - CRM & Price Engine)
-- ============================================
CREATE TABLE sub_accounts (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sub_account_name TEXT NOT NULL,
  assigned_employee TEXT NOT NULL,
  engagement_score DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT sub_accounts_account_name_unique UNIQUE (account_id, sub_account_name)
);

CREATE INDEX idx_sub_accounts_account_id ON sub_accounts(account_id);
CREATE INDEX idx_sub_accounts_assigned_employee ON sub_accounts(assigned_employee);
CREATE INDEX idx_sub_accounts_engagement_score ON sub_accounts(engagement_score DESC);
CREATE INDEX idx_sub_accounts_is_active ON sub_accounts(is_active);

-- ============================================
-- STEP 6: CREATE CONTACTS TABLE (Linked to Sub-Accounts)
-- ============================================
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  sub_account_id INTEGER NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  email TEXT,
  phone TEXT,
  call_status call_status_enum,
  notes TEXT,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contacts_sub_account_id ON contacts(sub_account_id);
CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contacts_follow_up_date ON contacts(follow_up_date);
CREATE INDEX idx_contacts_call_status ON contacts(call_status);
CREATE INDEX idx_contacts_created_by ON contacts(created_by);

-- ============================================
-- STEP 7: CREATE QUOTATION TABLES (Price Engine - Linked to Sub-Accounts)
-- ============================================

-- Quotes MBCB Table
CREATE TABLE quotes_mbcb (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  state_id INTEGER REFERENCES states(id),
  city_id INTEGER REFERENCES cities(id),
  sub_account_id INTEGER NOT NULL REFERENCES sub_accounts(id),
  customer_name TEXT NOT NULL, -- Display name from sub-account
  purpose TEXT,
  date TEXT NOT NULL,
  quantity_rm DECIMAL(10, 2),
  total_weight_per_rm DECIMAL(10, 3),
  total_cost_per_rm DECIMAL(12, 2),
  final_total_cost DECIMAL(12, 2),
  raw_payload JSONB,
  created_by TEXT,
  is_saved BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  comments TEXT,
  status_history JSONB DEFAULT '[]'::jsonb,
  comments_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotes_mbcb_sub_account_id ON quotes_mbcb(sub_account_id);
CREATE INDEX idx_quotes_mbcb_state_id ON quotes_mbcb(state_id);
CREATE INDEX idx_quotes_mbcb_city_id ON quotes_mbcb(city_id);
CREATE INDEX idx_quotes_mbcb_created_by ON quotes_mbcb(created_by);
CREATE INDEX idx_quotes_mbcb_status ON quotes_mbcb(status);
CREATE INDEX idx_quotes_mbcb_created_at ON quotes_mbcb(created_at DESC);

-- Quotes Signages Table
CREATE TABLE quotes_signages (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  state_id INTEGER REFERENCES states(id),
  city_id INTEGER REFERENCES cities(id),
  sub_account_id INTEGER NOT NULL REFERENCES sub_accounts(id),
  customer_name TEXT NOT NULL, -- Display name from sub-account
  purpose TEXT,
  date TEXT NOT NULL,
  quantity DECIMAL(10, 2),
  area_sq_ft DECIMAL(10, 2),
  cost_per_piece DECIMAL(12, 2),
  final_total_cost DECIMAL(12, 2),
  raw_payload JSONB,
  created_by TEXT,
  is_saved BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  comments TEXT,
  status_history JSONB DEFAULT '[]'::jsonb,
  comments_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotes_signages_sub_account_id ON quotes_signages(sub_account_id);
CREATE INDEX idx_quotes_signages_state_id ON quotes_signages(state_id);
CREATE INDEX idx_quotes_signages_city_id ON quotes_signages(city_id);
CREATE INDEX idx_quotes_signages_created_by ON quotes_signages(created_by);
CREATE INDEX idx_quotes_signages_status ON quotes_signages(status);
CREATE INDEX idx_quotes_signages_created_at ON quotes_signages(created_at DESC);

-- Quotes Paint Table
CREATE TABLE quotes_paint (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  state_id INTEGER REFERENCES states(id),
  city_id INTEGER REFERENCES cities(id),
  sub_account_id INTEGER NOT NULL REFERENCES sub_accounts(id),
  customer_name TEXT NOT NULL, -- Display name from sub-account
  purpose TEXT,
  date TEXT NOT NULL,
  quantity DECIMAL(10, 2),
  area_sq_ft DECIMAL(10, 2),
  cost_per_piece DECIMAL(12, 2),
  final_total_cost DECIMAL(12, 2),
  raw_payload JSONB,
  created_by TEXT,
  is_saved BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  comments TEXT,
  status_history JSONB DEFAULT '[]'::jsonb,
  comments_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotes_paint_sub_account_id ON quotes_paint(sub_account_id);
CREATE INDEX idx_quotes_paint_state_id ON quotes_paint(state_id);
CREATE INDEX idx_quotes_paint_city_id ON quotes_paint(city_id);
CREATE INDEX idx_quotes_paint_created_by ON quotes_paint(created_by);
CREATE INDEX idx_quotes_paint_status ON quotes_paint(status);
CREATE INDEX idx_quotes_paint_created_at ON quotes_paint(created_at DESC);

-- ============================================
-- STEP 8: CREATE ACTIVITIES TABLE (CRM)
-- ============================================
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  activity_type activity_type_enum NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activities_account_id ON activities(account_id);
CREATE INDEX idx_activities_sub_account_id ON activities(sub_account_id);
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_employee_id ON activities(employee_id);
CREATE INDEX idx_activities_timestamp ON activities(timestamp DESC);

-- ============================================
-- STEP 9: CREATE LEADS TABLE (CRM)
-- ============================================
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  lead_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  requirements TEXT,
  lead_source TEXT,
  status TEXT DEFAULT 'New',
  assigned_employee TEXT NOT NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leads_assigned_employee ON leads(assigned_employee);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_account_id ON leads(account_id);
CREATE INDEX idx_leads_sub_account_id ON leads(sub_account_id);

-- ============================================
-- STEP 10: CREATE TASKS TABLE (CRM)
-- ============================================
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'Pending',
  assigned_employee TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tasks_account_id ON tasks(account_id);
CREATE INDEX idx_tasks_sub_account_id ON tasks(sub_account_id);
CREATE INDEX idx_tasks_assigned_employee ON tasks(assigned_employee);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);

-- ============================================
-- STEP 11: CREATE NOTIFICATIONS TABLE (CRM)
-- ============================================
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type notification_type_enum NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  is_seen BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  snooze_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_seen ON notifications(is_seen);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- STEP 12: INSERT INITIAL DATA
-- ============================================

-- Insert sample purposes
INSERT INTO purposes (name) VALUES 
  ('New Project'),
  ('Replacement'),
  ('Maintenance'),
  ('Expansion')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STEP 13: INSERT DUMMY ACCOUNTS
-- ============================================

-- Get first state and city IDs for dummy data
DO $$
DECLARE
  first_state_id INTEGER;
  first_city_id INTEGER;
  account1_id INTEGER;
  account2_id INTEGER;
  account3_id INTEGER;
  sub_account1_id INTEGER;
  sub_account2_id INTEGER;
  sub_account3_id INTEGER;
  sub_account4_id INTEGER;
  sub_account5_id INTEGER;
  sub_account6_id INTEGER;
  sub_account7_id INTEGER;
  sub_account8_id INTEGER;
  sub_account9_id INTEGER;
BEGIN
  -- Get first state and city for dummy accounts
  SELECT id INTO first_state_id FROM states LIMIT 1;
  SELECT id INTO first_city_id FROM cities WHERE state_id = first_state_id LIMIT 1;
  
  -- Create Account 1: ABC Infrastructure Ltd
  INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, gst_number, website, notes, is_active, engagement_score)
  VALUES (
    'ABC Infrastructure Ltd',
    'Enterprise',
    'Customer',
    first_state_id,
    first_city_id,
    'Rajesh Kumar',
    '+91 80 1234 5678',
    'info@abc-infra.com',
    '123 Industrial Area, Bangalore',
    '29AABCU9603R1ZM',
    'https://abc-infra.com',
    'Major infrastructure company',
    true,
    0
  )
  RETURNING id INTO account1_id;
  
  -- Create Account 2: XYZ Constructions Pvt Ltd
  INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, gst_number, website, notes, is_active, engagement_score)
  VALUES (
    'XYZ Constructions Pvt Ltd',
    'SMB',
    'Prospect',
    first_state_id,
    first_city_id,
    'Priya Sharma',
    '+91 22 9876 5432',
    'contact@xyz-constructions.com',
    '456 Business Park, Mumbai',
    '27AAACX1234M1Z5',
    'https://xyz-constructions.com',
    'Growing construction firm',
    true,
    0
  )
  RETURNING id INTO account2_id;
  
  -- Create Account 3: Highway Solutions India
  INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, gst_number, website, notes, is_active, engagement_score)
  VALUES (
    'Highway Solutions India',
    'Pan India',
    'Customer',
    first_state_id,
    first_city_id,
    'Amit Patel',
    '+91 11 5555 7777',
    'sales@highway-solutions.com',
    '789 Highway Plaza, Delhi',
    '19AAACH7890K1Z2',
    'https://highway-solutions.com',
    'National highway construction company',
    true,
    0
  )
  RETURNING id INTO account3_id;
  
  -- ============================================
  -- STEP 14: INSERT DUMMY SUB-ACCOUNTS
  -- ============================================
  
  -- Account 1: ABC Infrastructure Ltd - 3 sub-accounts for Employee1
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account1_id, 'ABC Infra - Bangalore Branch', 'Employee1', 75, true)
  RETURNING id INTO sub_account1_id;
  
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account1_id, 'ABC Infra - Mumbai Branch', 'Employee1', 65, true)
  RETURNING id INTO sub_account2_id;
  
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account1_id, 'ABC Infra - Delhi Branch', 'Employee1', 55, true)
  RETURNING id INTO sub_account3_id;
  
  -- Account 2: XYZ Constructions - 3 sub-accounts for Employee2
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account2_id, 'XYZ Constructions - Main Office', 'Employee2', 80, true)
  RETURNING id INTO sub_account4_id;
  
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account2_id, 'XYZ Constructions - Site A', 'Employee2', 70, true)
  RETURNING id INTO sub_account5_id;
  
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account2_id, 'XYZ Constructions - Site B', 'Employee2', 60, true)
  RETURNING id INTO sub_account6_id;
  
  -- Account 3: Highway Solutions - 3 sub-accounts for Employee3
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account3_id, 'Highway Solutions - North Zone', 'Employee3', 85, true)
  RETURNING id INTO sub_account7_id;
  
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account3_id, 'Highway Solutions - South Zone', 'Employee3', 75, true)
  RETURNING id INTO sub_account8_id;
  
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account3_id, 'Highway Solutions - East Zone', 'Employee3', 65, true)
  RETURNING id INTO sub_account9_id;
  
  -- ============================================
  -- STEP 15: INSERT DUMMY CONTACTS
  -- ============================================
  
  -- Contacts for Sub-Account 1 (ABC Infra - Bangalore Branch - Employee1)
  INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, created_by)
  VALUES 
    (sub_account1_id, account1_id, 'Ravi Kumar', 'Manager', 'ravi.kumar@abc-infra.com', '9999999999', 'Connected', 'Primary contact for Bangalore branch', 'Employee1'),
    (sub_account1_id, account1_id, 'Sunita Reddy', 'Purchase Head', 'sunita.reddy@abc-infra.com', '8888888888', 'Connected', 'Handles procurement', 'Employee1');
  
  -- Contacts for Sub-Account 2 (ABC Infra - Mumbai Branch - Employee1)
  INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, created_by)
  VALUES 
    (sub_account2_id, account1_id, 'Vikram Singh', 'Branch Manager', 'vikram.singh@abc-infra.com', '7777777777', 'ATCBL', 'Needs callback for pricing discussion', 'Employee1'),
    (sub_account2_id, account1_id, 'Meera Joshi', 'Operations Manager', 'meera.joshi@abc-infra.com', '6666666666', 'Connected', 'Manages operations', 'Employee1');
  
  -- Contacts for Sub-Account 3 (ABC Infra - Delhi Branch - Employee1)
  INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
  VALUES 
    (sub_account3_id, account1_id, 'Anil Gupta', 'Director', 'anil.gupta@abc-infra.com', '5555555555', 'ATCBL', 'Follow up scheduled', (NOW() + INTERVAL '3 days'), 'Employee1');
  
  -- Contacts for Sub-Account 4 (XYZ Constructions - Main Office - Employee2)
  INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, created_by)
  VALUES 
    (sub_account4_id, account2_id, 'Sheetal Singh', 'Purchase Head', 'sheetal.singh@xyz-constructions.com', '1111111111', 'Connected', 'Main contact for orders', 'Employee2'),
    (sub_account4_id, account2_id, 'Rohit Malhotra', 'CEO', 'rohit.malhotra@xyz-constructions.com', '2222222222', 'DNP', 'Did not pick up last call', 'Employee2');
  
  -- Contacts for Sub-Account 5 (XYZ Constructions - Site A - Employee2)
  INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
  VALUES 
    (sub_account5_id, account2_id, 'Deepak Verma', 'Site Manager', 'deepak.verma@xyz-constructions.com', '3333333333', 'ATCBL', 'Needs quote for Site A project', (NOW() + INTERVAL '5 days'), 'Employee2');
  
  -- Contacts for Sub-Account 6 (XYZ Constructions - Site B - Employee2)
  INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, created_by)
  VALUES 
    (sub_account6_id, account2_id, 'Kavita Nair', 'Project Coordinator', 'kavita.nair@xyz-constructions.com', '4444444444', 'Connected', 'Coordinates Site B activities', 'Employee2');
  
  -- Contacts for Sub-Account 7 (Highway Solutions - North Zone - Employee3)
  INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, created_by)
  VALUES 
    (sub_account7_id, account3_id, 'Amit Patel', 'Regional Director', 'amit.patel@highway-solutions.com', '1234567890', 'Connected', 'North zone operations head', 'Employee3'),
    (sub_account7_id, account3_id, 'Sneha Desai', 'Procurement Manager', 'sneha.desai@highway-solutions.com', '2345678901', 'Connected', 'Handles procurement for North zone', 'Employee3');
  
  -- Contacts for Sub-Account 8 (Highway Solutions - South Zone - Employee3)
  INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, follow_up_date, created_by)
  VALUES 
    (sub_account8_id, account3_id, 'Rajesh Iyer', 'Zone Head', 'rajesh.iyer@highway-solutions.com', '3456789012', 'ATCBL', 'Follow up for South zone project', (NOW() + INTERVAL '7 days'), 'Employee3');
  
  -- Contacts for Sub-Account 9 (Highway Solutions - East Zone - Employee3)
  INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, created_by)
  VALUES 
    (sub_account9_id, account3_id, 'Priyanka Banerjee', 'Operations Head', 'priyanka.banerjee@highway-solutions.com', '4567890123', 'Connected', 'Manages East zone operations', 'Employee3');
  
  -- ============================================
  -- STEP 16: INSERT DUMMY QUOTATIONS (Linked to Sub-Accounts)
  -- ============================================
  
  -- Sample quotation for Sub-Account 1 (Employee1)
  INSERT INTO quotes_mbcb (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, created_by, is_saved, status)
  VALUES (
    'W-Beam',
    first_state_id,
    first_city_id,
    sub_account1_id,
    'ABC Infra - Bangalore Branch',
    'New Project',
    TO_CHAR(NOW()::DATE, 'DD/MM/YYYY'),
    1000,
    25.5,
    150000,
    15000000,
    'Employee1',
    true,
    'sent'
  );
  
  -- Sample quotation for Sub-Account 4 (Employee2)
  INSERT INTO quotes_signages (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity, area_sq_ft, cost_per_piece, final_total_cost, created_by, is_saved, status)
  VALUES (
    'Signages',
    first_state_id,
    first_city_id,
    sub_account4_id,
    'XYZ Constructions - Main Office',
    'New Project',
    TO_CHAR(NOW()::DATE, 'DD/MM/YYYY'),
    50,
    100,
    5000,
    250000,
    'Employee2',
    true,
    'negotiation'
  );
  
  -- Sample quotation for Sub-Account 7 (Employee3)
  INSERT INTO quotes_mbcb (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, created_by, is_saved, status)
  VALUES (
    'Thrie-Beam',
    first_state_id,
    first_city_id,
    sub_account7_id,
    'Highway Solutions - North Zone',
    'Expansion',
    TO_CHAR(NOW()::DATE, 'DD/MM/YYYY'),
    2000,
    30.2,
    180000,
    36000000,
    'Employee3',
    true,
    'draft'
  );
  
  RAISE NOTICE 'Dummy data inserted successfully!';
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify all tables and data:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT COUNT(*) as accounts_count FROM accounts;
-- SELECT COUNT(*) as sub_accounts_count FROM sub_accounts;
-- SELECT COUNT(*) as contacts_count FROM contacts;
-- SELECT COUNT(*) as quotations_count FROM (SELECT id FROM quotes_mbcb UNION ALL SELECT id FROM quotes_signages UNION ALL SELECT id FROM quotes_paint) AS all_quotes;
-- SELECT COUNT(*) as sub_accounts_by_employee FROM sub_accounts GROUP BY assigned_employee;

-- ============================================
-- END OF SCRIPT
-- ============================================
