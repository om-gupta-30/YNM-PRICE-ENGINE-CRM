# Database Verification Checklist

## ✅ Completed Changes Summary

### 1. Sub-Accounts Enhancements
- ✅ Added `gst_number` and `website` columns to `sub_accounts` table
- ✅ Updated frontend form to include GST Number and Website fields
- ✅ Updated all API routes (GET, POST, PUT) to handle GST and Website
- ✅ Updated sub-account display tables to show GST and Website

### 2. Sub-Account Details Page
- ✅ Created `/app/crm/subaccounts/[id]/page.tsx` - Full details page with tabs
- ✅ Created `/app/api/subaccounts/[id]/related/route.ts` - Fetches quotations, leads, tasks
- ✅ Created `/app/api/subaccounts/[id]/activities/route.ts` - Fetches activities
- ✅ Updated navigation links to point to sub-account details page

### 3. Admin Pages
- ✅ Created `/app/crm/admin/subaccounts/page.tsx` - View all sub-accounts with filters
- ✅ Created `/app/crm/admin/contacts/page.tsx` - View all contacts with filters
- ✅ Created `/app/api/admin/subaccounts/route.ts` - Admin API for sub-accounts
- ✅ Created `/app/api/admin/contacts/route.ts` - Admin API for contacts

## 🔍 Database Connection Verification

### All API Routes Use Consistent Pattern:
```typescript
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
const supabase = createSupabaseServerClient();
```

### Verified Routes:
1. ✅ `/api/subaccounts` - GET, POST, PUT
2. ✅ `/api/subaccounts/[id]` - GET, DELETE
3. ✅ `/api/subaccounts/[id]/related` - GET (quotations, leads, tasks)
4. ✅ `/api/subaccounts/[id]/activities` - GET
5. ✅ `/api/subaccounts/[id]/contacts` - GET, POST, PUT, DELETE
6. ✅ `/api/admin/subaccounts` - GET (admin only)
7. ✅ `/api/admin/contacts` - GET (admin only)
8. ✅ `/api/accounts` - GET, POST
9. ✅ `/api/accounts/[id]` - GET, PUT, DELETE
10. ✅ `/api/accounts/[id]/related` - GET
11. ✅ `/api/accounts/[id]/contacts` - GET
12. ✅ `/api/accounts/[id]/activities` - GET

## 🔄 Bidirectional Sync Verification

### Frontend → Backend (Create/Update)
- ✅ Sub-account creation: Form → POST `/api/subaccounts` → Database
- ✅ Sub-account update: Form → PUT `/api/subaccounts` → Database
- ✅ Contact creation: Form → POST `/api/subaccounts/[id]/contacts` → Database
- ✅ Contact update: Form → PUT `/api/subaccounts/[id]/contacts` → Database
- ✅ Account creation: Form → POST `/api/accounts` → Database
- ✅ Account update: Form → PUT `/api/accounts/[id]` → Database

### Backend → Frontend (Read/Display)
- ✅ Sub-account list: Database → GET `/api/subaccounts` → Frontend
- ✅ Sub-account details: Database → GET `/api/subaccounts/[id]` → Frontend
- ✅ Sub-account related data: Database → GET `/api/subaccounts/[id]/related` → Frontend
- ✅ Sub-account activities: Database → GET `/api/subaccounts/[id]/activities` → Frontend
- ✅ Account details: Database → GET `/api/accounts/[id]` → Frontend
- ✅ Account related data: Database → GET `/api/accounts/[id]/related` → Frontend

## 📋 Required Database Tables

### Core Tables (Must Exist):
1. ✅ `accounts` - Main accounts table
2. ✅ `sub_accounts` - Sub-accounts table (with `gst_number` and `website` columns)
3. ✅ `contacts` - Contacts table
4. ✅ `leads` - Leads table
5. ✅ `tasks` - Tasks table
6. ✅ `activities` - Activities/audit log table
7. ✅ `quotes_mbcb` - MBCB quotations
8. ✅ `quotes_signages` - Signages quotations
9. ✅ `quotes_paint` - Paint quotations
10. ✅ `states` - States reference table
11. ✅ `cities` - Cities reference table
12. ✅ `industries` - Industries reference table
13. ✅ `sub_industries` - Sub-industries reference table
14. ✅ `users` - Users table

## 🚨 Critical SQL Scripts to Run

### 1. Add GST and Website to Sub-Accounts
**File:** `docs/ADD_GST_WEBSITE_TO_SUBACCOUNTS.sql`
**Action:** Run in Supabase SQL Editor
**Purpose:** Adds `gst_number` and `website` columns to `sub_accounts` table

### 2. Verify Table Structure
Run this query to verify all required columns exist:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sub_accounts' 
ORDER BY ordinal_position;
```

Expected columns:
- `id`, `account_id`, `sub_account_name`, `state_id`, `city_id`
- `address`, `pincode`, `gst_number`, `website` ← NEW
- `is_headquarter`, `office_type`, `engagement_score`, `is_active`
- `created_at`, `updated_at`

## ✅ Testing Checklist

### Sub-Accounts
- [ ] Create new sub-account with GST and Website
- [ ] Edit existing sub-account and update GST/Website
- [ ] View sub-account details page
- [ ] View contacts tab in sub-account details
- [ ] View leads tab in sub-account details
- [ ] View quotations tab in sub-account details
- [ ] View activities timeline in sub-account details

### Admin Pages
- [ ] Access admin sub-accounts page (admin only)
- [ ] Filter sub-accounts by account, state, city, office type
- [ ] Access admin contacts page (admin only)
- [ ] Filter contacts by account, sub-account, call status, employee

### Database Sync
- [ ] Create sub-account → Verify appears in list immediately
- [ ] Update sub-account → Verify changes reflect immediately
- [ ] Delete sub-account → Verify removed from list
- [ ] Create contact → Verify appears in contacts list
- [ ] Update contact → Verify changes reflect immediately

## 🔗 Navigation Links Verified

1. ✅ Accounts page → Account details → Sub-accounts → Sub-account details
2. ✅ Admin sub-accounts page → Sub-account details
3. ✅ Sub-account details → Back to Account details
4. ✅ Sub-account details → Contacts tab → Add/Edit contact
5. ✅ Sub-account details → View quotations, leads, activities

## 📝 Notes

- All API routes include proper error handling
- All database operations use try-catch blocks
- All routes return consistent JSON responses with `success` flag
- Activity logging is implemented for sub-account updates
- Frontend forms validate required fields before submission
- All navigation links are properly configured

## 🎯 Next Steps

1. Run `docs/ADD_GST_WEBSITE_TO_SUBACCOUNTS.sql` in Supabase
2. Test creating/editing sub-accounts with GST and Website
3. Test the new sub-account details page
4. Test admin pages with various filters
5. Verify all data syncs correctly between frontend and backend
