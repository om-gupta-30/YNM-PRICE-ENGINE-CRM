# Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## How to Get Your Supabase Credentials

1. **Go to your Supabase Dashboard**: https://app.supabase.com
2. **Select your project**
3. **Go to Settings → API**
4. **Copy the following**:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → Use for `SUPABASE_SERVICE_ROLE_KEY`

## Important Notes

- ⚠️ **Never commit `.env.local` to git** (it's already in `.gitignore`)
- ⚠️ **Service Role Key is sensitive** - Keep it secret, never expose it to the client
- ✅ **Anon Key is safe** - Can be exposed to the client (it's in `NEXT_PUBLIC_`)

## Verification

After setting up `.env.local`:

1. Restart your Next.js dev server
2. Check terminal for any environment variable warnings
3. Try logging in - errors should be more specific now

## Troubleshooting

### "Missing Supabase environment variables"
- Check that `.env.local` exists in project root
- Verify all three variables are set
- Restart the dev server after creating/updating `.env.local`

### "Database connection error"
- Verify Supabase URL is correct (should end with `.supabase.co`)
- Verify Service Role Key is correct (starts with `eyJ...`)
- Check Supabase project is active (not paused)

### "Users table does not exist"
- Run the database setup script: `docs/COMPLETE_DATABASE_SETUP.sql`
- Execute it in Supabase SQL Editor
- Verify table exists: `SELECT * FROM users;`

