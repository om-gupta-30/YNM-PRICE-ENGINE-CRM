# Activity Tracking Implementation Guide

## Overview
This document explains how all employee activities are stored in the database, including logins, logouts, status changes, and all other actions.

## Database Tables

### 1. `activities` Table
This is the main table that stores **ALL** employee activities.

**Structure:**
- `id` (SERIAL PRIMARY KEY) - Unique activity ID
- `account_id` (INTEGER, NULLABLE) - Reference to accounts table (NULL for system-wide activities)
- `contact_id` (INTEGER, NULLABLE) - Reference to contacts table (optional)
- `employee_id` (TEXT, NOT NULL) - Username of the employee
- `activity_type` (activity_type_enum, NOT NULL) - Type of activity
- `description` (TEXT, NOT NULL) - Human-readable description
- `metadata` (JSONB) - Additional data (status, reason, changes, etc.)
- `created_at` (TIMESTAMP WITH TIME ZONE) - When the activity occurred

**Activity Types:**
- `login` - Employee logs in
- `logout` - Employee logs out
- `note` - General notes, account updates, customer updates, lead updates
- `quotation` - Quotation creation, status changes, comment updates
- `task` - Task creation and updates
- `call` - Call status updates on contacts
- `followup` - Follow-up activities
- `email` - Email activities
- `meeting` - Meeting activities

### 2. `logout_reasons` Table
Stores logout reasons for employees (not admins) when they manually log out.

**Structure:**
- `id` (SERIAL PRIMARY KEY)
- `user_id` (TEXT, NOT NULL) - Username
- `reason_tag` (TEXT) - Categorized reason (Lunch Break, Meeting, End of Day, Other)
- `reason_text` (TEXT) - Full reason text
- `created_at` (TIMESTAMP WITH TIME ZONE) - When logout occurred

## What Gets Logged

### ✅ All Activities Are Stored in Database

1. **Login Activities**
   - Stored in `activities` table
   - Activity type: `login`
   - Account ID: NULL (system-wide)
   - Metadata: login_time

2. **Logout Activities**
   - Stored in `activities` table (activity type: `logout`)
   - Also stored in `logout_reasons` table (for employees only)
   - Account ID: NULL (system-wide)
   - Metadata: reason, logout_time, custom_reason (if applicable)

3. **Auto-Logout & Status Changes**
   - Status changes (online/away/logged_out) stored in `activities` table
   - Activity type: `note`
   - Description includes status change
   - Metadata: status, reason, timestamp

4. **Inactivity Reasons**
   - When employee logs back in after auto-logout
   - Stored in `activities` table
   - Activity type: `note`
   - Metadata: type='inactivity_reason', reason, auto_logout=true

5. **Account Activities**
   - Account creation → `activities` table (type: `note`)
   - Account updates → `activities` table (type: `note`)
   - Metadata: changes, account_name, assigned_employee

6. **Customer Activities**
   - Customer creation → `activities` table (type: `note`)
   - Customer updates → `activities` table (type: `note`)
   - Metadata: changes, account_name

7. **Lead Activities**
   - Lead creation → `activities` table (type: `note`)
   - Lead updates → `activities` table (type: `note`)
   - Metadata: lead_id, lead_name, status, changes

8. **Task Activities**
   - Task creation → `activities` table (type: `task`)
   - Task updates → `activities` table (type: `task`)
   - Metadata: task_id, task_type, status, changes

9. **Contact Activities**
   - Contact creation → `activities` table (type: `note`)
   - Contact updates → `activities` table (type: `call` or `note`)
   - Contact deletion → `activities` table (type: `note`)
   - Metadata: call_status, changes

10. **Quotation Activities**
    - Quotation creation → `activities` table (type: `quotation`)
    - Quotation status changes → `activities` table (type: `quotation`)
    - Quotation comment updates → `activities` table (type: `note`)
    - Metadata: quotation_id, section, status, value, changes

## Database Setup

### Step 1: Run the SQL Script
Run the SQL script located at:
```
docs/ACTIVITY_TRACKING_DATABASE_SETUP.sql
```

This script will:
1. ✅ Add `login` and `logout` to `activity_type_enum`
2. ✅ Ensure `activities` table exists with correct structure
3. ✅ Make `account_id` nullable (for system-wide activities)
4. ✅ Create all necessary indexes for performance
5. ✅ Ensure `logout_reasons` table exists
6. ✅ Add helpful comments to tables

### Step 2: Verify Setup
After running the script, verify:
```sql
-- Check activity types
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type_enum')
ORDER BY enumsortorder;

-- Should include: call, note, followup, quotation, email, task, meeting, login, logout

-- Check activities table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'activities';

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'activities';
```

## Querying Activities

### View All Activities for an Employee
```sql
SELECT * FROM activities 
WHERE employee_id = 'Employee1' 
ORDER BY created_at DESC;
```

### View Activities for Today
```sql
SELECT employee_id, activity_type, description, created_at 
FROM activities 
WHERE DATE(created_at) = CURRENT_DATE 
ORDER BY created_at DESC;
```

### View All Logout Activities
```sql
SELECT employee_id, description, metadata, created_at 
FROM activities 
WHERE activity_type = 'logout' 
ORDER BY created_at DESC;
```

### View Logout Reasons
```sql
SELECT user_id, reason_tag, reason_text, created_at 
FROM logout_reasons 
ORDER BY created_at DESC;
```

### View Activities by Type
```sql
SELECT activity_type, COUNT(*) as count 
FROM activities 
GROUP BY activity_type 
ORDER BY count DESC;
```

### View Activities for a Specific Account
```sql
SELECT * FROM activities 
WHERE account_id = 123 
ORDER BY created_at DESC;
```

## API Endpoints

All activity logging happens automatically through these API endpoints:

1. **Login** - `/api/auth/login` → Logs login activity
2. **Logout** - `/api/auth/logout` → Logs logout activity + saves to logout_reasons
3. **Status Updates** - `/api/auth/update-status` → Logs status changes
4. **Inactivity Reason** - `/api/auth/log-inactivity-reason` → Logs inactivity reason
5. **Account Creation** - `/api/accounts` (POST) → Logs account creation
6. **Account Updates** - `/api/accounts/[id]` (PUT) → Logs account updates
7. **Customer Creation** - `/api/crm/customers` (POST) → Logs customer creation
8. **Customer Updates** - `/api/crm/customers/[id]` (PUT) → Logs customer updates
9. **Lead Creation** - `/api/crm/leads/create` (POST) → Logs lead creation
10. **Lead Updates** - `/api/crm/leads/update` (POST) → Logs lead updates
11. **Task Creation** - `/api/crm/tasks/create` (POST) → Logs task creation
12. **Task Updates** - `/api/crm/tasks/update` (POST) → Logs task updates
13. **Contact Creation** - `/api/accounts/[id]/contacts` (POST) → Logs contact creation
14. **Contact Updates** - `/api/contacts/[id]` (PUT) → Logs contact updates
15. **Contact Deletion** - `/api/contacts/[id]` (DELETE) → Logs contact deletion
16. **Quotation Creation** - `/api/quotes` (POST) → Logs quotation creation
17. **Quotation Status** - `/api/quotes/update-status` (POST) → Logs status changes
18. **Quotation Comments** - `/api/quotes/update-comments` (POST) → Logs comment updates

## Frontend Display

All activities are displayed in:
- **Admin View**: `/crm/activities` - Shows all employees' activities with filters
- **Employee View**: `/crm/activities` - Shows only their own activities
- **Account View**: `/crm/accounts/[id]` - Shows activities for that specific account

## Performance Considerations

- ✅ Indexes on `employee_id`, `account_id`, `created_at`, and `activity_type`
- ✅ Composite index on `(employee_id, created_at DESC)` for fast employee queries
- ✅ JSONB metadata for flexible data storage
- ✅ NULL account_id for system-wide activities (reduces join overhead)

## Notes

- All activities are stored **permanently** in the database
- Activities are **never deleted** (only account deletion cascades)
- `account_id` can be NULL for system-wide activities (login, logout, status changes)
- `metadata` field stores flexible JSON data for each activity type
- Activities are automatically logged - no manual intervention needed
