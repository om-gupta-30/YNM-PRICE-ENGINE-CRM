-- ============================================
-- UPDATE TO SIMPLE USERNAMES
-- This script updates the system to use simple usernames:
-- Admin / Admin@123
-- Employee1 / Employee1@123
-- Employee2 / Employee2@123
-- Employee3 / Employee3@123
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

-- Update existing customers sales_employee to new usernames
UPDATE customers 
SET sales_employee = CASE 
  WHEN sales_employee = 'Admin@Sales' THEN 'Admin'
  WHEN sales_employee = 'Sales@Employee1' THEN 'Employee1'
  WHEN sales_employee = 'Sales@Employee2' THEN 'Employee2'
  WHEN sales_employee = 'Sales@Employee3' THEN 'Employee3'
  WHEN sales_employee IS NULL THEN 'Admin'
  ELSE sales_employee
END;

-- Update existing quotations created_by to new usernames
UPDATE quotes_mbcb 
SET created_by = CASE 
  WHEN created_by = 'Admin@Sales' THEN 'Admin'
  WHEN created_by = 'Sales@Employee1' THEN 'Employee1'
  WHEN created_by = 'Sales@Employee2' THEN 'Employee2'
  WHEN created_by = 'Sales@Employee3' THEN 'Employee3'
  ELSE created_by
END
WHERE created_by IN ('Admin@Sales', 'Sales@Employee1', 'Sales@Employee2', 'Sales@Employee3');

UPDATE quotes_signages 
SET created_by = CASE 
  WHEN created_by = 'Admin@Sales' THEN 'Admin'
  WHEN created_by = 'Sales@Employee1' THEN 'Employee1'
  WHEN created_by = 'Sales@Employee2' THEN 'Employee2'
  WHEN created_by = 'Sales@Employee3' THEN 'Employee3'
  ELSE created_by
END
WHERE created_by IN ('Admin@Sales', 'Sales@Employee1', 'Sales@Employee2', 'Sales@Employee3');

UPDATE quotes_paint 
SET created_by = CASE 
  WHEN created_by = 'Admin@Sales' THEN 'Admin'
  WHEN created_by = 'Sales@Employee1' THEN 'Employee1'
  WHEN created_by = 'Sales@Employee2' THEN 'Employee2'
  WHEN created_by = 'Sales@Employee3' THEN 'Employee3'
  ELSE created_by
END
WHERE created_by IN ('Admin@Sales', 'Sales@Employee1', 'Sales@Employee2', 'Sales@Employee3');

-- Update test customers to new usernames
UPDATE customers 
SET sales_employee = 'Employee1' 
WHERE name IN ('a', 'b', 'c') AND sales_employee IN ('Sales@Employee1', 'Employee1');

UPDATE customers 
SET sales_employee = 'Employee2' 
WHERE name IN ('d', 'e', 'f') AND sales_employee IN ('Sales@Employee2', 'Employee2');

UPDATE customers 
SET sales_employee = 'Employee3' 
WHERE name IN ('g', 'h', 'i') AND sales_employee IN ('Sales@Employee3', 'Employee3');

-- Verify all users
-- SELECT user_id, created_at, last_password_change FROM users ORDER BY user_id;

-- Verify customers updated
-- SELECT name, sales_employee FROM customers WHERE sales_employee IN ('Admin', 'Employee1', 'Employee2', 'Employee3') ORDER BY sales_employee, name;

