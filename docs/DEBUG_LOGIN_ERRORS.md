# Debug Login Errors - Step by Step Guide

## Step 1: Test Database Connection

I've created a test endpoint. After restarting your dev server, visit:

```
http://localhost:3000/api/test-db
```

Or if running on port 3001:
```
http://localhost:3001/api/test-db
```

This will show you:
- ✅ If environment variables are loaded
- ✅ If Supabase connection works
- ✅ If the `users` table exists
- ✅ What users are in the database

## Step 2: Check Terminal Output

When you try to log in, check your terminal for detailed error messages. Look for:

```
Database fetch error: ...
Error code: ...
Error message: ...
```

## Step 3: Common Issues and Fixes

### Issue 1: "Users table does not exist"

**Error Code**: `42P01` or message contains "does not exist"

**Fix**:
1. Go to your Supabase Dashboard
2. Open SQL Editor
3. Run the script: `docs/COMPLETE_DATABASE_SETUP.sql`
4. Verify table exists: `SELECT * FROM users;`

### Issue 2: "Missing environment variables"

**Fix**:
1. Make sure `.env.local` exists in project root
2. Restart your dev server after creating/updating `.env.local`
3. Check file has no spaces around `=` signs

### Issue 3: "Database connection error"

**Fix**:
1. Verify Supabase URL is correct
2. Verify Service Role Key is correct
3. Check Supabase project is active (not paused)
4. Check your internet connection

### Issue 4: "No rows returned" but table exists

**Fix**:
1. Check if users exist: `SELECT * FROM users;` in Supabase SQL Editor
2. If no users, run the INSERT statements from `COMPLETE_DATABASE_SETUP.sql`
3. Verify usernames match exactly (case-sensitive)

## Step 4: Verify Database Setup

Run this in Supabase SQL Editor:

```sql
-- Check if users table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'users'
);

-- Check users in table
SELECT id, username, password FROM users;

-- If table doesn't exist or is empty, run:
-- docs/COMPLETE_DATABASE_SETUP.sql
```

## Step 5: Restart Dev Server

**IMPORTANT**: After any changes to `.env.local`, you MUST restart the dev server:

```bash
# Stop server (Ctrl+C)
# Then restart:
npm run dev
```

## What to Share for Help

If still having issues, share:

1. **Output from `/api/test-db` endpoint** - This shows connection status
2. **Terminal error messages** - When you try to log in
3. **Result of SQL query**: `SELECT * FROM users;` in Supabase
4. **Whether you've run `COMPLETE_DATABASE_SETUP.sql`**

