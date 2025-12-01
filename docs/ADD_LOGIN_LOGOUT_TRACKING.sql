-- ============================================
-- ADD LOGIN/LOGOUT TIME TRACKING
-- This script adds login_time and logout_time columns to users table
-- ============================================

-- Add login_time and logout_time columns to users table
DO $$
BEGIN
  -- Add login_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'login_time'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN login_time TIMESTAMP WITH TIME ZONE;
    
    RAISE NOTICE 'Added login_time column to users table';
  ELSE
    RAISE NOTICE 'login_time column already exists in users table';
  END IF;

  -- Add logout_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'logout_time'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN logout_time TIMESTAMP WITH TIME ZONE;
    
    RAISE NOTICE 'Added logout_time column to users table';
  ELSE
    RAISE NOTICE 'logout_time column already exists in users table';
  END IF;

  -- Add last_login column (for tracking last login time)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    
    RAISE NOTICE 'Added last_login column to users table';
  ELSE
    RAISE NOTICE 'last_login column already exists in users table';
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_login_time ON users(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_users_logout_time ON users(logout_time DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  'Users Table - Login/Logout Tracking Columns' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'login_time'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'logout_time'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_login'
    ) THEN '✅ All columns exist'
    ELSE '❌ Some columns missing'
  END as status;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅ Login/logout tracking columns added successfully to users table!' as result;
