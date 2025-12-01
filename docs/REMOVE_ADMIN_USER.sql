-- Remove Admin user from the system
-- This script deletes the Admin user with password Admin@123

-- Delete Admin user
DELETE FROM users 
WHERE user_id = 'Admin' AND password = 'Admin@123';

-- Verify the user was deleted:
-- SELECT user_id, created_at FROM users WHERE user_id = 'Admin';
-- Should return no rows

-- If you want to verify all remaining users:
-- SELECT user_id, created_at, last_password_change FROM users ORDER BY user_id;

