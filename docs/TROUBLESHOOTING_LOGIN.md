# Troubleshooting Login Issues

## Common Login Errors

### Internal Server Error (500)

If you're getting an internal server error when trying to log in, check the following:

### 1. Environment Variables Missing

**Error**: "Server configuration error. Please contact administrator."

**Solution**: 
- Check that `.env.local` file exists in the project root
- Ensure it contains:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```

### 2. Database Connection Error

**Error**: "Database connection error. Please contact administrator."

**Solution**:
- Verify Supabase URL is correct
- Verify Service Role Key is correct
- Check Supabase project is active and accessible
- Check network connectivity

### 3. Users Table Not Found

**Error**: "Database error. Please try again later."

**Solution**:
- Run the database setup script: `docs/COMPLETE_DATABASE_SETUP.sql`
- Verify the `users` table exists in your Supabase database
- Check table structure matches expected schema

### 4. User Not Found

**Error**: "Invalid user ID or password"

**Solution**:
- Verify user exists in the `users` table
- Check `user_id` matches exactly (case-sensitive)
- Verify password matches exactly (case-sensitive)
- Default users should be:
  - Admin / Admin@123
  - Employee1 / Employee1@123
  - Employee2 / Employee2@123
  - Employee3 / Employee3@123

### 5. Check Server Logs

To see detailed error messages:

1. Check browser console for client-side errors
2. Check terminal/console where `npm run dev` is running
3. Look for error messages starting with "Login error:" or "Database fetch error:"

## Quick Fix Steps

1. **Verify Environment Variables**:
   ```bash
   # Check if .env.local exists
   ls -la .env.local
   
   # Verify variables are set (don't show actual values)
   grep -E "SUPABASE|NEXT_PUBLIC" .env.local
   ```

2. **Verify Database Setup**:
   - Go to Supabase SQL Editor
   - Run: `SELECT * FROM users;`
   - Should return at least 4 users (Admin, Employee1-3)

3. **Test Database Connection**:
   - In Supabase Dashboard, check if project is active
   - Verify API keys are correct
   - Test a simple query in SQL Editor

4. **Check Network**:
   - Ensure you can access Supabase dashboard
   - Check firewall/proxy settings
   - Verify CORS settings in Supabase

## Expected User Table Structure

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Default Users

After running `COMPLETE_DATABASE_SETUP.sql`, these users should exist:

| User ID | Password |
|---------|----------|
| Admin | Admin@123 |
| Employee1 | Employee1@123 |
| Employee2 | Employee2@123 |
| Employee3 | Employee3@123 |

## Still Having Issues?

1. Check the terminal output for detailed error messages
2. Check browser DevTools Console for client-side errors
3. Check browser Network tab for API response details
4. Verify Supabase project is not paused or deleted
5. Ensure you're using the correct Supabase project URL and keys

