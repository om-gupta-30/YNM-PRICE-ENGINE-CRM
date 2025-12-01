-- ============================================
-- IMMEDIATE FIX - Run this in Supabase SQL Editor
-- ============================================
-- This will convert your database from password_hash to password (plain text)

-- Step 1: Add password column (if it doesn't exist)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Step 2: Set all passwords to 'Admin@123' (plain text)
-- Since we can't decrypt the hash, we'll reset all passwords
UPDATE users 
SET password = 'Admin@123';

-- Step 3: Make password column NOT NULL
ALTER TABLE users 
ALTER COLUMN password SET NOT NULL;

-- Step 4: Remove the old password_hash column
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- Step 5: Verify - you should see 'Admin@123' in plain text (NOT a hash)
SELECT 
  id,
  user_id,
  password,
  created_at
FROM users;

-- ============================================
-- If you see 'Admin@123' (plain text) above, you're done!
-- If you still see a hash like $2a$10$..., run the steps again
-- ============================================

