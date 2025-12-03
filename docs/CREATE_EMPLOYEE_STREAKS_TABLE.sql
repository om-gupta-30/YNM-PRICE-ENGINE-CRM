-- Migration: Create employee_streaks table for tracking daily activity streaks
-- This table stores streak counts and last activity dates for employees

DO $$
BEGIN
  -- Create employee_streaks table if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'employee_streaks'
  ) THEN
    CREATE TABLE employee_streaks (
      employee TEXT PRIMARY KEY,
      streak_count INTEGER DEFAULT 0,
      last_activity_date DATE
    );

    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_employee_streaks_employee 
      ON employee_streaks(employee);
  END IF;
END $$;
