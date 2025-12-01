# Additional Dummy Data for YNM Safety CRM

## Overview
This SQL script (`ADD_MORE_DUMMY_DATA.sql`) adds comprehensive dummy data to demonstrate the full functionality of the CRM system.

## What's Included

### 1. **15 New Accounts**
   - Reliance Industries Ltd (Enterprise, Customer, 95 engagement score)
   - L&T Infrastructure (Enterprise, Customer, 88 engagement score)
   - GMR Group (Enterprise, Prospect, 72 engagement score)
   - IRB Infrastructure (SMB, Customer, 65 engagement score)
   - Welspun Enterprises (SMB, Onboard, 45 engagement score)
   - NCC Limited (SMB, Customer, 58 engagement score)
   - Simplex Infrastructure (SMB, Needs Attention, 35 engagement score)
   - Essar Projects (SMB, Renewal, 50 engagement score)
   - GVK Power & Infrastructure (Enterprise, Prospect, 62 engagement score)
   - Hindustan Construction Company (Enterprise, Customer, 85 engagement score)
   - Dilip Buildcon (SMB, Upselling, 75 engagement score)
   - PNC Infratech (SMB, Customer, 68 engagement score)
   - KNR Constructions (SMB, Retention, 40 engagement score)
   - Sadbhav Engineering (SMB, Lapsed, 25 engagement score)
   - MEP Infrastructure (SMB, New, 30 engagement score)

### 2. **25+ Sub-Accounts**
   - Each account has 1-3 sub-accounts
   - Assigned to Employee1, Employee2, or Employee3
   - Includes state and city information
   - Various engagement scores (25-95)

### 3. **40+ Contacts**
   - Multiple contacts per sub-account
   - Various designations (VP, GM, PM, etc.)
   - Different call statuses:
     - Connected
     - ATCBL (Attempted to Call Back Later)
     - DNP (Did Not Pick)
     - Unable to connect
     - Wrong number
   - **Follow-up dates** including:
     - **Today's follow-ups** (for testing notifications)
     - Tomorrow's follow-ups
     - Future follow-ups (3-12 days from now)

### 4. **Activities**
   - Call logs
   - Notes
   - Timestamps for engagement tracking

### 5. **Sample Quotations**
   - W-Beam quotations (draft, sent, closed_won statuses)
   - Double W-Beam quotations (negotiation status)
   - Signages quotations (sent status)

## How to Run

1. Open your Supabase SQL Editor
2. Copy the entire contents of `ADD_MORE_DUMMY_DATA.sql`
3. Paste and run the script
4. The script uses `ON CONFLICT DO NOTHING` to avoid duplicates if run multiple times

## Expected Results

After running the script, you should see:

- **Accounts Page**: 15+ accounts with various engagement scores and tags
- **Sub-Accounts**: Multiple sub-accounts for each account
- **Contacts Page**: 40+ contacts with different statuses
- **Notification Bell**: Several follow-up notifications (including today's follow-ups)
- **Quotation History**: Sample quotations in different statuses
- **Activities Timeline**: Activity logs showing engagement history

## Testing Features

### Notification Bell
The script includes contacts with follow-up dates set to **today**, which will appear in your notification bell for immediate testing.

### Engagement Scores
Various engagement scores (25-95) to test:
- Color coding (red, yellow, orange, green)
- Sorting functionality
- Engagement score modals

### Multiple Statuses
Quotations include different statuses:
- draft
- sent
- negotiation
- closed_won
- on_hold

## Notes

- The script checks for existing data and won't duplicate if accounts/sub-accounts already exist
- Follow-up dates are relative to when you run the script
- Engagement scores are set to demonstrate the scoring system
- All data is realistic and representative of actual CRM usage

## Troubleshooting

If you encounter any errors:
1. Check that all required tables exist (accounts, sub_accounts, contacts, etc.)
2. Verify that states and cities tables have the required data
3. Ensure foreign key constraints are satisfied
4. Check that employee usernames match (Employee1, Employee2, Employee3)

