# Follow-Up Notifications System

## Overview

This system automatically generates notifications for contacts with follow-up dates. Notifications are created in the `notifications` table and are only visible to the employee assigned to the account.

## How It Works

1. **Notification Generation**: The system checks all contacts with `follow_up_date` values
2. **Employee Assignment**: Notifications are assigned to the employee who owns the account (via `accounts.assigned_employee`)
3. **Filtering**: Only employees see notifications - Admin users do not see the notification bell or notifications page

## API Endpoint

### Generate Follow-Up Notifications

**Endpoint**: `POST /api/notifications/generate-followups`

**Description**: Checks all contacts with follow-up dates and creates notifications for employees.

**Response**:
```json
{
  "success": true,
  "message": "Created 5 notifications",
  "created": 5,
  "notifications": [...]
}
```

## Usage

### Automatic Generation (Default)

**Notifications are automatically generated when:**
- Admin user loads the CRM dashboard
- Only runs once per day (tracked in localStorage)
- Runs in the background without blocking the dashboard

### Manual Trigger (Admin Dashboard)

**Admin users can manually trigger notification generation:**
1. Go to CRM Dashboard (`/crm`)
2. Click the "🔔 Generate Follow-up Notifications" button in the header
3. See success/error message showing how many notifications were created

### API Endpoint

You can also manually trigger notification generation by calling:
```bash
curl -X POST http://localhost:3000/api/notifications/generate-followups
```

### Automated Cron Job (Optional)

For production, you can also set up a cron job to run this endpoint daily:

**Example cron job (runs daily at 9 AM)**:
```bash
0 9 * * * curl -X POST https://your-domain.com/api/notifications/generate-followups
```

Or use a service like:
- Vercel Cron Jobs
- GitHub Actions (scheduled workflows)
- External cron service (cron-job.org, etc.)

## Notification Rules

1. **Only creates notifications for contacts with follow-up dates**
2. **Skips contacts that already have active notifications**
3. **Assigns notification to the account's assigned employee**
4. **Creates "Overdue" notifications for past dates**
5. **Creates "Due Today" notifications for today's date**

## Admin Access

- Admin users **do not** see the notification bell
- Admin users **cannot** access the notifications page
- Admin users are automatically redirected from `/crm/notifications`

## Employee Access

- Employees see notifications only for accounts assigned to them
- Notifications appear in the notification bell dropdown
- Employees can mark notifications as read/completed
- Employees can snooze notifications

## Database Schema

Notifications are stored in the `notifications` table with:
- `user_id`: Employee username (from `accounts.assigned_employee`)
- `notification_type`: 'followup_due'
- `contact_id`: Reference to the contact
- `sub_account_id`: Reference to sub-account
- `account_id`: Reference to account
- `is_seen`: Whether notification has been viewed
- `is_completed`: Whether follow-up has been completed
- `is_snoozed`: Whether notification is snoozed
- `snooze_until`: When snooze expires

## Next Steps

1. Set up automated daily execution of the notification generation endpoint
2. Monitor notification creation in the database
3. Test with employee accounts to ensure notifications appear correctly
