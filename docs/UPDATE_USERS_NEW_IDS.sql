-- ============================================
-- UPDATE USERS TO NEW IDS
-- ============================================
-- Run this script in Supabase SQL Editor
-- This will:
-- 1. Delete old users (Employee1, Employee2, Employee3, swamymahesh, mahesh)
-- 2. Keep Admin user
-- 3. Create new Sales employees
-- 4. Create new Data Analysts
-- ============================================

-- Step 1: Delete old users (keep Admin)
DELETE FROM users 
WHERE username IN ('Employee1', 'Employee2', 'Employee3', 'swamymahesh', 'mahesh');

-- Step 2: Ensure Admin exists with correct password
UPDATE users 
SET password = 'Admin@123'
WHERE username = 'Admin';

-- Insert Admin if doesn't exist
INSERT INTO users (username, password)
SELECT 'Admin', 'Admin@123'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'Admin');

-- Step 3: Create new Sales Employee users
INSERT INTO users (username, password)
VALUES 
  ('Sales_Shweta', 'Shweta@123'),
  ('Sales_Saumya', 'Saumya@123'),
  ('Sales_Nagender', 'Nagender@123'),
  ('Sales_Abhijeet', 'Abhijeet@123')
ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;

-- Step 4: Create new Data Analyst users
INSERT INTO users (username, password)
VALUES 
  ('DataAnalyst_SwamyMahesh', 'SwamyMahesh@123'),
  ('DataAnalyst_Mahesh', 'Mahesh@123')
ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;

-- Step 5: Update existing data (SAFE - only runs if column exists)

-- Update accounts table (assigned_employee column)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'assigned_employee') THEN
    UPDATE accounts SET assigned_employee = 'Sales_Shweta' WHERE assigned_employee = 'Employee1';
    UPDATE accounts SET assigned_employee = 'Sales_Saumya' WHERE assigned_employee = 'Employee2';
    UPDATE accounts SET assigned_employee = 'Sales_Nagender' WHERE assigned_employee = 'Employee3';
    RAISE NOTICE 'Updated accounts.assigned_employee';
  END IF;
END $$;

-- Update sub_accounts table (assigned_employee column)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sub_accounts' AND column_name = 'assigned_employee') THEN
    UPDATE sub_accounts SET assigned_employee = 'Sales_Shweta' WHERE assigned_employee = 'Employee1';
    UPDATE sub_accounts SET assigned_employee = 'Sales_Saumya' WHERE assigned_employee = 'Employee2';
    UPDATE sub_accounts SET assigned_employee = 'Sales_Nagender' WHERE assigned_employee = 'Employee3';
    RAISE NOTICE 'Updated sub_accounts.assigned_employee';
  END IF;
END $$;

-- Update activities table (employee_id column)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'employee_id') THEN
    UPDATE activities SET employee_id = 'Sales_Shweta' WHERE employee_id = 'Employee1';
    UPDATE activities SET employee_id = 'Sales_Saumya' WHERE employee_id = 'Employee2';
    UPDATE activities SET employee_id = 'Sales_Nagender' WHERE employee_id = 'Employee3';
    UPDATE activities SET employee_id = 'DataAnalyst_SwamyMahesh' WHERE employee_id = 'swamymahesh';
    UPDATE activities SET employee_id = 'DataAnalyst_Mahesh' WHERE employee_id = 'mahesh';
    RAISE NOTICE 'Updated activities.employee_id';
  END IF;
END $$;

-- Update leads table (assigned_to column)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'assigned_to') THEN
    UPDATE leads SET assigned_to = 'Sales_Shweta' WHERE assigned_to = 'Employee1';
    UPDATE leads SET assigned_to = 'Sales_Saumya' WHERE assigned_to = 'Employee2';
    UPDATE leads SET assigned_to = 'Sales_Nagender' WHERE assigned_to = 'Employee3';
    RAISE NOTICE 'Updated leads.assigned_to';
  END IF;
END $$;

-- Update tasks table (assigned_to column)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'assigned_to') THEN
    UPDATE tasks SET assigned_to = 'Sales_Shweta' WHERE assigned_to = 'Employee1';
    UPDATE tasks SET assigned_to = 'Sales_Saumya' WHERE assigned_to = 'Employee2';
    UPDATE tasks SET assigned_to = 'Sales_Nagender' WHERE assigned_to = 'Employee3';
    RAISE NOTICE 'Updated tasks.assigned_to';
  END IF;
END $$;

-- Update customers table (sales_employee and created_by columns)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'sales_employee') THEN
    UPDATE customers SET sales_employee = 'Sales_Shweta' WHERE sales_employee = 'Employee1';
    UPDATE customers SET sales_employee = 'Sales_Saumya' WHERE sales_employee = 'Employee2';
    UPDATE customers SET sales_employee = 'Sales_Nagender' WHERE sales_employee = 'Employee3';
    RAISE NOTICE 'Updated customers.sales_employee';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'created_by') THEN
    UPDATE customers SET created_by = 'Sales_Shweta' WHERE created_by = 'Employee1';
    UPDATE customers SET created_by = 'Sales_Saumya' WHERE created_by = 'Employee2';
    UPDATE customers SET created_by = 'Sales_Nagender' WHERE created_by = 'Employee3';
    RAISE NOTICE 'Updated customers.created_by';
  END IF;
END $$;

-- Update quotations table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'created_by') THEN
      UPDATE quotations SET created_by = 'Sales_Shweta' WHERE created_by = 'Employee1';
      UPDATE quotations SET created_by = 'Sales_Saumya' WHERE created_by = 'Employee2';
      UPDATE quotations SET created_by = 'Sales_Nagender' WHERE created_by = 'Employee3';
      RAISE NOTICE 'Updated quotations.created_by';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'sales_employee') THEN
      UPDATE quotations SET sales_employee = 'Sales_Shweta' WHERE sales_employee = 'Employee1';
      UPDATE quotations SET sales_employee = 'Sales_Saumya' WHERE sales_employee = 'Employee2';
      UPDATE quotations SET sales_employee = 'Sales_Nagender' WHERE sales_employee = 'Employee3';
      RAISE NOTICE 'Updated quotations.sales_employee';
    END IF;
  END IF;
END $$;

-- Update employee_streaks table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_streaks') THEN
    UPDATE employee_streaks SET employee = 'Sales_Shweta' WHERE employee = 'Employee1';
    UPDATE employee_streaks SET employee = 'Sales_Saumya' WHERE employee = 'Employee2';
    UPDATE employee_streaks SET employee = 'Sales_Nagender' WHERE employee = 'Employee3';
    RAISE NOTICE 'Updated employee_streaks';
  END IF;
END $$;

-- Update employee_notifications table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_notifications') THEN
    UPDATE employee_notifications SET employee = 'Sales_Shweta' WHERE employee = 'Employee1';
    UPDATE employee_notifications SET employee = 'Sales_Saumya' WHERE employee = 'Employee2';
    UPDATE employee_notifications SET employee = 'Sales_Nagender' WHERE employee = 'Employee3';
    RAISE NOTICE 'Updated employee_notifications';
  END IF;
END $$;

-- Step 6: Verify the changes
SELECT 'USERS TABLE:' as info;
SELECT username, password FROM users ORDER BY username;

-- ============================================
-- USER CREDENTIALS SUMMARY
-- ============================================
-- 
-- ADMIN PORTAL:
--   Username: Admin
--   Password: Admin@123
--
-- SALES EMPLOYEES (Employee Portal):
--   Username: Sales_Shweta      Password: Shweta@123
--   Username: Sales_Saumya      Password: Saumya@123
--   Username: Sales_Nagender    Password: Nagender@123
--   Username: Sales_Abhijeet    Password: Abhijeet@123
--
-- DATA ANALYSTS (Admin Portal with restrictions):
--   Username: DataAnalyst_SwamyMahesh    Password: SwamyMahesh@123
--   Username: DataAnalyst_Mahesh         Password: Mahesh@123
--
-- ============================================
