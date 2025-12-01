-- Create Simple Users for YNM Safety System
-- Admin with password Admin@123
-- Employee1, Employee2, Employee3 with passwords Employee1@123, Employee2@123, Employee3@123

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

-- Update existing customers to be assigned to Admin (for migration)
UPDATE customers 
SET sales_employee = 'Admin' 
WHERE sales_employee IN ('Admin@Sales', 'Sales@Employee1', 'Sales@Employee2', 'Sales@Employee3')
   OR sales_employee IS NULL;

-- Update existing quotations created_by to new usernames
UPDATE quotes_mbcb 
SET created_by = CASE 
  WHEN created_by = 'Admin@Sales' THEN 'Admin'
  WHEN created_by = 'Sales@Employee1' THEN 'Employee1'
  WHEN created_by = 'Sales@Employee2' THEN 'Employee2'
  WHEN created_by = 'Sales@Employee3' THEN 'Employee3'
  ELSE created_by
END;

UPDATE quotes_signages 
SET created_by = CASE 
  WHEN created_by = 'Admin@Sales' THEN 'Admin'
  WHEN created_by = 'Sales@Employee1' THEN 'Employee1'
  WHEN created_by = 'Sales@Employee2' THEN 'Employee2'
  WHEN created_by = 'Sales@Employee3' THEN 'Employee3'
  ELSE created_by
END;

UPDATE quotes_paint 
SET created_by = CASE 
  WHEN created_by = 'Admin@Sales' THEN 'Admin'
  WHEN created_by = 'Sales@Employee1' THEN 'Employee1'
  WHEN created_by = 'Sales@Employee2' THEN 'Employee2'
  WHEN created_by = 'Sales@Employee3' THEN 'Employee3'
  ELSE created_by
END;

-- Verify all users were created
-- SELECT user_id, created_at, last_password_change FROM users ORDER BY user_id;

