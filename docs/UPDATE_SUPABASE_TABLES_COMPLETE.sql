-- ============================================
-- COMPLETE SUPABASE TABLE UPDATE
-- This script updates all necessary tables for the new system
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: UPDATE CUSTOMERS TABLE
-- ============================================

-- Add sales_employee column if it doesn't exist
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS sales_employee VARCHAR(255);

-- Drop the old unique constraint on name (if it exists)
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS customers_name_key;

-- Add new unique constraint on (name, sales_employee) combination
-- This allows same customer name for different employees
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'customers_name_sales_employee_unique'
    ) THEN
        ALTER TABLE customers 
        ADD CONSTRAINT customers_name_sales_employee_unique UNIQUE (name, sales_employee);
    END IF;
END $$;

-- Create index on sales_employee for faster queries
CREATE INDEX IF NOT EXISTS idx_customers_sales_employee ON customers(sales_employee);

-- Update existing customers without sales_employee to Admin
UPDATE customers 
SET sales_employee = 'Admin' 
WHERE sales_employee IS NULL;

-- Add comment to column
COMMENT ON COLUMN customers.sales_employee IS 'Sales employee assigned to this customer. NULL or Admin@Sales means accessible to all sales team.';

-- ============================================
-- PART 2: UPDATE QUOTATION TABLES - ADD STATUS COLUMN
-- ============================================

-- Add status column to quotes_mbcb table
ALTER TABLE quotes_mbcb 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Add status column to quotes_signages table
ALTER TABLE quotes_signages 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Add status column to quotes_paint table
ALTER TABLE quotes_paint 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Update existing records to have 'draft' status if null
UPDATE quotes_mbcb SET status = 'draft' WHERE status IS NULL;
UPDATE quotes_signages SET status = 'draft' WHERE status IS NULL;
UPDATE quotes_paint SET status = 'draft' WHERE status IS NULL;

-- Add comments to status columns
COMMENT ON COLUMN quotes_mbcb.status IS 'Quotation status: draft, sent, negotiation, on_hold, closed_won, closed_lost';
COMMENT ON COLUMN quotes_signages.status IS 'Quotation status: draft, sent, negotiation, on_hold, closed_won, closed_lost';
COMMENT ON COLUMN quotes_paint.status IS 'Quotation status: draft, sent, negotiation, on_hold, closed_won, closed_lost';

-- ============================================
-- PART 2B: ADD COMMENTS COLUMN TO QUOTATION TABLES
-- ============================================

-- Add comments column to quotes_mbcb table
ALTER TABLE quotes_mbcb 
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Add comments column to quotes_signages table
ALTER TABLE quotes_signages 
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Add comments column to quotes_paint table
ALTER TABLE quotes_paint 
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Add comments to comments columns
COMMENT ON COLUMN quotes_mbcb.comments IS 'Comments/notes for this quotation';
COMMENT ON COLUMN quotes_signages.comments IS 'Comments/notes for this quotation';
COMMENT ON COLUMN quotes_paint.comments IS 'Comments/notes for this quotation';

-- ============================================
-- PART 3: UPDATE USERS TABLE
-- ============================================

-- Remove old department-based users
DELETE FROM users WHERE user_id IN ('Admin@Sales', 'Admin@Accounts', 'Sales@Employee1', 'Sales@Employee2', 'Sales@Employee3');

-- Create Admin user
INSERT INTO users (user_id, password) 
VALUES ('Admin', 'Admin@123')
ON CONFLICT (user_id) DO UPDATE 
SET password = EXCLUDED.password,
    updated_at = NOW();

-- Create Employee users
INSERT INTO users (user_id, password) 
VALUES 
  ('Employee1', 'Employee1@123'),
  ('Employee2', 'Employee2@123'),
  ('Employee3', 'Employee3@123')
ON CONFLICT (user_id) DO UPDATE 
SET password = EXCLUDED.password,
    updated_at = NOW();

-- ============================================
-- PART 4: ADD TEST CUSTOMERS FOR TESTING
-- ============================================

-- Employee1 customers: a, b, c
INSERT INTO customers (name, sales_employee) 
VALUES 
  ('a', 'Employee1'),
  ('b', 'Employee1'),
  ('c', 'Employee1')
ON CONFLICT (name, sales_employee) DO NOTHING;

-- Employee2 customers: d, e, f
INSERT INTO customers (name, sales_employee) 
VALUES 
  ('d', 'Employee2'),
  ('e', 'Employee2'),
  ('f', 'Employee2')
ON CONFLICT (name, sales_employee) DO NOTHING;

-- Employee3 customers: g, h, i
INSERT INTO customers (name, sales_employee) 
VALUES 
  ('g', 'Employee3'),
  ('h', 'Employee3'),
  ('i', 'Employee3')
ON CONFLICT (name, sales_employee) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES (Run these to verify)
-- ============================================

-- Verify customers table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'customers' 
-- ORDER BY ordinal_position;

-- Verify customers were created with correct sales_employee
-- SELECT name, sales_employee, created_at 
-- FROM customers 
-- WHERE sales_employee LIKE 'Sales@Employee%' 
-- ORDER BY sales_employee, name;

-- Verify quotation tables have status column
-- SELECT table_name, column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name IN ('quotes_mbcb', 'quotes_signages', 'quotes_paint') 
-- AND column_name = 'status'
-- ORDER BY table_name;

-- Verify all users
-- SELECT user_id, created_at, last_password_change 
-- FROM users 
-- ORDER BY user_id;

-- Verify Admin user is removed
-- SELECT user_id FROM users WHERE user_id = 'Admin';
-- Should return no rows

-- ============================================
-- END OF SCRIPT
-- ============================================

