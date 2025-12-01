# 🚨 URGENT: Fix RLS Errors

## The Problem

You're getting "Internal server error" because **Row Level Security (RLS) is blocking access** to your tables.

## Quick Fix (2 minutes)

### Step 1: Go to Supabase SQL Editor
1. Open your Supabase Dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Run This Script

Copy and paste this ENTIRE script and run it:

```sql
-- DISABLE RLS ON ALL TABLES (Recommended for server-side API)
-- This allows your service_role key to access all tables

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes_mbcb DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes_signages DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes_paint DISABLE ROW LEVEL SECURITY;
ALTER TABLE places_of_supply DISABLE ROW LEVEL SECURITY;
ALTER TABLE purposes DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_customer DISABLE ROW LEVEL SECURITY;
```

### Step 3: Verify

After running the script, test your APIs:
1. Visit: `http://localhost:3000/api/test-tables`
2. This will show you which tables are accessible
3. All tables should show `"exists": true, "accessible": true`

### Step 4: Restart Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

## Why This Works

- Your server uses `SUPABASE_SERVICE_ROLE_KEY` which has admin access
- RLS was enabled on tables, blocking even the service role
- Disabling RLS allows the service role to access all tables
- This is safe because only your server-side code uses the service role key

## Alternative: Keep RLS Enabled

If you want to keep RLS enabled for security, you need to create policies for each table. But for server-side APIs using service_role, disabling RLS is simpler and recommended.

## Test After Fix

1. **Login**: Should work now
2. **Quotes API**: Should return data (even if empty)
3. **Dashboard**: Should load without errors
4. **Notifications**: Should work (even if empty)

## Still Having Issues?

Run the test endpoint:
```
http://localhost:3000/api/test-tables
```

This will show you exactly which tables have issues and what the errors are.

