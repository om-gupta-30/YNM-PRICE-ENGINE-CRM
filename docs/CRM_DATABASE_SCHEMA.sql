-- ============================================
-- CRM DATABASE SCHEMA FOR YNM SAFETY
-- This script creates all necessary tables for the CRM system
-- ============================================

-- ============================================
-- 1. CUSTOMERS TABLE (Extended)
-- ============================================
-- Note: customers table already exists, we're extending it
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS gst_number TEXT,
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('Contractor', 'Government', 'Trader', 'Other')),
ADD COLUMN IF NOT EXISTS related_products JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on city for faster filtering
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(category);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- ============================================
-- 2. LEADS TABLE
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
  assigned_to TEXT NOT NULL, -- Employee username
  notes TEXT,
  created_by TEXT NOT NULL, -- Employee who created the lead
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);

-- ============================================
-- 3. TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT, -- Denormalized for easier queries
  task_type TEXT NOT NULL CHECK (task_type IN ('Follow-up', 'Meeting', 'Call')),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  description TEXT,
  assigned_to TEXT NOT NULL, -- Employee username
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id);

-- ============================================
-- 4. EMPLOYEE_CUSTOMER JUNCTION TABLE
-- ============================================
-- This table tracks which customers are assigned to which employees
CREATE TABLE IF NOT EXISTS employee_customer (
  id SERIAL PRIMARY KEY,
  employee_username TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by TEXT, -- Admin who assigned
  UNIQUE(employee_username, customer_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employee_customer_employee ON employee_customer(employee_username);
CREATE INDEX IF NOT EXISTS idx_employee_customer_customer ON employee_customer(customer_id);

-- ============================================
-- 5. UPDATE QUOTATIONS TO LINK TO CUSTOMERS
-- ============================================
-- Add customer_id foreign key to quotation tables
ALTER TABLE quotes_mbcb 
ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE quotes_signages 
ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE quotes_paint 
ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_customer_id ON quotes_mbcb(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_customer_id ON quotes_signages(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_customer_id ON quotes_paint(customer_id);

-- ============================================
-- 6. ADD COMMENTS TO TABLES
-- ============================================
COMMENT ON TABLE customers IS 'Extended customer table with full CRM fields';
COMMENT ON TABLE leads IS 'Leads management for sales pipeline';
COMMENT ON TABLE tasks IS 'Task and follow-up management for employees';
COMMENT ON TABLE employee_customer IS 'Junction table for employee-customer assignments';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Verify customers table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'customers' 
-- ORDER BY ordinal_position;

-- Verify leads table
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'leads' 
-- ORDER BY ordinal_position;

-- Verify tasks table
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'tasks' 
-- ORDER BY ordinal_position;

