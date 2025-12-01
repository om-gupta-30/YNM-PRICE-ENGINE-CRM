-- Migration Script: Convert password_hash to password (plain text)
-- Run this SQL in your Supabase SQL Editor to migrate existing data

-- Step 1: Add new password column (if it doesn't exist)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Step 2: If you have existing hashed passwords and want to reset them:
-- Option A: Set default password for all users (if you know the original passwords)
-- UPDATE users SET password = 'Admin@123' WHERE user_id = 'Admin';

-- Option B: If you don't know the original passwords, you'll need to reset them manually
-- For now, we'll set a default password that users must change on first login
-- UPDATE users SET password = 'TempPassword123' WHERE password IS NULL;

-- Step 3: Remove the old password_hash column (optional - only if you want to clean up)
-- ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- Step 4: Rename password_hash to password (if you want to keep the column name)
-- ALTER TABLE users RENAME COLUMN password_hash TO password;

-- ============================================
-- RECOMMENDED APPROACH (Fresh Start):
-- ============================================
-- If you're starting fresh or want to reset everything:

-- 1. Drop the old column if it exists
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- 2. Ensure password column exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '';

-- 3. Update existing users with default password
UPDATE users 
SET password = 'Admin@123' 
WHERE user_id = 'Admin' AND (password IS NULL OR password = '');

-- 4. Verify the migration
SELECT id, user_id, password, created_at, last_password_change 
FROM users 
ORDER BY id;

-- ============================================
-- QUERIES FOR PASSWORD RECOVERY:
-- ============================================

-- View all users and their passwords (for recovery purposes)
SELECT 
  id,
  user_id,
  password,
  created_at,
  updated_at,
  last_password_change
FROM users
ORDER BY user_id;

-- Find a specific user's password
SELECT user_id, password 
FROM users 
WHERE user_id = 'Admin';

-- Reset a user's password (replace 'NewPassword123' with the desired password)
-- UPDATE users 
-- SET password = 'NewPassword123', 
--     last_password_change = NOW()
-- WHERE user_id = 'Admin';

-- Add a new user
-- INSERT INTO users (user_id, password) 
-- VALUES ('NewUser', 'NewPassword123')
-- ON CONFLICT (user_id) DO NOTHING;

-- Delete a user
-- DELETE FROM users WHERE user_id = 'UsernameToDelete';

