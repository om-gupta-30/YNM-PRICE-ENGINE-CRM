-- ============================================
-- PASSWORD RECOVERY QUERIES FOR SUPABASE
-- ============================================
-- Use these queries in Supabase SQL Editor to view and manage passwords

-- ============================================
-- 1. VIEW ALL USERS AND THEIR PASSWORDS
-- ============================================
-- This query shows all users with their passwords in plain text
SELECT 
  id,
  user_id,
  password,
  created_at,
  updated_at,
  last_password_change
FROM users
ORDER BY user_id;

-- ============================================
-- 2. FIND A SPECIFIC USER'S PASSWORD
-- ============================================
-- Replace 'Admin' with the actual user_id you're looking for
SELECT 
  user_id,
  password,
  created_at,
  last_password_change
FROM users 
WHERE user_id = 'Admin';

-- ============================================
-- 3. RESET A USER'S PASSWORD
-- ============================================
-- Replace 'Admin' with the user_id and 'NewPassword123' with the desired password
UPDATE users 
SET password = 'NewPassword123', 
    last_password_change = NOW(),
    updated_at = NOW()
WHERE user_id = 'Admin';

-- Verify the password was updated:
-- SELECT user_id, password, last_password_change FROM users WHERE user_id = 'Admin';

-- ============================================
-- 4. ADD A NEW USER
-- ============================================
-- Replace 'NewUser' with the desired user_id and 'NewPassword123' with the password
INSERT INTO users (user_id, password) 
VALUES ('NewUser', 'NewPassword123')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 5. DELETE A USER
-- ============================================
-- Replace 'UsernameToDelete' with the user_id to delete
-- DELETE FROM users WHERE user_id = 'UsernameToDelete';

-- ============================================
-- 6. UPDATE AN EXISTING USER'S PASSWORD
-- ============================================
-- Replace 'Admin' with the user_id and 'NewPassword123' with the new password
UPDATE users 
SET password = 'NewPassword123',
    last_password_change = NOW()
WHERE user_id = 'Admin';

-- ============================================
-- 7. LIST ALL USER IDs (without passwords)
-- ============================================
SELECT user_id, created_at, last_password_change
FROM users
ORDER BY user_id;

-- ============================================
-- 8. SEARCH FOR USERS (partial match)
-- ============================================
-- Find users whose user_id contains 'Admin'
SELECT user_id, password, created_at
FROM users
WHERE user_id ILIKE '%Admin%'
ORDER BY user_id;

-- ============================================
-- 9. CHECK IF A USER EXISTS
-- ============================================
-- Returns true if user exists, false otherwise
SELECT EXISTS(
  SELECT 1 FROM users WHERE user_id = 'Admin'
) AS user_exists;

-- ============================================
-- 10. COUNT TOTAL USERS
-- ============================================
SELECT COUNT(*) AS total_users FROM users;

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. Passwords are stored in PLAIN TEXT for recovery purposes
-- 2. Only authorized administrators should have access to the database
-- 3. Always verify user identity before revealing passwords
-- 4. Consider logging password recovery actions for audit purposes

