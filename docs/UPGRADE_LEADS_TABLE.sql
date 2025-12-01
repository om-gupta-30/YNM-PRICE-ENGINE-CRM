-- SQL Query to Upgrade Leads Table for Enhanced Features
-- Run this in your Supabase SQL Editor

-- Ensure leads table exists with correct structure
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  lead_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  requirements TEXT,
  lead_source TEXT,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Quotation Sent', 'Follow-up', 'Follow-Up', 'Closed Won', 'Closed Lost', 'Closed', 'Lost')),
  assigned_employee TEXT,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  -- Add account_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'account_id') THEN
    ALTER TABLE leads ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;

  -- Add sub_account_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'sub_account_id') THEN
    ALTER TABLE leads ADD COLUMN sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL;
  END IF;

  -- Add assigned_employee if missing (rename from assigned_to if exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'assigned_employee') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'assigned_to') THEN
      ALTER TABLE leads RENAME COLUMN assigned_to TO assigned_employee;
    ELSE
      ALTER TABLE leads ADD COLUMN assigned_employee TEXT;
    END IF;
  END IF;

  -- Ensure status column accepts new values
  ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
  ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN ('New', 'In Progress', 'Quotation Sent', 'Follow-up', 'Follow-Up', 'Closed Won', 'Closed Lost', 'Closed', 'Lost'));

  -- Normalize status values: 'Closed' -> 'Closed Won', 'Lost' -> 'Closed Lost'
  UPDATE leads SET status = 'Closed Won' WHERE status = 'Closed';
  UPDATE leads SET status = 'Closed Lost' WHERE status = 'Lost';
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_employee ON leads(assigned_employee);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON leads(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_sub_account_id ON leads(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_leads_lead_source ON leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Create updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_leads_updated_at ON leads;
CREATE TRIGGER trigger_update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Verify table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leads' 
ORDER BY ordinal_position;

