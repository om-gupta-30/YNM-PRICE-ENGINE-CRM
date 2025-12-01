-- ============================================
-- UPDATE CONTACTS TABLE FOR SUB-ACCOUNTS
-- This script adds sub_account_id to contacts table
-- ============================================

-- Add sub_account_id column to contacts table if it doesn't exist
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE CASCADE;

-- Create index for sub_account_id
CREATE INDEX IF NOT EXISTS idx_contacts_sub_account_id ON contacts(sub_account_id);

-- Migrate existing contacts to sub-accounts if possible
-- Note: This assumes contacts were linked to accounts
-- You may need to manually assign sub_account_id for existing contacts
-- UPDATE contacts SET sub_account_id = (SELECT id FROM sub_accounts WHERE account_id = contacts.account_id LIMIT 1) WHERE sub_account_id IS NULL;

-- ============================================
-- END OF SCRIPT
-- ============================================

