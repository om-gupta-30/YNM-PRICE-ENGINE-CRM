# Fix for /api/quotes 500 Error

## Issue
The `/api/quotes` endpoint is returning a 500 Internal Server Error.

## Most Likely Causes

### 1. Quotes Tables Don't Exist
The `quotes_mbcb`, `quotes_signages`, or `quotes_paint` tables might not exist in your database.

**Fix**: Run the database setup script:
- Go to Supabase SQL Editor
- Run: `docs/COMPLETE_DATABASE_SETUP.sql`
- This creates all necessary tables

### 2. Missing Columns
The tables might exist but be missing required columns.

**Fix**: Check table structure in Supabase:
```sql
-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quotes_mbcb';
```

### 3. Database Connection Issue
Supabase connection might be failing.

**Fix**: 
- Check `.env.local` has correct credentials
- Restart dev server after updating `.env.local`
- Test connection at `/api/test-db`

## What I Fixed

1. ✅ Removed `account_id` from SELECT queries (column might not exist)
2. ✅ Added better error logging to show exact error codes
3. ✅ Added error handling for Supabase client creation
4. ✅ Enhanced error messages to show code, details, and hints

## Check Terminal Output

When the error occurs, check your terminal for:
```
Error fetching quotes from quotes_mbcb: ...
Error code: ...
Error details: ...
Error hint: ...
```

This will tell you exactly what's wrong.

## Quick Test

1. Visit: `http://localhost:3000/api/test-db`
2. This will show if database connection works
3. Check terminal for detailed error messages

## Next Steps

1. **Check if tables exist**:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'quotes%';
   ```

2. **If tables don't exist**, run `COMPLETE_DATABASE_SETUP.sql`

3. **If tables exist but error persists**, check terminal output for the exact error code and message

