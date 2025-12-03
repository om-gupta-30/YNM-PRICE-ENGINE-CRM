# Complete Activities Logging Checklist

This document verifies that ALL requested activities are being logged and displayed correctly.

## ✅ Currently Logged Activities

### 1. **Quotation Saved** ✅
- **Backend**: Logged via `logQuotationSaveActivity()` in `/app/api/quotes/route.ts`
- **Activity Type**: `quotation_saved`
- **Data Logged**: 
  - Section (MBCB, Signages, Paint)
  - Account name
  - Sub-account name
  - Quotation ID
- **Frontend**: Displayed with 💾 icon and emerald color

### 2. **Account Operations** ✅
- **Create**: Logged via `logCreateActivity()` in `/app/api/accounts/route.ts`
- **Edit**: Logged via `logEditActivity()` in `/app/api/accounts/[id]/route.ts` (with change detection)
- **Delete**: Logged via `logDeleteActivity()` in `/app/api/accounts/[id]/route.ts`
- **Activity Types**: `create`, `edit`, `delete`
- **Frontend**: Displayed with ➕, ✏️, 🗑️ icons

### 3. **Sub-Account Operations** ✅
- **Create**: Logged via `logCreateActivity()` in `/app/api/subaccounts/route.ts`
- **Edit**: Logged via `logEditActivity()` in `/app/api/subaccounts/route.ts` (with change detection)
- **Delete**: Logged via `logDeleteActivity()` in `/app/api/subaccounts/[id]/route.ts`
- **Activity Types**: `create`, `edit`, `delete`
- **Frontend**: Displayed with ➕, ✏️, 🗑️ icons

### 4. **Contact Operations** ✅
- **Create**: Logged via `logCreateActivity()` in `/app/api/subaccounts/[id]/contacts/route.ts`
- **Edit**: Logged via `logEditActivity()` in `/app/api/contacts/[id]/route.ts` and `/app/api/subaccounts/[id]/contacts/route.ts` (with change detection)
- **Delete**: Logged via `logDeleteActivity()` in `/app/api/contacts/[id]/route.ts`
- **Activity Types**: `create`, `edit`, `delete`
- **Frontend**: Displayed with ➕, ✏️, 🗑️ icons

### 5. **Login/Logout** ✅
- **Login**: Logged via `logLoginActivity()` in `/app/api/auth/login/route.ts`
  - Includes login time
  - Shows inactivity reason if returning from inactive
- **Logout**: Logged via `logLogoutActivity()` in `/app/api/auth/logout/route.ts`
  - **Manual Logout**: Reason is REQUIRED and stored in:
    - `logout_reasons` table (reason_tag, reason_text)
    - `activities` table metadata (reason, custom_reason)
  - **Auto Logout**: After 15 minutes of inactivity
- **Activity Types**: `login`, `logout`
- **Frontend**: 
  - Login: 🔐 icon, cyan color, shows login time
  - Logout: 🚪 icon, gray color, shows logout reason badge

### 6. **Away Status** ✅
- **Logged**: Via `logAwayActivity()` in `/app/api/auth/update-status/route.ts`
- **Activity Type**: `away`
- **Data Logged**: Status change with reason (if provided)
- **Frontend**: Displayed with 🟡 icon and yellow color

### 7. **Inactive Status with Reason** ✅
- **When Marked Inactive**: Logged via `logAwayActivity()` with status `inactive` in `/app/api/auth/update-status/route.ts`
- **When Logging Back After Inactive**: 
  - Logged via `logLoginActivity()` with `wasInactive: true` and `inactivityReason` in `/app/api/auth/login/route.ts`
  - Also logged via `logAwayActivity()` in `/app/api/auth/log-inactivity-reason/route.ts` when reason is provided
- **Activity Types**: `inactive`, `login` (with return metadata)
- **Frontend**: 
  - Inactive: ⏸️ icon, orange color
  - Return: Shows "Returned: [reason]" badge in blue

### 8. **Lead Operations** ✅
- **Create**: Logged via `logActivity()` in `/app/api/crm/leads/create/route.ts`
- **Edit**: Logged via `logActivity()` in `/app/api/crm/leads/[id]/route.ts` (with change detection)
- **Delete**: Logged via `logActivity()` in `/app/api/crm/leads/delete/route.ts`
- **Activity Types**: `create`, `edit`, `delete`
- **Frontend**: Displayed with ➕, ✏️, 🗑️ icons

### 9. **Task Operations** ✅
- **Create**: Logged via `logActivity()` in `/app/api/crm/tasks/create/route.ts`
- **Edit**: Logged via `logActivity()` in `/app/api/crm/tasks/update/route.ts`
- **Delete**: Logged via `logActivity()` in `/app/api/crm/tasks/[id]/route.ts`
- **Activity Types**: `task`, `edit`, `delete`
- **Frontend**: Displayed with ✅, ✏️, 🗑️ icons

### 10. **Follow-up Activities** ✅ FIXED
- **Backend**: Logged via `logActivity()` in `/app/api/crm/leads/[id]/follow-up/route.ts`
  - Now logs to main `activities` table with activity_type `followup`
  - Also logs to `lead_activities` table for lead-specific views
- **Activity Type**: `followup`
- **Data Logged**: 
  - Lead ID and name
  - Follow-up date
  - Account ID (if available)
- **Frontend**: Displayed with 📅 icon and yellow color

## 📋 Frontend Display Details

### Activity Timeline Component (`/components/crm/ActivityTimeline.tsx`)

**What is Displayed:**
1. ✅ Activity icon (based on type)
2. ✅ Activity description
3. ✅ Employee name (who performed action)
4. ✅ Timestamp (formatted in IST)
5. ✅ **Logout Reason** - Shows reason badge when logout reason exists
6. ✅ **Login/Logout Times** - Shows formatted times
7. ✅ **Away Status** - Shows status badge
8. ✅ **Inactivity Reason** - Shows orange badge with reason
9. ✅ **Return from Inactive** - Shows blue badge with return reason
10. ✅ **Changes** - Shows list of changes for edit activities
11. ✅ **Metadata** - Shows entity type, status, call status, etc.

### Activities Page (`/app/crm/activities/page.tsx`)

**Features:**
- ✅ Auto-refreshes every 10 seconds
- ✅ Role-based filtering (Admins see all, Employees see only their own)
- ✅ Date filtering
- ✅ Employee filtering (for admins)
- ✅ Employee status indicators (online/away/inactive/logged_out)

## ✅ All Fixes Applied

### Fix 1: Follow-up Activities ✅
**File**: `/app/api/crm/leads/[id]/follow-up/route.ts`

**Fixed**: Now logs to main `activities` table using `logActivity()` with activity_type `followup`.

### Fix 2: Activity Type Enum ✅
**File**: `/lib/utils/activityLogger.ts`

**Fixed**: Added `followup` to the `ActivityLogParams` activity_type union type.

## ✅ Verification Checklist

- [x] Quotation saved - Logged and displayed
- [x] Account create/edit/delete - Logged and displayed
- [x] Sub-account create/edit/delete - Logged and displayed
- [x] Contact create/edit/delete - Logged and displayed
- [x] Login - Logged and displayed with time
- [x] Logout - Logged and displayed with reason
- [x] Manual logout reason - Stored and displayed
- [x] Away status - Logged and displayed
- [x] Inactive status - Logged and displayed
- [x] Inactive reason on return - Logged and displayed
- [x] Lead create/edit/delete - Logged and displayed
- [x] Task create/edit/delete - Logged and displayed
- [x] Follow-up activities - Logged and displayed in main timeline

## 📝 Notes

1. All activities are stored permanently in the `activities` table
2. Logout reasons are stored in both `logout_reasons` table and `activities.metadata`
3. Inactivity reasons are stored in `activities.metadata` with type `inactivity_reason`
4. Change detection is implemented for all edit operations
5. Activities are non-blocking (failures don't break main operations)
6. Frontend auto-refreshes every 10 seconds for live updates
