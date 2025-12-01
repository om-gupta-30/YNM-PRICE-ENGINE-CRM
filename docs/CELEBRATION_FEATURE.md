# 🎉 Quotation Closure Celebration Feature

## Overview
When any quotation status becomes "Closed Won", a global celebration animation is triggered visible to all logged-in users (employees and admins).

## Features Implemented

### ✅ Celebration Animation
- **Library**: `react-confetti`
- **Trigger**: Automatically detects when a quotation status changes to "Closed Won"
- **Duration**: 3 seconds of confetti animation
- **Colors**: Brand colors (gold, red, green, blue, purple, orange)
- **Visibility**: All logged-in users see the celebration

### ✅ Toast Notification
- **Message**: "🎉 Quotation Closed Won! Great job!"
- **Details Shown**:
  - Quotation ID
  - Account/Customer Name
  - Quotation Value (if available)
  - Closed by Employee
- **Duration**: 5 seconds
- **Position**: Top-right corner with bounce animation

### ✅ Activity Logging
- Automatically creates an activity entry when status changes to "Closed Won"
- Activity includes:
  - Account ID (if linked)
  - Employee ID (who closed it)
  - Activity Type: "quotation"
  - Description: "Quotation #XYZ marked as Closed Won"
  - Metadata: quotation_id, status, section, value

### ✅ Engagement Score Update
- Automatically increases engagement score by **+20** for "Closed Won"
- Handled by database trigger (already implemented in `ACCOUNTS_EXTENDED_SCHEMA.sql`)
- Trigger function: `update_account_engagement_score()`

### ✅ Dashboard Updates
- Quotation Status Pie Chart automatically updates
- KPI metrics refresh
- Celebration triggers on dashboard pages

## Implementation Details

### Components

#### `CelebrationEffect.tsx`
- Polls for new "Closed Won" quotations every 5 seconds
- Checks for quotations updated within last 30 seconds
- Uses `sessionStorage` to prevent duplicate celebrations
- Renders confetti animation

#### `CelebrationToast.tsx`
- Shows toast notification with quotation details
- Fetches account name if `account_id` is available
- Displays formatted currency value

### API Updates

#### `/api/quotes/update-status/route.ts`
- Enhanced to create activity when status is "closed_won"
- Fetches account_id, customer_name, final_total_cost from quotation
- Creates activity entry in `activities` table
- Engagement score is automatically updated via database trigger

### Pages with Celebration

1. **Global Layout** (`app/layout.tsx`)
   - Celebration components added to root layout
   - Visible on all pages

2. **Dashboard** (`app/crm/dashboard/page.tsx`)
   - Celebration visible on admin and employee dashboards

3. **Quotation Status Update** (`app/quotation-status-update/page.tsx`)
   - Celebration visible for employees updating status

4. **Quotation Status** (`app/quotation-status/page.tsx`)
   - Celebration visible for admins viewing all statuses

## How It Works

1. **User Updates Status**: Employee or admin changes quotation status to "Closed Won"
2. **API Processing**: 
   - Status is updated in database
   - Activity is created (if account_id exists)
   - Engagement score is updated (+20) via trigger
3. **Polling Detection**: 
   - All open pages poll `/api/quotes` every 5 seconds
   - Check for quotations with status "closed_won" updated within last 30 seconds
4. **Celebration Trigger**:
   - If new "Closed Won" detected and not yet celebrated (sessionStorage check)
   - Confetti animation plays for 3 seconds
   - Toast notification shows for 5 seconds
5. **Prevention of Duplicates**:
   - Uses `sessionStorage` with key: `celebrated_{quotationId}_{historyLength}`
   - Prevents re-triggering on page refresh
   - Only triggers once per status change

## Database Integration

### Activities Table
```sql
INSERT INTO activities (
  account_id,
  employee_id,
  activity_type,
  description,
  metadata
) VALUES (
  {account_id},
  {employee_id},
  'quotation',
  'Quotation #{id} marked as Closed Won',
  {
    quotation_id: {id},
    quotation_status: 'closed_won',
    section: {section},
    value: {final_total_cost}
  }
);
```

### Engagement Score Trigger
The database trigger automatically:
- Detects activity with `activity_type = 'quotation'` and `metadata->>'quotation_status' = 'closed_won'`
- Adds +20 to account's `engagement_score`
- Updates `updated_at` timestamp

## Configuration

### Polling Interval
- Default: 5 seconds
- Can be adjusted in `CelebrationEffect.tsx` and `CelebrationToast.tsx`

### Celebration Window
- Default: 30 seconds (only show celebrations for quotations updated within last 30 seconds)
- Can be adjusted in both celebration components

### Confetti Settings
- Pieces: 200
- Gravity: 0.3
- Duration: 3 seconds
- Colors: Brand colors array

## Future Enhancements

- [ ] WebSocket/Realtime support for instant notifications (instead of polling)
- [ ] Sound effect toggle in user settings
- [ ] Custom celebration messages per employee
- [ ] Celebration history/log
- [ ] Team-wide celebration announcements

## Testing

To test the celebration feature:

1. Create a quotation
2. Update its status to "Closed Won"
3. Within 30 seconds, you should see:
   - Confetti animation (3 seconds)
   - Toast notification (5 seconds)
4. Activity should be logged in `activities` table
5. Engagement score should increase by +20

## Notes

- Celebration only triggers for quotations with `status = 'closed_won'`
- Only shows for quotations updated within last 30 seconds
- Uses `sessionStorage` to prevent duplicate celebrations
- Works across all open tabs/pages
- No performance impact (lightweight polling every 5 seconds)

