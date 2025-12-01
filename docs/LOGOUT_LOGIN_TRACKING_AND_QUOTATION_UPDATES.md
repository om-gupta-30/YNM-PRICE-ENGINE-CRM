# Logout/Login Tracking & Quotation Updates

## Summary of Changes

### 1. Logout/Login Time Tracking

**Database Changes:**
- Run `docs/ADD_LOGIN_LOGOUT_TRACKING.sql` to add:
  - `login_time` column to `users` table
  - `logout_time` column to `users` table
  - `last_login` column to `users` table

**API Updates:**
- **Login API** (`/api/auth/login`):
  - Updates `login_time` and `last_login` when user logs in
  - Logs login activity to `activities` table

- **Logout API** (`/api/auth/logout`):
  - Updates `logout_time` in `users` table
  - Saves logout reason to `logout_reasons` table (for employees only)
  - Logs logout activity to `activities` table
  - Creates follow-up task if reason is "Meeting / Field Visit"

**Logout Flow:**
- **Admin**: Logs out directly (no reason required)
- **Employee**: Must select logout reason:
  - Lunch Break
  - Meeting / Field Visit (creates follow-up task)
  - End of Day
  - Other (with optional note)

### 2. Quotation Account Selection

**New Component:**
- Created `AccountSelect` component that:
  - Shows accounts assigned to the employee
  - Filters by employee (admin sees all)
  - Returns account ID and name

**Updated Components:**
- `SubAccountSelect` now accepts `accountId` prop
- Filters sub-accounts by selected account
- Only shows sub-accounts for the selected account

**Updated Pages:**
- ✅ W-Beam (`/mbcb/w-beam`)
- ✅ Thrie Beam (`/mbcb/thrie`)
- ✅ Double W-Beam (`/mbcb/double-w-beam`)
- ✅ Signages Reflective (`/signages/reflective`)

**Flow:**
1. Select State & City
2. Select Estimate Date & Expiry Date
3. **Select Account** (NEW STEP)
4. Select Sub-Account (filtered by account)
5. Enter Purpose
6. Continue with quotation details

**API Updates:**
- `/api/quotes` now accepts `account_id` parameter
- Automatically links quotation to account and sub-account

### 3. Tasks Page Design Enhancement

**Visual Improvements:**
- Changed from table view to **card-based grid layout**
- Each task displayed as a card with:
  - Color-coded borders based on status
  - Hover effects and animations
  - Clear visual hierarchy
  - Status badges
  - Due date highlighting (overdue in red, due today in orange)
  - Quick action buttons

**Features:**
- Responsive grid (1 column mobile, 2 columns tablet, 3 columns desktop)
- Click card to update status
- Visual indicators for overdue/due today tasks
- Better spacing and typography

## Database Setup

**Run these SQL scripts in order:**

1. **Login/Logout Tracking:**
   ```sql
   -- Run in Supabase SQL Editor
   docs/ADD_LOGIN_LOGOUT_TRACKING.sql
   ```

2. **Status History (if not already run):**
   ```sql
   docs/ADD_TASKS_STATUS_HISTORY.sql
   ```

## Testing Checklist

### Logout/Login Tracking:
- [ ] Employee logs out → Reason saved to `logout_reasons` table
- [ ] Employee logs out → `logout_time` updated in `users` table
- [ ] Employee logs in → `login_time` and `last_login` updated in `users` table
- [ ] Admin logs out → No reason required, no entry in `logout_reasons`
- [ ] "Meeting / Field Visit" logout → Follow-up task created

### Quotation Account Selection:
- [ ] W-Beam page shows account dropdown before sub-account
- [ ] Thrie page shows account dropdown before sub-account
- [ ] Double W-Beam page shows account dropdown before sub-account
- [ ] Signages page shows account dropdown before sub-account
- [ ] Sub-account dropdown only shows sub-accounts for selected account
- [ ] Quotation saves with `account_id` in database

### Tasks Page:
- [ ] Tasks display in card grid layout
- [ ] Cards show correct status colors
- [ ] Overdue tasks highlighted in red
- [ ] Due today tasks highlighted in orange
- [ ] Click card opens status update modal
- [ ] History button works for tasks with status history

---

**All changes are backward compatible and won't break existing functionality.**
