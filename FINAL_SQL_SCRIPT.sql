-- ============================================
-- FINAL COMPLETE SQL SCRIPT FOR YNM SAFETY
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- STEP 1: DROP OLD TABLES (keeps users, states, cities)
-- ============================================
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

-- Drop ENUM types
DROP TYPE IF EXISTS notification_type_enum CASCADE;
DROP TYPE IF EXISTS activity_type_enum CASCADE;
DROP TYPE IF EXISTS call_status_enum CASCADE;
DROP TYPE IF EXISTS company_tag_enum CASCADE;
DROP TYPE IF EXISTS company_stage_enum CASCADE;

-- STEP 2: CREATE ENUM TYPES
-- ============================================
CREATE TYPE company_stage_enum AS ENUM (
  'Enterprise', 'SMB', 'Pan India', 'APAC', 'Middle East & Africa', 'Europe', 'North America', 'LATAM_SouthAmerica'
);

CREATE TYPE company_tag_enum AS ENUM (
  'New', 'Prospect', 'Customer', 'Onboard', 'Lapsed', 'Needs Attention', 'Retention', 'Renewal', 'Upselling'
);

CREATE TYPE call_status_enum AS ENUM (
  'Connected', 'DNP', 'ATCBL', 'Unable to connect', 'Number doesn''t exist', 'Wrong number'
);

CREATE TYPE activity_type_enum AS ENUM (
  'call', 'note', 'followup', 'quotation', 'email', 'task', 'meeting'
);

CREATE TYPE notification_type_enum AS ENUM (
  'followup_due', 'callback_scheduled', 'task_due', 'quotation_update'
);

-- STEP 3: CREATE TABLES
-- ============================================

-- Purposes Table
CREATE TABLE purposes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts Table (Parent)
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

CREATE INDEX idx_accounts_state_id ON accounts(state_id);
CREATE INDEX idx_accounts_city_id ON accounts(city_id);
CREATE INDEX idx_accounts_is_active ON accounts(is_active);

-- Sub-Accounts Table (Child - assigned to employees)
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
CREATE INDEX idx_sub_accounts_is_active ON sub_accounts(is_active);

-- Contacts Table
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

-- Quotation Tables (using state_id/city_id, NOT place_of_supply)
CREATE TABLE quotes_mbcb (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  state_id INTEGER REFERENCES states(id),
  city_id INTEGER REFERENCES cities(id),
  sub_account_id INTEGER NOT NULL REFERENCES sub_accounts(id),
  customer_name TEXT NOT NULL,
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

CREATE TABLE quotes_signages (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  state_id INTEGER REFERENCES states(id),
  city_id INTEGER REFERENCES cities(id),
  sub_account_id INTEGER NOT NULL REFERENCES sub_accounts(id),
  customer_name TEXT NOT NULL,
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

CREATE TABLE quotes_paint (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  state_id INTEGER REFERENCES states(id),
  city_id INTEGER REFERENCES cities(id),
  sub_account_id INTEGER NOT NULL REFERENCES sub_accounts(id),
  customer_name TEXT NOT NULL,
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

-- Activities Table
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

-- Leads Table
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

-- Tasks Table
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

-- Notifications Table
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

-- STEP 4: INSERT INITIAL DATA
-- ============================================

INSERT INTO purposes (name) VALUES 
  ('New Project'), ('Replacement'), ('Maintenance'), ('Expansion')
ON CONFLICT (name) DO NOTHING;

-- STEP 5: INSERT DUMMY DATA
-- ============================================

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
  -- Get first state and city
  SELECT id INTO first_state_id FROM states LIMIT 1;
  SELECT id INTO first_city_id FROM cities WHERE state_id = first_state_id LIMIT 1;
  
  -- Create 3 Accounts
  INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, is_active, engagement_score)
  VALUES ('ABC Infrastructure Ltd', 'Enterprise', 'Customer', first_state_id, first_city_id, 'Rajesh Kumar', '+91 80 1234 5678', 'info@abc-infra.com', '123 Industrial Area', true, 0)
  RETURNING id INTO account1_id;
  
  INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, is_active, engagement_score)
  VALUES ('XYZ Constructions Pvt Ltd', 'SMB', 'Prospect', first_state_id, first_city_id, 'Priya Sharma', '+91 22 9876 5432', 'contact@xyz-constructions.com', '456 Business Park', true, 0)
  RETURNING id INTO account2_id;
  
  INSERT INTO accounts (account_name, company_stage, company_tag, state_id, city_id, contact_person, phone, email, address, is_active, engagement_score)
  VALUES ('Highway Solutions India', 'Pan India', 'Customer', first_state_id, first_city_id, 'Amit Patel', '+91 11 5555 7777', 'sales@highway-solutions.com', '789 Highway Plaza', true, 0)
  RETURNING id INTO account3_id;
  
  -- Create 9 Sub-Accounts (3 for each employee)
  -- Employee1
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account1_id, 'ABC Infra - Bangalore Branch', 'Employee1', 75, true) RETURNING id INTO sub_account1_id;
  
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account1_id, 'ABC Infra - Mumbai Branch', 'Employee1', 65, true) RETURNING id INTO sub_account2_id;
  
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account1_id, 'ABC Infra - Delhi Branch', 'Employee1', 55, true) RETURNING id INTO sub_account3_id;
  
  -- Employee2
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account2_id, 'XYZ Constructions - Main Office', 'Employee2', 80, true) RETURNING id INTO sub_account4_id;
  
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account2_id, 'XYZ Constructions - Site A', 'Employee2', 70, true) RETURNING id INTO sub_account5_id;
  
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account2_id, 'XYZ Constructions - Site B', 'Employee2', 60, true) RETURNING id INTO sub_account6_id;
  
  -- Employee3
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account3_id, 'Highway Solutions - North Zone', 'Employee3', 85, true) RETURNING id INTO sub_account7_id;
  
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account3_id, 'Highway Solutions - South Zone', 'Employee3', 75, true) RETURNING id INTO sub_account8_id;
  
  INSERT INTO sub_accounts (account_id, sub_account_name, assigned_employee, engagement_score, is_active)
  VALUES (account3_id, 'Highway Solutions - East Zone', 'Employee3', 65, true) RETURNING id INTO sub_account9_id;
  
  -- Create Contacts (at least 1 per sub-account)
  INSERT INTO contacts (sub_account_id, account_id, name, designation, email, phone, call_status, notes, created_by)
  VALUES 
    (sub_account1_id, account1_id, 'Ravi Kumar', 'Manager', 'ravi.kumar@abc-infra.com', '9999999999', 'Connected', 'Primary contact', 'Employee1'),
    (sub_account1_id, account1_id, 'Sunita Reddy', 'Purchase Head', 'sunita.reddy@abc-infra.com', '8888888888', 'Connected', 'Handles procurement', 'Employee1'),
    (sub_account2_id, account1_id, 'Vikram Singh', 'Branch Manager', 'vikram.singh@abc-infra.com', '7777777777', 'ATCBL', 'Needs callback', 'Employee1'),
    (sub_account3_id, account1_id, 'Anil Gupta', 'Director', 'anil.gupta@abc-infra.com', '5555555555', 'ATCBL', 'Follow up scheduled', 'Employee1'),
    (sub_account4_id, account2_id, 'Sheetal Singh', 'Purchase Head', 'sheetal.singh@xyz-constructions.com', '1111111111', 'Connected', 'Main contact', 'Employee2'),
    (sub_account4_id, account2_id, 'Rohit Malhotra', 'CEO', 'rohit.malhotra@xyz-constructions.com', '2222222222', 'DNP', 'Did not pick up', 'Employee2'),
    (sub_account5_id, account2_id, 'Deepak Verma', 'Site Manager', 'deepak.verma@xyz-constructions.com', '3333333333', 'ATCBL', 'Needs quote', 'Employee2'),
    (sub_account6_id, account2_id, 'Kavita Nair', 'Project Coordinator', 'kavita.nair@xyz-constructions.com', '4444444444', 'Connected', 'Coordinates activities', 'Employee2'),
    (sub_account7_id, account3_id, 'Amit Patel', 'Regional Director', 'amit.patel@highway-solutions.com', '1234567890', 'Connected', 'North zone head', 'Employee3'),
    (sub_account7_id, account3_id, 'Sneha Desai', 'Procurement Manager', 'sneha.desai@highway-solutions.com', '2345678901', 'Connected', 'Procurement head', 'Employee3'),
    (sub_account8_id, account3_id, 'Rajesh Iyer', 'Zone Head', 'rajesh.iyer@highway-solutions.com', '3456789012', 'ATCBL', 'Follow up needed', 'Employee3'),
    (sub_account9_id, account3_id, 'Priyanka Banerjee', 'Operations Head', 'priyanka.banerjee@highway-solutions.com', '4567890123', 'Connected', 'Manages operations', 'Employee3');
  
  -- Create Sample Quotations
  INSERT INTO quotes_mbcb (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, created_by, is_saved, status)
  VALUES ('W-Beam', first_state_id, first_city_id, sub_account1_id, 'ABC Infra - Bangalore Branch', 'New Project', TO_CHAR(NOW()::DATE, 'DD/MM/YYYY'), 1000, 25.5, 150000, 15000000, 'Employee1', true, 'sent');
  
  INSERT INTO quotes_signages (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity, area_sq_ft, cost_per_piece, final_total_cost, created_by, is_saved, status)
  VALUES ('Signages', first_state_id, first_city_id, sub_account4_id, 'XYZ Constructions - Main Office', 'New Project', TO_CHAR(NOW()::DATE, 'DD/MM/YYYY'), 50, 100, 5000, 250000, 'Employee2', true, 'negotiation');
  
  INSERT INTO quotes_mbcb (section, state_id, city_id, sub_account_id, customer_name, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, created_by, is_saved, status)
  VALUES ('Thrie-Beam', first_state_id, first_city_id, sub_account7_id, 'Highway Solutions - North Zone', 'Expansion', TO_CHAR(NOW()::DATE, 'DD/MM/YYYY'), 2000, 30.2, 180000, 36000000, 'Employee3', true, 'draft');
  
  RAISE NOTICE '✅ All dummy data created successfully!';
END $$;

-- ============================================
-- DONE! ✅
-- ============================================

