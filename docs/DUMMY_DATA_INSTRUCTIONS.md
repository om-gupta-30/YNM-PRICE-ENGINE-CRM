# Dummy Data Instructions - Accounts, Sub-Accounts, and Contacts

This document explains how to add dummy data for testing the CRM system.

## Overview

The SQL script creates:
- **9 Accounts** (3 per employee: Employee1, Employee2, Employee3)
- **18 Sub-Accounts** (2 per account)
- **27 Contacts** (1-2 per sub-account, varying distribution)

## How to Run

1. **Open Supabase SQL Editor**
   - Go to your Supabase project
   - Navigate to SQL Editor

2. **Run the SQL Script**
   - Open the file: `docs/DUMMY_DATA_ACCOUNTS_SUBACCOUNTS_CONTACTS.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

3. **Verify the Data**
   - The script includes verification queries at the end
   - Check the results to confirm:
     - 9 accounts total
     - 3 accounts per employee
     - 2 sub-accounts per account (18 total)
     - 27 contacts total (distributed across sub-accounts)

## Data Structure

### Employee1's Accounts (3 accounts)
1. **TechCorp Solutions** (Enterprise, Customer)
   - TechCorp Bangalore Office (2 contacts)
   - TechCorp Mumbai Branch (1 contact)

2. **InfraBuild Pvt Ltd** (SMB, Prospect)
   - InfraBuild Main Office (2 contacts)
   - InfraBuild Site Office (1 contact)

3. **Highway Developers Inc** (Pan India, New)
   - Highway Developers North (2 contacts)
   - Highway Developers South (1 contact)

### Employee2's Accounts (3 accounts)
1. **RoadSafe Engineering** (Enterprise, Onboard)
   - RoadSafe HQ (2 contacts)
   - RoadSafe Regional Office (1 contact)

2. **Metro Construction Co** (SMB, Customer)
   - Metro Construction Chennai (2 contacts)
   - Metro Construction Coimbatore (1 contact)

3. **Urban Infrastructure Ltd** (Pan India, Prospect)
   - Urban Infrastructure Pune (2 contacts)
   - Urban Infrastructure Nashik (1 contact)

### Employee3's Accounts (3 accounts)
1. **National Highways Corp** (Enterprise, Customer)
   - NHC Eastern Region (2 contacts)
   - NHC Western Region (1 contact)

2. **City Development Authority** (SMB, Onboard)
   - CDA Ahmedabad Main (2 contacts)
   - CDA Gandhinagar Branch (1 contact)

3. **Smart Roads Pvt Ltd** (Pan India, New)
   - Smart Roads Jaipur (2 contacts)
   - Smart Roads Udaipur (1 contact)

## Viewing the Data in Frontend

### Accounts List Page
- Navigate to: `/crm/accounts`
- You should see all 9 accounts listed
- Each account shows:
  - Account name
  - Company stage and tag
  - Assigned employee
  - Engagement score (initially 0)

### Account Details Page
- Click on any account from the list
- Navigate to: `/crm/accounts/[id]`
- You'll see tabs for:
  - **Overview**: Account details, sub-accounts list
  - **Contacts**: All contacts for the account and its sub-accounts
  - **Leads**: Leads linked to the account
  - **Quotations**: Quotations for the account
  - **Tasks**: Tasks related to the account
  - **Activities**: Activity timeline

### Sub-Accounts
- In the Overview tab, you'll see all sub-accounts for the account
- Each sub-account shows:
  - Sub-account name
  - Engagement score
  - Assigned employee

### Contacts
- In the Contacts tab, you'll see all contacts
- Contacts are organized by sub-account
- Each contact shows:
  - Name and designation
  - Email and phone
  - Call status
  - Follow-up date (if set)
  - Notes

## Contact Details

Each contact includes:
- **Name**: Realistic Indian names
- **Designation**: Relevant job titles (CEO, Manager, Director, etc.)
- **Email**: Company email addresses
- **Phone**: Indian phone numbers (+91 format)
- **Call Status**: Mix of statuses:
  - Connected
  - ATCBL (Available to Call Back Later)
  - DNP (Do Not Pursue)
- **Notes**: Brief description of the contact's role

## Testing Scenarios

### For Employee1
1. Login as `Employee1` / `Employee1@123`
2. Go to Accounts page
3. You should see 3 accounts:
   - TechCorp Solutions
   - InfraBuild Pvt Ltd
   - Highway Developers Inc
4. Click on any account to see sub-accounts and contacts

### For Employee2
1. Login as `Employee2` / `Employee2@123`
2. Go to Accounts page
3. You should see 3 accounts:
   - RoadSafe Engineering
   - Metro Construction Co
   - Urban Infrastructure Ltd

### For Employee3
1. Login as `Employee3` / `Employee3@123`
2. Go to Accounts page
3. You should see 3 accounts:
   - National Highways Corp
   - City Development Authority
   - Smart Roads Pvt Ltd

### For Admin
1. Login as `Admin` / `Admin@123`
2. Go to Accounts page
3. You should see ALL 9 accounts (no filtering by employee)

## Verification Queries

After running the script, you can run these queries to verify:

```sql
-- Count accounts per employee
SELECT 
  assigned_employee,
  COUNT(*) as account_count
FROM accounts
GROUP BY assigned_employee;

-- Count sub-accounts per account
SELECT 
  a.account_name,
  a.assigned_employee,
  COUNT(sa.id) as sub_account_count
FROM accounts a
LEFT JOIN sub_accounts sa ON sa.account_id = a.id
GROUP BY a.id, a.account_name, a.assigned_employee
ORDER BY a.assigned_employee, a.account_name;

-- Count contacts per sub-account
SELECT 
  a.account_name,
  sa.sub_account_name,
  COUNT(c.id) as contact_count
FROM accounts a
JOIN sub_accounts sa ON sa.account_id = a.id
LEFT JOIN contacts c ON c.sub_account_id = sa.id
GROUP BY a.account_name, sa.sub_account_name
ORDER BY a.account_name, sa.sub_account_name;
```

## Notes

- All accounts are set to `is_active = true`
- All sub-accounts are set to `is_active = true`
- Engagement scores start at 0 (will update as activities are created)
- Contacts have realistic Indian names and company email addresses
- The script uses `ON CONFLICT DO NOTHING` to prevent duplicate entries if run multiple times

## Troubleshooting

### If accounts don't appear:
1. Check if the accounts table exists
2. Verify the assigned_employee values match: 'Employee1', 'Employee2', 'Employee3'
3. Check if there are any foreign key constraint errors

### If sub-accounts don't appear:
1. Verify the accounts were created successfully
2. Check the sub_accounts table exists
3. Verify the foreign key relationship to accounts

### If contacts don't appear:
1. Verify both accounts and sub_accounts were created
2. Check the contacts table exists
3. Verify the foreign key relationships (account_id and sub_account_id)

### If data appears in database but not in frontend:
1. Check browser console for errors
2. Verify API endpoints are working: `/api/accounts`, `/api/subaccounts`
3. Check network tab for failed API calls
4. Verify user authentication and permissions

## Next Steps

After adding the dummy data:
1. Test creating new contacts
2. Test creating activities
3. Test creating leads linked to accounts
4. Test creating quotations for sub-accounts
5. Test the engagement score calculation

---

**Last Updated**: 2024
**Script Version**: 1.0.0
