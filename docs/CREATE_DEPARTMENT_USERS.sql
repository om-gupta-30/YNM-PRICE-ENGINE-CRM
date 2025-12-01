-- Create Department-Based Users for YNM Safety System
-- This script creates users for Sales and Accounts departments
-- NOTE: Admin user with Admin@123 has been removed

-- Sales Department Users
INSERT INTO users (user_id, password) 
VALUES 
  ('Admin@Sales', 'Admin@Sales@123'),
  ('Sales@Employee1', 'Sales@Employee1@123'),
  ('Sales@Employee2', 'Sales@Employee2@123'),
  ('Sales@Employee3', 'Sales@Employee3@123')
ON CONFLICT (user_id) DO UPDATE 
SET password = EXCLUDED.password,
    updated_at = NOW();

-- Accounts Department Users
INSERT INTO users (user_id, password) 
VALUES 
  ('Admin@Accounts', 'Admin@Accounts@123')
ON CONFLICT (user_id) DO UPDATE 
SET password = EXCLUDED.password,
    updated_at = NOW();

-- Verify all users were created:
-- SELECT user_id, created_at, last_password_change FROM users ORDER BY user_id;

-- Note: Passwords are stored in plain text for password recovery purposes
-- Note: Admin user (Admin/Admin@123) should be removed using REMOVE_ADMIN_USER.sql

