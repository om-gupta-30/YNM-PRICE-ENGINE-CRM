# Database Setup Guide

This guide will help you set up the complete database for the YNM Safety Price Engine & CRM System.

## Quick Start

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Run the Complete Setup Script**
   - Open `docs/COMPLETE_DATABASE_SETUP.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

3. **Verify Setup**
   - Run the verification queries at the end of the script
   - Check that all tables are created
   - Verify initial data is inserted

## What Gets Created

### Tables
- ✅ `users` - User authentication
- ✅ `places_of_supply` - 28 Indian states
- ✅ `purposes` - Purpose options
- ✅ `customers` - Customer management
- ✅ `accounts` - Account management with engagement scoring
- ✅ `contacts` - Contacts under accounts
- ✅ `activities` - Activity tracking
- ✅ `leads` - Lead management
- ✅ `tasks` - Task management
- ✅ `notifications` - Notification system
- ✅ `employee_customer` - Employee-customer assignments
- ✅ `quotes_mbcb` - MBCB quotations
- ✅ `quotes_signages` - Signages quotations
- ✅ `quotes_paint` - Paint quotations

### Initial Data
- ✅ 4 Users (Admin, Employee1-3)
- ✅ 28 Indian States
- ✅ 9 Customers (a-i) assigned to employees
- ✅ Employee-customer assignments

### Functions & Triggers
- ✅ Engagement score calculation
- ✅ Timestamp updates
- ✅ Follow-up notification creation

## Individual Scripts (Optional)

If you need to run scripts individually or update specific parts:

1. **Base Setup**: `COMPLETE_DATABASE_SETUP.sql` (recommended)
2. **CRM Module**: `CRM_DATABASE_SCHEMA.sql`
3. **Accounts Module**: `ACCOUNTS_DATABASE_SCHEMA.sql`
4. **Accounts Extended**: `ACCOUNTS_EXTENDED_SCHEMA.sql`
5. **Quotation Updates**: 
   - `ADD_QUOTATION_STATUS.sql`
   - `ADD_COMMENTS_TO_QUOTATIONS.sql`
   - `ADD_QUOTATION_HISTORY.sql`

## Verification

After running the setup, verify with these queries:

```sql
-- Check users
SELECT * FROM users;

-- Check places of supply
SELECT COUNT(*) as total_states FROM places_of_supply;
SELECT * FROM places_of_supply ORDER BY name;

-- Check customers
SELECT name, sales_employee FROM customers ORDER BY sales_employee, name;

-- Check accounts table exists
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'accounts';

-- Check engagement score column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'accounts' AND column_name = 'engagement_score';
```

## Troubleshooting

### Error: "relation already exists"
- The script uses `CREATE TABLE IF NOT EXISTS`, so this shouldn't happen
- If it does, you may need to drop existing tables first (uncomment the DROP statements at the top)

### Error: "type already exists"
- ENUM types might already exist
- The script will skip creation if they exist

### Missing Data
- Check that the INSERT statements ran successfully
- Verify with the verification queries above

## Next Steps

After database setup:
1. Configure environment variables (`.env.local`)
2. Start the development server (`npm run dev`)
3. Test login with Admin credentials
4. Verify all features are working

