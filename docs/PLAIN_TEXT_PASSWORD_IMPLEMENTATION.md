# Plain Text Password Implementation

## ✅ What Has Been Changed

The authentication system has been updated to store passwords in **plain text** format in the database, allowing administrators to view and recover passwords when users forget them.

### Changes Made:

1. **Database Schema** (`docs/supabase-users-schema.sql`)
   - Changed column from `password_hash` to `password` (TEXT)
   - Passwords are now stored in plain text

2. **Login API** (`app/api/auth/login/route.ts`)
   - Removed bcrypt hashing
   - Now compares passwords directly (plain text)

3. **Change Password API** (`app/api/auth/change-password/route.ts`)
   - Removed bcrypt hashing
   - Stores new password in plain text

4. **SQL Migration Scripts**
   - `docs/SUPABASE_MIGRATE_TO_PLAIN_TEXT_PASSWORD.sql` - Migration guide
   - `docs/SUPABASE_PASSWORD_RECOVERY_QUERIES.sql` - Recovery queries

## 📋 Supabase Setup Instructions

### If You're Starting Fresh:

Run this SQL in Supabase SQL Editor:

```sql
-- Create users table with plain text password
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- Insert default admin user
INSERT INTO users (user_id, password) 
VALUES ('Admin', 'Admin@123')
ON CONFLICT (user_id) DO NOTHING;
```

### If You Already Have the Table with password_hash:

Run the migration script from `docs/SUPABASE_MIGRATE_TO_PLAIN_TEXT_PASSWORD.sql`:

```sql
-- Step 1: Add password column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Step 2: Set default password (users will need to change it)
UPDATE users 
SET password = 'TempPassword123' 
WHERE password IS NULL OR password = '';

-- Step 3: Make password NOT NULL
ALTER TABLE users 
ALTER COLUMN password SET NOT NULL;

-- Step 4: Remove old password_hash column
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
```

## 🔍 Password Recovery Queries

### View All Users and Passwords:

```sql
SELECT 
  id,
  user_id,
  password,
  created_at,
  last_password_change
FROM users
ORDER BY user_id;
```

### Find a Specific User's Password:

```sql
SELECT user_id, password 
FROM users 
WHERE user_id = 'Admin';
```

### Reset a User's Password:

```sql
UPDATE users 
SET password = 'NewPassword123', 
    last_password_change = NOW()
WHERE user_id = 'Admin';
```

### Add a New User:

```sql
INSERT INTO users (user_id, password) 
VALUES ('NewUser', 'NewPassword123')
ON CONFLICT (user_id) DO NOTHING;
```

### Delete a User:

```sql
DELETE FROM users WHERE user_id = 'UsernameToDelete';
```

## 📁 Files Reference

All password recovery queries are available in:
- **`docs/SUPABASE_PASSWORD_RECOVERY_QUERIES.sql`** - Complete list of queries

## ⚠️ Important Notes

1. **Security**: Passwords are stored in plain text - only authorized administrators should have database access
2. **Recovery**: You can now view any user's password directly from the database
3. **Default Password**: Admin user has password `Admin@123` (change after first login)
4. **No Hashing**: Passwords are no longer hashed - they're stored exactly as entered

## 🚀 Testing

1. **Login**: Use User ID `Admin` and Password `Admin@123`
2. **View Password**: Run `SELECT user_id, password FROM users WHERE user_id = 'Admin';` in Supabase
3. **Change Password**: Use the Change Password page in the app
4. **Verify**: Check the database to see the new password in plain text

## 🔧 Implementation Details

- **Login**: Compares entered password directly with database password
- **Change Password**: Stores new password in plain text
- **No Encryption**: Passwords are stored as-is for easy recovery
- **Database Access**: Only authorized personnel should have Supabase access

