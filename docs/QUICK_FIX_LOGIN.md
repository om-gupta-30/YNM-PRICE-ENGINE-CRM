# Quick Fix for Login Database Error

## Most Likely Issue: Users Table Not Set Up

The database error is most likely because the `users` table doesn't exist or is empty.

## Quick Fix (5 minutes)

### 1. Go to Supabase Dashboard
- Visit: https://app.supabase.com
- Select your project

### 2. Open SQL Editor
- Click "SQL Editor" in the left sidebar
- Click "New query"

### 3. Run Database Setup
Copy and paste the entire contents of:
```
docs/COMPLETE_DATABASE_SETUP.sql
```

Then click "Run" or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

### 4. Verify Users Exist
Run this query:
```sql
SELECT * FROM users;
```

You should see 4 users:
- Admin
- Employee1
- Employee2
- Employee3

### 5. Restart Your Dev Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 6. Test Login
Try logging in with:
- **Admin** / **Admin@123**
- **Employee1** / **Employee1@123**

## If Still Not Working

### Test Database Connection
Visit: `http://localhost:3000/api/test-db` (or port 3001)

This will show you exactly what's wrong.

### Check Terminal
When you try to log in, check the terminal output. It will show:
- Error codes
- Error messages
- What's missing

## Common Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| "Database not configured" | Table doesn't exist | Run `COMPLETE_DATABASE_SETUP.sql` |
| "Invalid user ID or password" | User doesn't exist | Check users table, run setup script |
| "Server configuration error" | Missing env variables | Check `.env.local` file |
| "Database connection error" | Can't connect to Supabase | Check URL and keys in `.env.local` |

