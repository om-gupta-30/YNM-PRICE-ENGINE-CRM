# Dummy Data Summary

## What Gets Created

After running `COMPLETE_DATABASE_REBUILD.sql`, you'll have:

### 📊 3 Parent Accounts
1. **ABC Infrastructure Ltd** (Enterprise, Customer)
2. **XYZ Constructions Pvt Ltd** (SMB, Prospect)
3. **Highway Solutions India** (Pan India, Customer)

### 👥 9 Sub-Accounts (3 per Employee)

#### Employee1 (3 sub-accounts):
- ABC Infra - Bangalore Branch (Engagement: 75)
- ABC Infra - Mumbai Branch (Engagement: 65)
- ABC Infra - Delhi Branch (Engagement: 55)

#### Employee2 (3 sub-accounts):
- XYZ Constructions - Main Office (Engagement: 80)
- XYZ Constructions - Site A (Engagement: 70)
- XYZ Constructions - Site B (Engagement: 60)

#### Employee3 (3 sub-accounts):
- Highway Solutions - North Zone (Engagement: 85)
- Highway Solutions - South Zone (Engagement: 75)
- Highway Solutions - East Zone (Engagement: 65)

### 📇 12+ Contacts

Each sub-account has 1-2 contacts with:
- Names, designations, emails, phones
- Call statuses (Connected, ATCBL, DNP)
- Follow-up dates (some contacts have scheduled follow-ups)
- Notes

### 📄 3 Sample Quotations

- Employee1: W-Beam quotation for ABC Infra - Bangalore Branch (Status: sent)
- Employee2: Signages quotation for XYZ Constructions - Main Office (Status: negotiation)
- Employee3: Thrie-Beam quotation for Highway Solutions - North Zone (Status: draft)

## How to Test

### 1. Login as Employee1
- Go to Price Engine
- See 3 sub-accounts in dropdown: "ABC Infra - Bangalore Branch", "ABC Infra - Mumbai Branch", "ABC Infra - Delhi Branch"
- Create quotations linked to these sub-accounts

### 2. Login as Employee2
- See 3 sub-accounts: "XYZ Constructions - Main Office", "Site A", "Site B"

### 3. Login as Employee3
- See 3 sub-accounts: "Highway Solutions - North Zone", "South Zone", "East Zone"

### 4. CRM Navigation
- **Accounts** → See 3 accounts with engagement scores (sum of sub-accounts)
- **View Sub-Accounts** → See sub-accounts per account
- **View Contacts** → See contacts per sub-account

## Database Structure

```
accounts
  └── sub_accounts (assigned to employees)
       ├── contacts (multiple per sub-account)
       └── quotations (quotes_mbcb, quotes_signages, quotes_paint)
```

## Notes

- All dummy data is properly linked with foreign keys
- Engagement scores are set on sub-accounts
- Some contacts have follow-up dates for notification testing
- Quotations are linked to sub-accounts via `sub_account_id`
- Everything is ready to test immediately!

