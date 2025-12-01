# Complete Database Rebuild Instructions

## Overview
This document provides instructions for rebuilding the entire YNM Safety database with proper links between Price Engine and CRM systems.

## Prerequisites
- **KEEP THESE TABLES**: `users`, `states`, `cities`
- **ALL OTHER TABLES WILL BE DELETED**

## Steps

### 1. Run the SQL Script
1. Open Supabase SQL Editor
2. Copy and paste the entire content from `docs/COMPLETE_DATABASE_REBUILD.sql`
3. Execute the script
4. Verify all tables were created (use the verification query at the end)

### 2. Database Structure

#### Hierarchy
```
users (existing)
states (existing)
cities (existing)
├── accounts (parent accounts)
│   └── sub_accounts (child accounts - assigned to employees)
│       ├── contacts (linked to sub-accounts)
│       └── quotations (quotes_mbcb, quotes_signages, quotes_paint)
├── customers (for backward compatibility)
└── activities, leads, tasks, notifications (CRM)
```

#### Key Relationships
- **accounts** → linked to `states` and `cities`
- **sub_accounts** → linked to `accounts`, has `assigned_employee`
- **contacts** → linked to `sub_accounts` and `accounts`
- **quotations** → linked to `sub_accounts` (and `customers` for backward compatibility)
- **activities** → linked to `accounts`, `sub_accounts`, `contacts`
- **leads** → linked to `accounts`, `sub_accounts`
- **tasks** → linked to `accounts`, `sub_accounts`, `contacts`
- **notifications** → linked to `accounts`, `sub_accounts`, `contacts`, `tasks`

### 3. What Works After Rebuild

#### Price Engine
- Employees see only their assigned sub-accounts in quotation forms
- Quotations are saved with `sub_account_id`
- Quotation status and history tracking
- Backward compatibility with `customers` table

#### CRM System
- **Accounts** → Create parent accounts with state/city
- **Sub-Accounts** → Create child accounts assigned to employees
- **Contacts** → Manage contacts under each sub-account
- **Quotations** → View quotations linked to sub-accounts
- **Activities** → Track all interactions
- **Tasks & Follow-ups** → Manage tasks per account/sub-account
- **Notifications** → Get alerts for follow-ups

### 4. Verification

After running the script, verify:
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check foreign keys
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### 5. Test the System

1. **Create an Account**
   - Go to CRM → Accounts
   - Click "+ Add Account"
   - Fill in details and create

2. **Create a Sub-Account**
   - Click "View Sub-Accounts" on an account
   - Add a sub-account
   - Assign it to an employee (Employee1, Employee2, or Employee3)

3. **Create a Contact**
   - Click "View Contacts" on a sub-account
   - Add contact details

4. **Create a Quotation**
   - Log in as the assigned employee
   - Go to Price Engine
   - The sub-account should appear in the customer dropdown
   - Create and save a quotation

## Troubleshooting

### Error: "column does not exist"
- Make sure you ran the complete SQL script
- Check that all ENUM types were created
- Verify foreign key relationships

### Error: "relation does not exist"
- Run the verification query to see which tables are missing
- Re-run the SQL script

### Quotations not showing sub-accounts
- Verify `sub_account_id` column exists in quotation tables
- Check that sub-accounts are assigned to the logged-in employee
- Verify the employee username matches `assigned_employee` in sub_accounts

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check Supabase logs for SQL errors
3. Verify all foreign key relationships are correct
4. Ensure RLS policies are set up (or disabled for server-side access)

