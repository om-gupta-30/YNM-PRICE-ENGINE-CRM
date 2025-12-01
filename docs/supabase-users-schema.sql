-- Users Table for YNM Safety Price Engine
-- Run this SQL in your Supabase SQL Editor to create the users table

-- Users table with password storage (plain text for recovery purposes)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- Add comment
COMMENT ON TABLE users IS 'Stores user credentials for authentication';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: Admin@123)
-- Password is stored in plain text for recovery purposes
INSERT INTO users (user_id, password) 
VALUES ('Admin', 'Admin@123')
ON CONFLICT (user_id) DO NOTHING;

-- Verify the user was created:
-- SELECT user_id, password, created_at, last_password_change FROM users WHERE user_id = 'Admin';

