# Data Analyst Activities & Status Tracking Implementation

## Overview
This document describes the implementation of activities tracking and status monitoring for data analysts, matching the functionality previously available only for employees.

## Changes Implemented

### 1. Login/Logout Activities
- **Before**: Only employees' login/logout activities were tracked and displayed
- **After**: Data analysts' login/logout activities are now tracked and displayed in the activities section
- **Implementation**: 
  - Login API already logs activities for all users (no changes needed)
  - Activities API now includes data analysts in queries
  - Activities page displays login/logout for data analysts

### 2. Logout Reason Collection
- **Before**: Only employees were asked for logout reasons
- **After**: Data analysts are now required to provide logout reasons when logging out
- **Implementation**:
  - Updated `LogoutButton` component to show modal for data analysts
  - Updated logout API to handle data analysts
  - Logout reasons are saved to `logout_reasons` table for data analysts

### 3. Status Tracking (Online/Away/Inactive)
- **Before**: Only employees had status tracking
- **After**: Data analysts now have status tracking (online, away, inactive, logged_out)
- **Implementation**:
  - Updated `ActivityTracker` component to track status for data analysts
  - Status updates are logged to activities table
  - Status display shows data analysts alongside employees

### 4. Status Display
- **Before**: Status section only showed employees
- **After**: Status section shows both employees and data analysts
- **Implementation**:
  - Updated activities page to include data analysts in status display
  - Updated status API routes to include data analysts
  - Added "inactive" status (between "away" and "logged_out")

## Files Modified

### Components
1. **`components/layout/LogoutButton.tsx`**
   - Added data analyst check
   - Shows logout reason modal for data analysts
   - Sends `isDataAnalyst` flag to logout API

2. **`components/utils/ActivityTracker.tsx`**
   - Added data analyst status tracking
   - Tracks online/away/inactive status for data analysts
   - Excludes only full admin from tracking

3. **`components/crm/activities/ActivityTimelineItem.tsx`**
   - Added emoji icons for 'away' and 'inactive' activity types
   - Added display for away/inactive status activities

4. **`components/crm/activities/types.ts`**
   - Added 'away' and 'inactive' to ActivityType

### API Routes
1. **`app/api/auth/logout/route.ts`**
   - Updated to handle data analysts
   - Saves logout reasons for data analysts
   - Creates follow-up tasks for data analysts when logging out for meetings

2. **`app/api/auth/update-status/route.ts`**
   - Already supports all users (no changes needed)

3. **`app/api/auth/user-status/route.ts`**
   - Updated to include 'inactive' status
   - Works for data analysts (no changes needed)

4. **`app/api/auth/all-users-status/route.ts`**
   - Updated to include data analysts in status list
   - Added 'inactive' status support

5. **`app/api/crm/activities/route.ts`**
   - Already supports all users (no changes needed)

### Pages
1. **`app/crm/activities/page.tsx`**
   - Updated status section title to "Employee & Data Analyst Status"
   - Added 'inactive' status display
   - Status fetching includes data analysts

2. **`app/login/page.tsx`**
   - Updated to show inactivity reason modal for data analysts after auto-logout

## Database Schema

**One enum update required:** You need to add 'away' and 'inactive' to the `activity_type_enum` type.

### Required SQL Update

**Run this script first:** `docs/ADD_AWAY_INACTIVE_TO_ACTIVITY_TYPE_ENUM.sql`

This script adds the missing enum values needed for status tracking.

### Existing Tables (No other changes needed)

The existing tables already support all user types:

- **`activities`** table: `employee_id` column stores username (works for all users)
- **`logout_reasons`** table: `user_id` column stores username (works for all users)
- **`users`** table: Already has all necessary columns

See `docs/DATA_ANALYST_ACTIVITIES_STATUS.sql` for verification queries and optional indexes.

## Status Levels

The system now tracks four status levels:

1. **Online** (default): User is active
2. **Away**: No activity for 5 minutes
3. **Inactive**: No activity for 10 minutes
4. **Logged Out**: No activity for 15 minutes or manual logout

## User Types

- **Full Admin** (`Admin`): No status tracking, no logout reasons required
- **Data Analysts** (`swamymahesh`, `mahesh`): Full tracking, logout reasons required
- **Employees** (`Employee1`, `Employee2`, `Employee3`, etc.): Full tracking, logout reasons required

## Setup Instructions

1. **First, run the enum update:**
   ```sql
   -- Run: docs/ADD_AWAY_INACTIVE_TO_ACTIVITY_TYPE_ENUM.sql
   ```
   This adds 'away' and 'inactive' to the `activity_type_enum` type.

2. **Then verify the setup:**
   ```sql
   -- Run: docs/DATA_ANALYST_ACTIVITIES_STATUS.sql
   ```
   This verifies all tables and shows example queries.

## Testing Checklist

- [ ] Run `ADD_AWAY_INACTIVE_TO_ACTIVITY_TYPE_ENUM.sql` successfully
- [ ] Data analyst can see their login/logout activities in activities section
- [ ] Data analyst is asked for logout reason when logging out
- [ ] Data analyst logout reasons are saved and displayed
- [ ] Data analyst status (online/away/inactive) is tracked and displayed
- [ ] Admin can see data analyst status in activities page
- [ ] Data analyst auto-logout shows inactivity reason modal on next login
- [ ] Status display shows data analysts alongside employees

## SQL Queries

See `docs/DATA_ANALYST_ACTIVITIES_STATUS.sql` for:
- Verification queries
- Performance indexes (optional)
- Test queries

## Notes

- All existing functionality for employees remains unchanged
- Data analysts now have the same tracking as employees
- Full admin remains excluded from tracking (as intended)
- No database migrations required
