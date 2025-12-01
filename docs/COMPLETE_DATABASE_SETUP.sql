-- ============================================
-- COMPLETE DATABASE SETUP FOR YNM SAFETY CRM
-- This script creates all tables, constraints, and initial data
-- Run this script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. DROP EXISTING TABLES (if needed - uncomment if starting fresh)
-- ============================================
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS activities CASCADE;
-- DROP TABLE IF EXISTS contacts CASCADE;
-- DROP TABLE IF EXISTS accounts CASCADE;
-- DROP TABLE IF EXISTS tasks CASCADE;
-- DROP TABLE IF EXISTS leads CASCADE;
-- DROP TABLE IF EXISTS employee_customer CASCADE;
-- DROP TABLE IF EXISTS quotes_paint CASCADE;
-- DROP TABLE IF EXISTS quotes_signages CASCADE;
-- DROP TABLE IF EXISTS quotes_mbcb CASCADE;
-- DROP TABLE IF EXISTS customers CASCADE;
-- DROP TABLE IF EXISTS places_of_supply CASCADE;
-- DROP TABLE IF EXISTS purposes CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TYPE IF EXISTS company_stage_enum CASCADE;
-- DROP TYPE IF EXISTS company_tag_enum CASCADE;
-- DROP TYPE IF EXISTS call_status_enum CASCADE;
-- DROP TYPE IF EXISTS activity_type_enum CASCADE;
-- DROP TYPE IF EXISTS notification_type_enum CASCADE;

-- ============================================
-- 2. CREATE ENUM TYPES
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
-- 3. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================
-- 4. PLACES OF SUPPLY TABLE (28 Indian States)
-- ============================================
CREATE TABLE IF NOT EXISTS places_of_supply (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_of_supply_name ON places_of_supply(name);

-- ============================================
-- 5. PURPOSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purposes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purposes_name ON purposes(name);

-- ============================================
-- 6. CUSTOMERS TABLE (Extended for CRM)
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  location TEXT,
  address TEXT,
  gst_number TEXT,
  category TEXT CHECK (category IN ('Contractor', 'Government', 'Trader', 'Other')),
  related_products JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  sales_employee TEXT NOT NULL,
  city TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT customers_name_sales_employee_unique UNIQUE (name, sales_employee)
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_sales_employee ON customers(sales_employee);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(category);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- ============================================
-- 7. ACCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  account_name TEXT NOT NULL,
  company_stage company_stage_enum NOT NULL,
  company_tag company_tag_enum NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  website TEXT,
  gst_number TEXT,
  related_products TEXT[] DEFAULT '{}',
  assigned_employee TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  engagement_score DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_account_name ON accounts(account_name);
CREATE INDEX IF NOT EXISTS idx_accounts_company_stage ON accounts(company_stage);
CREATE INDEX IF NOT EXISTS idx_accounts_company_tag ON accounts(company_tag);
CREATE INDEX IF NOT EXISTS idx_accounts_assigned_employee ON accounts(assigned_employee);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_accounts_engagement_score ON accounts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_last_activity ON accounts(last_activity_at DESC);

-- ============================================
-- 8. CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_follow_up_date ON contacts(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_contacts_call_status ON contacts(call_status);

-- ============================================
-- 9. ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL,
  activity_type activity_type_enum NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_account_id ON activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_employee_id ON activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- ============================================
-- 10. LEADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  lead_name TEXT NOT NULL,
  company_name TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  location TEXT,
  address TEXT,
  requirements TEXT,
  lead_source TEXT,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Quotation Sent', 'Follow-up', 'Closed', 'Lost')),
  assigned_to TEXT NOT NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON leads(account_id);

-- ============================================
-- 11. TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('Follow-up', 'Meeting', 'Call')),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  description TEXT,
  assigned_to TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_account_id ON tasks(account_id);

-- ============================================
-- 12. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type notification_type_enum NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  quotation_id INTEGER,
  is_seen BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  is_snoozed BOOLEAN DEFAULT false,
  snooze_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_seen ON notifications(is_seen);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_account_id ON notifications(account_id);

-- ============================================
-- 13. EMPLOYEE_CUSTOMER JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employee_customer (
  id SERIAL PRIMARY KEY,
  employee_username TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by TEXT,
  UNIQUE(employee_username, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_customer_employee ON employee_customer(employee_username);
CREATE INDEX IF NOT EXISTS idx_employee_customer_customer ON employee_customer(customer_id);

-- ============================================
-- 14. QUOTATION TABLES
-- ============================================

-- Quotes MBCB
CREATE TABLE IF NOT EXISTS quotes_mbcb (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  place_of_supply TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  purpose TEXT,
  date TEXT NOT NULL,
  quantity_rm NUMERIC,
  total_weight_per_rm NUMERIC,
  total_cost_per_rm NUMERIC,
  final_total_cost NUMERIC,
  raw_payload JSONB,
  created_by TEXT,
  is_saved BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'negotiation', 'on_hold', 'closed_won', 'closed_lost')),
  comments TEXT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  status_history JSONB DEFAULT '[]'::jsonb,
  comments_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_customer_name ON quotes_mbcb(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_created_by ON quotes_mbcb(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_status ON quotes_mbcb(status);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_customer_id ON quotes_mbcb(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_account_id ON quotes_mbcb(account_id);

-- Quotes Signages
CREATE TABLE IF NOT EXISTS quotes_signages (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  place_of_supply TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  purpose TEXT,
  date TEXT NOT NULL,
  quantity NUMERIC,
  area_sq_ft NUMERIC,
  cost_per_piece NUMERIC,
  final_total_cost NUMERIC,
  raw_payload JSONB,
  created_by TEXT,
  is_saved BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'negotiation', 'on_hold', 'closed_won', 'closed_lost')),
  comments TEXT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  status_history JSONB DEFAULT '[]'::jsonb,
  comments_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_signages_customer_name ON quotes_signages(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_created_by ON quotes_signages(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_status ON quotes_signages(status);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_customer_id ON quotes_signages(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_account_id ON quotes_signages(account_id);

-- Quotes Paint
CREATE TABLE IF NOT EXISTS quotes_paint (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  place_of_supply TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  purpose TEXT,
  date TEXT NOT NULL,
  quantity NUMERIC,
  area_sq_ft NUMERIC,
  cost_per_piece NUMERIC,
  final_total_cost NUMERIC,
  raw_payload JSONB,
  created_by TEXT,
  is_saved BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'negotiation', 'on_hold', 'closed_won', 'closed_lost')),
  comments TEXT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  status_history JSONB DEFAULT '[]'::jsonb,
  comments_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_paint_customer_name ON quotes_paint(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_created_by ON quotes_paint(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_status ON quotes_paint(status);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_customer_id ON quotes_paint(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_account_id ON quotes_paint(account_id);

-- ============================================
-- 15. TRIGGERS AND FUNCTIONS
-- ============================================

-- Function to update accounts timestamp
CREATE OR REPLACE FUNCTION update_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounts_update_timestamp
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION update_accounts_timestamp();

-- Function to update engagement score
CREATE OR REPLACE FUNCTION update_account_engagement_score()
RETURNS TRIGGER AS $$
DECLARE
  score_change DECIMAL(10, 2) := 0;
BEGIN
  CASE NEW.activity_type
    WHEN 'call' THEN
      IF NEW.metadata->>'call_status' = 'Connected' THEN
        score_change := 10;
      ELSIF NEW.metadata->>'call_status' = 'DNP' THEN
        score_change := -5;
      ELSIF NEW.metadata->>'call_status' IN ('Unable to connect', 'Number doesn''t exist', 'Wrong number') THEN
        score_change := -10;
      END IF;
    WHEN 'note' THEN
      score_change := 5;
    WHEN 'quotation' THEN
      IF NEW.metadata->>'quotation_status' = 'closed_won' THEN
        score_change := 20;
      ELSIF NEW.metadata->>'quotation_status' = 'closed_lost' THEN
        score_change := -20;
      ELSE
        score_change := 15;
      END IF;
    WHEN 'task' THEN
      IF NEW.metadata->>'task_status' = 'Completed' THEN
        score_change := 5;
      END IF;
    WHEN 'followup' THEN
      score_change := 10;
  END CASE;

  UPDATE accounts
  SET engagement_score = COALESCE(engagement_score, 0) + score_change,
      last_activity_at = NOW()
  WHERE id = NEW.account_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activities_update_engagement_score
AFTER INSERT ON activities
FOR EACH ROW
EXECUTE FUNCTION update_account_engagement_score();

-- Function to create follow-up notifications
CREATE OR REPLACE FUNCTION create_followup_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.follow_up_date IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      notification_type,
      title,
      message,
      account_id,
      contact_id
    ) VALUES (
      NEW.created_by,
      'callback_scheduled',
      'Follow-up Scheduled',
      'Follow up with ' || NEW.name || ' from account (scheduled for ' || 
      TO_CHAR(NEW.follow_up_date, 'DD Mon YYYY HH24:MI') || ')',
      NEW.account_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_create_followup_notification
AFTER INSERT OR UPDATE ON contacts
FOR EACH ROW
WHEN (NEW.follow_up_date IS NOT NULL)
EXECUTE FUNCTION create_followup_notification();

-- ============================================
-- 16. INSERT INITIAL DATA
-- ============================================

-- Insert Users
INSERT INTO users (username, password) VALUES
  ('Admin', 'Admin@123'),
  ('Employee1', 'Employee1@123'),
  ('Employee2', 'Employee2@123'),
  ('Employee3', 'Employee3@123')
ON CONFLICT (username) DO NOTHING;

-- Insert 28 Indian States
INSERT INTO places_of_supply (name) VALUES
  ('Andhra Pradesh'),
  ('Arunachal Pradesh'),
  ('Assam'),
  ('Bihar'),
  ('Chhattisgarh'),
  ('Goa'),
  ('Gujarat'),
  ('Haryana'),
  ('Himachal Pradesh'),
  ('Jharkhand'),
  ('Karnataka'),
  ('Kerala'),
  ('Madhya Pradesh'),
  ('Maharashtra'),
  ('Manipur'),
  ('Meghalaya'),
  ('Mizoram'),
  ('Nagaland'),
  ('Odisha'),
  ('Punjab'),
  ('Rajasthan'),
  ('Sikkim'),
  ('Tamil Nadu'),
  ('Telangana'),
  ('Tripura'),
  ('Uttar Pradesh'),
  ('Uttarakhand'),
  ('West Bengal')
ON CONFLICT (name) DO NOTHING;

-- Insert Customers for Employee1 (a, b, c)
INSERT INTO customers (name, sales_employee, created_by, is_active) VALUES
  ('a', 'Employee1', 'Employee1', true),
  ('b', 'Employee1', 'Employee1', true),
  ('c', 'Employee1', 'Employee1', true)
ON CONFLICT (name, sales_employee) DO NOTHING;

-- Insert Customers for Employee2 (d, e, f)
INSERT INTO customers (name, sales_employee, created_by, is_active) VALUES
  ('d', 'Employee2', 'Employee2', true),
  ('e', 'Employee2', 'Employee2', true),
  ('f', 'Employee2', 'Employee2', true)
ON CONFLICT (name, sales_employee) DO NOTHING;

-- Insert Customers for Employee3 (g, h, i)
INSERT INTO customers (name, sales_employee, created_by, is_active) VALUES
  ('g', 'Employee3', 'Employee3', true),
  ('h', 'Employee3', 'Employee3', true),
  ('i', 'Employee3', 'Employee3', true)
ON CONFLICT (name, sales_employee) DO NOTHING;

-- Insert into employee_customer junction table
INSERT INTO employee_customer (employee_username, customer_id, assigned_by)
SELECT 'Employee1', id, 'Admin' FROM customers WHERE name IN ('a', 'b', 'c')
ON CONFLICT (employee_username, customer_id) DO NOTHING;

INSERT INTO employee_customer (employee_username, customer_id, assigned_by)
SELECT 'Employee2', id, 'Admin' FROM customers WHERE name IN ('d', 'e', 'f')
ON CONFLICT (employee_username, customer_id) DO NOTHING;

INSERT INTO employee_customer (employee_username, customer_id, assigned_by)
SELECT 'Employee3', id, 'Admin' FROM customers WHERE name IN ('g', 'h', 'i')
ON CONFLICT (employee_username, customer_id) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Uncomment to verify data:

-- SELECT * FROM users;
-- SELECT * FROM places_of_supply ORDER BY name;
-- SELECT name, sales_employee FROM customers ORDER BY sales_employee, name;
-- SELECT COUNT(*) as total_customers FROM customers;
-- SELECT COUNT(*) as total_places FROM places_of_supply;

-- ============================================
-- END OF SCRIPT
-- ============================================

