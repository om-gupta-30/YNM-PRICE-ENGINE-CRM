# Activity Tracking & Auto-Logout Feature

## Overview
This feature automatically tracks employee activity and manages their online status. Employees are automatically logged out after 15 minutes of inactivity.

## Features

### Status Management
- **Online**: User is actively using the system (cursor/keyboard activity detected)
- **Away**: No activity for 5 minutes
- **Logged Out**: No activity for 15 minutes - automatic logout

### Activity Tracking
- Monitors mouse movement, clicks, keyboard input, scrolling, and touch events
- Tracks tab visibility changes
- Updates status in real-time
- Logs all status changes to activities table

### Performance Optimizations
- Throttled activity detection (max once per second)
- Debounced status updates
- Lightweight periodic checks (every 2 minutes)
- Passive event listeners for better performance

## How It Works

### For Employees
1. Activity tracker monitors user interactions
2. After 5 minutes of inactivity → Status changes to "Away"
3. After 15 minutes of inactivity → Status changes to "Logged Out" and user is automatically logged out
4. All status changes are logged in the activities section
5. Employees can see their own activity history in the Activities page

### For Admin
1. Admin can see all employee activities
2. Status changes are visible in account activities
3. Real-time status indicators show employee online/away/logged out status

## Components

### ActivityTracker Component
- Located: `components/utils/ActivityTracker.tsx`
- Monitors user activity
- Updates status via API
- Handles auto-logout

### UserStatusIndicator Component
- Located: `components/ui/UserStatusIndicator.tsx`
- Displays current status (Online/Away/Logged Out)
- Shows in header next to logout button
- Updates every 30 seconds

### ActivityTimeline Component
- Enhanced to show status changes with color-coded indicators
- Green for online, Yellow for away, Red for logged out

## API Endpoints

### POST /api/auth/update-status
Updates user status and logs activity.

**Request:**
```json
{
  "username": "Employee1",
  "status": "away",
  "reason": "No activity for 5 minutes"
}
```

### GET /api/auth/user-status
Gets current user status.

**Query Parameters:**
- `username`: Username to get status for

**Response:**
```json
{
  "success": true,
  "status": "online",
  "username": "Employee1"
}
```

### GET /api/crm/activities
Gets activities for an employee or all activities (admin).

**Query Parameters:**
- `employee`: Employee username (optional, for employees)
- `isAdmin`: "true" if admin (optional)

## Database

### Activities Table
Status changes are logged in the `activities` table with:
- `activity_type`: "note"
- `description`: "Status changed to {status}: {reason}"
- `metadata`: Contains status, reason, and timestamp
- `account_id`: May be null for status-only activities

## Configuration

### Timing
- Away threshold: 5 minutes
- Logout threshold: 15 minutes
- Status check interval: 2 minutes
- Status display update: 30 seconds
- Activity throttle: 1 second

### Performance Settings
- Event listeners use `passive: true` for better scroll performance
- Throttled activity detection to prevent excessive API calls
- Debounced status updates
- Lightweight periodic checks

## Notes

- **Admin users are excluded** from activity tracking
- Status updates are throttled to prevent excessive API calls
- Activities are automatically logged when status changes
- The system works on Windows laptops with optimized performance
- Status indicator shows in the header for easy visibility

## Testing

1. Login as an employee
2. Check that status indicator shows "Online"
3. Stop moving mouse/keyboard for 5 minutes → Should show "Away"
4. Wait 10 more minutes (15 total) → Should auto-logout
5. Check Activities page to see status change logs
6. Admin can view all employee activities
