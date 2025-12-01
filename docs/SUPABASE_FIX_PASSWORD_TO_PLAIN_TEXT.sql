-- ============================================
-- IMMEDIATE FIX: Convert password_hash to password (plain text)
-- ============================================
-- Run this ENTIRE script in Supabase SQL Editor to fix the password issue

-- Step 1: Add password column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Step 2: Set all passwords to default 'Admin@123' (plain text)
-- This will reset all existing passwords to Admin@123
UPDATE users 
SET password = 'Admin@123'
WHERE password IS NULL OR password = '';

-- Step 3: If password column is NULL, set it to default
UPDATE users 
SET password = 'Admin@123'
WHERE password IS NULL;

-- Step 4: Make password column NOT NULL
ALTER TABLE users 
ALTER COLUMN password SET NOT NULL;

-- Step 5: Remove the old password_hash column completely
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- Step 6: Verify the fix - you should see plain text passwords
SELECT 
  id,
  user_id,
  password,
  created_at,
  last_password_change
FROM users
ORDER BY id;

-- ============================================
-- If the above doesn't work, try this alternative:
-- ============================================

-- Option A: If password_hash column exists, copy it to password (but you'll need to reset)
-- First, drop password column if it exists
-- ALTER TABLE users DROP COLUMN IF EXISTS password;

-- Add password column
-- ALTER TABLE users ADD COLUMN password TEXT;

-- Set all passwords to Admin@123 (since we can't decrypt hash)
-- UPDATE users SET password = 'Admin@123';

-- Make it NOT NULL
-- ALTER TABLE users ALTER COLUMN password SET NOT NULL;

-- Drop password_hash
-- ALTER TABLE users DROP COLUMN password_hash;

-- ============================================
-- FINAL VERIFICATION:
-- ============================================
-- After running the script, verify with this query:
-- You should see 'Admin@123' in plain text, NOT a hash

SELECT user_id, password FROM users WHERE user_id = 'Admin';

-- If you see a hash like $2a$10$..., the migration didn't work
-- If you see 'Admin@123', it's working correctly!

