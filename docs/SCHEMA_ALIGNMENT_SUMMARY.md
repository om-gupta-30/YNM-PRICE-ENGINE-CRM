# Database Schema Alignment Summary

This document summarizes the changes made to align the database schema with the provided schema documentation.

## Overview

The database schema has been reviewed and updated to match the complete schema provided in the images. All missing tables, columns, and relationships have been identified and added.

## Changes Made

### 1. New Tables Created

The following tables were added to match the schema:

- **`activity_logs`** - Logs user activities and events
  - `id` (SERIAL PRIMARY KEY)
  - `user_id` (TEXT)
  - `event_type` (TEXT)
  - `metadata` (JSONB)
  - `created_at` (TIMESTAMP WITH TIME ZONE)

- **`engagement_ai_state`** - Tracks AI engagement analysis state
  - `account_id` (INTEGER PRIMARY KEY, references accounts)
  - `last_run` (TIMESTAMP WITH TIME ZONE)

- **`engagement_suggestions`** - Stores AI-generated engagement suggestions
  - `id` (SERIAL PRIMARY KEY)
  - `account_id` (INTEGER, references accounts)
  - `generated_by` (TEXT)
  - `suggestion_text` (TEXT)
  - `suggested_score_change` (NUMERIC)
  - `data_snapshot` (JSONB)
  - `created_at` (TIMESTAMP WITH TIME ZONE)

- **`logout_reasons`** - Tracks user logout reasons
  - `id` (SERIAL PRIMARY KEY)
  - `user_id` (TEXT)
  - `reason_tag` (TEXT)
  - `reason_text` (TEXT)
  - `created_at` (TIMESTAMP WITH TIME ZONE)

### 2. Column Name Fixes

- **`states` table**: Column renamed from `name` to `state_name`
- **`cities` table**: Column renamed from `name` to `city_name`

### 3. Missing Columns Added

#### `sub_accounts` table
- `state_id` (INTEGER, references states)
- `city_id` (INTEGER, references cities)

#### `quotes_mbcb` table
- `sub_account_id` (INTEGER, references sub_accounts)
- `state_id` (INTEGER, references states)
- `city_id` (INTEGER, references cities)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

#### `quotes_paint` table
- `sub_account_id` (INTEGER, references sub_accounts)
- `state_id` (INTEGER, references states)
- `city_id` (INTEGER, references cities)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

#### `quotes_signages` table
- `sub_account_id` (INTEGER, references sub_accounts)
- `state_id` (INTEGER, references states)
- `city_id` (INTEGER, references cities)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

#### `activities` table
- `sub_account_id` (INTEGER, references sub_accounts)

#### `contacts` table
- `sub_account_id` (INTEGER, references sub_accounts)

#### `leads` table
- `sub_account_id` (INTEGER, references sub_accounts)
- `contact_id` (INTEGER, references contacts)
- `priority` (TEXT: 'High Priority', 'Medium Priority', 'Low Priority')
- `follow_up_date` (DATE)

#### `tasks` table
- `sub_account_id` (INTEGER, references sub_accounts)
- `contact_id` (INTEGER, references contacts)
- `due_date` changed from DATE to TIMESTAMP WITH TIME ZONE

#### `notifications` table
- `sub_account_id` (INTEGER, references sub_accounts)

### 4. Indexes Created

All new foreign key columns have been indexed for better query performance:
- Indexes on all `sub_account_id` columns
- Indexes on all `state_id` columns
- Indexes on all `city_id` columns
- Indexes on `contact_id` in leads and tasks
- Indexes on `priority` and `follow_up_date` in leads

### 5. Triggers Added

Automatic `updated_at` triggers have been added for:
- `quotes_mbcb`
- `quotes_paint`
- `quotes_signages`

### 6. TypeScript Types Updated

The `lib/constants/types.ts` file has been updated to include:
- `State` interface
- `City` interface
- `SubAccount` interface
- `ActivityLog` interface
- `EngagementAIState` interface
- `EngagementSuggestion` interface
- `LogoutReason` interface
- Updated `Lead`, `Task`, `Activity`, `Contact`, `Notification`, and `Quote` interfaces with new fields

## How to Apply Changes

### Step 1: Run the Migration Script

1. Open your Supabase SQL Editor
2. Run the file: `docs/COMPLETE_SCHEMA_ALIGNMENT.sql`
3. Verify the success message at the end

### Step 2: Verify Schema

The script includes verification queries that will show:
- Total number of tables
- Whether all required columns exist
- Whether all new tables were created

### Step 3: Test Your Application

After running the migration:
1. Test creating quotations (MBCB, Paint, Signages)
2. Test creating/updating leads with priority and follow-up dates
3. Test creating tasks with sub-accounts and contacts
4. Test notifications with sub-accounts
5. Verify all foreign key relationships work correctly

## Important Notes

1. **Backup First**: Always backup your database before running migration scripts
2. **Column Names**: The script handles renaming `name` to `state_name` and `city_name` automatically
3. **Foreign Keys**: All foreign key constraints are properly set up with appropriate ON DELETE actions
4. **Data Preservation**: The script uses `IF NOT EXISTS` checks to avoid data loss
5. **Indexes**: All new columns are properly indexed for performance

## Schema Verification

After running the script, you can verify the schema matches by checking:

```sql
-- Check states table
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'states' ORDER BY ordinal_position;

-- Check cities table
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'cities' ORDER BY ordinal_position;

-- Check all new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('activity_logs', 'engagement_ai_state', 'engagement_suggestions', 'logout_reasons')
ORDER BY table_name;
```

## Files Modified

1. **`docs/COMPLETE_SCHEMA_ALIGNMENT.sql`** - New comprehensive migration script
2. **`lib/constants/types.ts`** - Updated TypeScript type definitions

## Next Steps

1. Run the migration script in Supabase
2. Test all application features
3. Update any API routes that might need to handle the new columns
4. Update frontend components if they need to display/edit new fields

## Support

If you encounter any issues:
1. Check the Supabase SQL Editor for error messages
2. Verify all foreign key relationships are valid
3. Ensure all referenced tables exist before running the script
4. Check that column data types match expected values

---

**Last Updated**: 2024
**Migration Script Version**: 1.0.0
