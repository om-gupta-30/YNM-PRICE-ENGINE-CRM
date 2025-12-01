# Notification Sync Implementation

## Overview
Implemented bidirectional synchronization between frontend notifications and the database. Notifications are now stored in the `notifications` table and automatically sync when contacts are created or updated.

## Changes Made

### 1. Notification Sync Helper (`lib/utils/notificationSync.ts`)
- Created a utility function that automatically syncs notifications when contacts are created or updated
- Handles creating, updating, and deleting notifications based on follow-up dates and call status
- Assigns notifications to the correct user based on sub-account assignment
- Deletes notifications when call status becomes "Connected" or follow-up date is removed

### 2. Contact Creation Endpoint (`app/api/subaccounts/[id]/contacts/route.ts`)
- Added notification sync when contacts are created with follow-up dates
- Automatically creates notification entries in the database

### 3. Contact Update Endpoint (`app/api/contacts/[id]/route.ts`)
- Added notification sync when contacts are updated
- Automatically creates/updates/deletes notifications when follow-up dates or call status changes

### 4. Follow-up Notifications API (`app/api/notifications/follow-ups/route.ts`)
- **Changed from computing notifications on-the-fly to reading from `notifications` table**
- Fetches notifications directly from the database instead of querying contacts
- Properly filters by assigned employee for non-admin users
- Filters out snoozed notifications that haven't passed their snooze time

### 5. NotificationBell Component (`components/crm/NotificationBell.tsx`)
- Updated to mark notifications as "seen" in the database when clicked
- Ensures proper database sync when user interacts with notifications

### 6. Migration Script (`docs/SYNC_EXISTING_NOTIFICATIONS.sql`)
- SQL script to migrate existing contacts with follow-up dates to notifications table
- Run this once to sync existing data

## How It Works

### When a Contact is Created/Updated:
1. Contact is saved to the database
2. If the contact has a follow-up date AND call status is not "Connected":
   - Notification is created/updated in `notifications` table
   - Notification is assigned to the sub-account's assigned employee (or Admin)
3. If call status is "Connected" OR follow-up date is removed:
   - Any existing notification is deleted

### When Notifications are Displayed:
1. Frontend requests notifications from `/api/notifications/follow-ups`
2. API reads from `notifications` table (not computing from contacts)
3. Notifications are filtered by user and snooze status
4. Contact details are joined for display

### When a Notification is Clicked:
1. Notification is marked as "seen" in the database
2. User is navigated to the contact page
3. Changes persist in the database

## Database Schema

Notifications are stored in the `notifications` table with:
- `user_id`: The assigned employee (from sub-account) or 'Admin'
- `notification_type`: 'followup_due'
- `contact_id`: Reference to the contact
- `account_id`: Reference to the account (for navigation)
- `is_seen`: Whether the user has seen the notification
- `is_completed`: Whether the follow-up has been completed
- `title` and `message`: Formatted notification content

## Running the Migration

To sync existing contacts to notifications:

```sql
-- Run this in your Supabase SQL editor
\i docs/SYNC_EXISTING_NOTIFICATIONS.sql
```

Or copy and paste the contents of `docs/SYNC_EXISTING_NOTIFICATIONS.sql` into your SQL editor.

## Testing

1. Create a new contact with a follow-up date → Notification should appear in database
2. Update a contact's follow-up date → Notification should update in database
3. Mark a contact as "Connected" → Notification should be deleted
4. Click on a notification → Should be marked as "seen" in database
5. View notifications in frontend → Should read from database, not compute from contacts

## Benefits

- ✅ Notifications are now persistent in the database
- ✅ Changes in frontend reflect in database
- ✅ Changes in database reflect in frontend
- ✅ Proper user assignment based on sub-account assignment
- ✅ Notifications can be marked as seen/completed
- ✅ No more computing notifications on-the-fly






