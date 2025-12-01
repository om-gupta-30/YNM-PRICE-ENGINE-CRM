# Dummy Data Setup Instructions

## Overview
This document explains how to set up comprehensive dummy data that links the Price Engine and CRM systems.

## What's Included
The dummy data script (`DUMMY_DATA_CRM_PRICE_ENGINE.sql`) creates:

### Accounts (10 Total)
- **Enterprise Accounts**: Tata Infrastructure, Reliance Industries, Adani Group
- **SMB Accounts**: Maharashtra Roadways, Gujarat Construction, Karnataka Builders
- **Pan India Accounts**: National Highways Corp, India Infrastructure
- **Regional Accounts**: Delhi Metro Rail Corp, Hyderabad Construction

### Sub-Accounts (16 Total)
- Multiple branches per major account
- Assigned to different employees (Employee1, Employee2, Employee3)
- Various engagement scores (35-90)

### Contacts (16 Total)
- Key decision makers and managers
- Different call statuses (Connected, DNP, ATCBL, Unable to connect)
- Follow-up dates set for some contacts

### Quotations (18 Total)
- **MBCB**: 10 quotations (W-Beam, Thrie Beam, Double W-Beam)
- **Signages**: 6 quotations
- **Paint**: 2 quotations
- **Statuses include**:
  - Closed Won (5) - High value successful quotations
  - Sent (4) - Quotations sent to clients
  - Negotiation (2) - Active negotiations
  - Draft (4) - Work in progress
  - On Hold (2) - Paused quotations
  - Closed Lost (1) - Unsuccessful quotations

### Activities (8 Total)
- Calls, Notes, Quotation creation logs

### Leads (3 Total)
- New leads, In Progress, Quotation Sent

### Tasks (5 Total)
- Follow-ups, Meetings, Calls
- Various statuses and due dates

## Setup Instructions

### Step 1: Backup Existing Data (Optional but Recommended)
```sql
-- Export existing data if you want to keep it
-- Use Supabase dashboard export feature or pg_dump
```

### Step 2: Run the SQL Script
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Create a new query
4. Copy the entire contents of `docs/DUMMY_DATA_CRM_PRICE_ENGINE.sql`
5. Paste into the SQL Editor
6. Click "Run" to execute

### Step 3: Verify Data
After running the script, verify the data:

```sql
-- Check accounts
SELECT id, account_name, company_stage, company_tag, engagement_score FROM accounts ORDER BY id;

-- Check sub-accounts
SELECT id, account_id, sub_account_name, assigned_employee, engagement_score FROM sub_accounts ORDER BY account_id, id;

-- Check quotations
SELECT 
  (SELECT COUNT(*) FROM quotes_mbcb) as mbcb_quotes,
  (SELECT COUNT(*) FROM quotes_signages) as signages_quotes,
  (SELECT COUNT(*) FROM quotes_paint) as paint_quotes;

-- Check quotations by status
SELECT status, COUNT(*) 
FROM (
  SELECT status FROM quotes_mbcb
  UNION ALL
  SELECT status FROM quotes_signages
  UNION ALL
  SELECT status FROM quotes_paint
) all_quotes
GROUP BY status;
```

## How Data is Linked

### Price Engine ↔ CRM Linking
1. **Accounts** (Parent companies in CRM)
   - Multiple **Sub-Accounts** (Branches/locations)
   - Each Sub-Account has **Contacts**

2. **Quotations** (From Price Engine)
   - Linked to **Sub-Accounts** via `sub_account_id`
   - When you create a quotation in Price Engine, select a Sub-Account
   - Quotations appear in:
     - Account Details page (via sub-accounts)
     - Quotation History page
     - Employee dashboard

3. **Engagement Scores**
   - Calculated automatically from activities
   - Quotations create engagement (+15 for creation, +20 for Closed Won)
   - Updated when status changes

### Example Flow
1. **Account**: "Tata Infrastructure Ltd"
2. **Sub-Account**: "Tata Infrastructure - Mumbai Branch" (assigned to Employee1)
3. **Contact**: "Rajesh Kumar" (Project Manager)
4. **Quotation**: Created from Price Engine → Saved with `sub_account_id = 1`
5. **Result**: Quotation appears in:
   - Account Details page for Tata Infrastructure
   - Sub-account's quotation list
   - Employee1's quotation history

## Testing the Integration

### Test Account Details Page
1. Go to CRM → Accounts
2. Click "Details" on any account (e.g., "Tata Infrastructure Ltd")
3. Go to "Quotations" tab
4. You should see all quotations linked to that account's sub-accounts

### Test Price Engine → CRM Link
1. Go to Price Engine → W-Beam
2. Select a Sub-Account (e.g., "Tata Infrastructure - Mumbai Branch")
3. Create and save a quotation
4. Go to CRM → Accounts → Tata Infrastructure Ltd → Details → Quotations
5. The new quotation should appear there

### Test Engagement Scores
1. Go to CRM → Accounts
2. Check engagement scores (should show aggregated scores from sub-accounts)
3. Go to Sub-Accounts page for an account
4. Individual sub-account scores should be visible

## Key Features Demonstrated

### ✅ Multiple Engagement Levels
- High engagement (80-90): Enterprise accounts with multiple closed won quotations
- Medium engagement (50-70): Regular clients with ongoing projects
- Low engagement (35-45): New prospects

### ✅ Various Quotation Statuses
- **Closed Won**: High-value successful deals
- **Negotiation**: Active discussions
- **Sent**: Quotations awaiting response
- **Draft**: Work in progress
- **On Hold**: Paused projects
- **Closed Lost**: Unsuccessful attempts

### ✅ Employee Assignment
- Different sub-accounts assigned to Employee1, Employee2, Employee3
- Each employee can see their assigned accounts and quotations
- Admin can see all accounts

### ✅ Complete CRM Features
- Accounts with multiple branches (sub-accounts)
- Contacts with different call statuses
- Activities tracking
- Leads management
- Task management

## Customization

To add more dummy data, follow the pattern in the SQL script:

```sql
-- Add new account
INSERT INTO accounts (...) VALUES (...);

-- Add sub-accounts
INSERT INTO sub_accounts (account_id, ...) VALUES (...);

-- Add quotations
INSERT INTO quotes_mbcb (sub_account_id, ...) VALUES (...);
```

Make sure to:
1. Link quotations to existing sub-accounts via `sub_account_id`
2. Use valid `state_id` and `city_id` from your states/cities tables
3. Set appropriate status values (draft, sent, negotiation, on_hold, closed_won, closed_lost)

## Troubleshooting

### Quotations Not Showing in Account Details
- Verify `sub_account_id` in quotations matches `id` in `sub_accounts`
- Verify `account_id` in sub_accounts matches account ID
- Check the API endpoint `/api/accounts/[id]/related` returns data

### Engagement Scores Not Updating
- Engagement scores are calculated from sub-account activities
- Update sub-account scores manually if needed:
  ```sql
  UPDATE sub_accounts SET engagement_score = 75 WHERE id = 1;
  ```
- Account scores auto-update from sub-account sums

### Missing State/City Data
- Ensure states and cities tables are populated
- The script uses IDs 1-5 for states and 1-10 for cities
- Adjust IDs in the script to match your existing data

## Support

If you encounter issues:
1. Check Supabase logs for SQL errors
2. Verify table structures match the expected schema
3. Ensure foreign key relationships are correct
4. Check RLS policies allow data insertion

