-- Add account_id column to quotes tables if it doesn't exist
-- This allows direct relationship between quotes and accounts

DO $$
BEGIN
  -- Add account_id to quotes_mbcb
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'quotes_mbcb'
      AND column_name = 'account_id'
  ) THEN
    ALTER TABLE quotes_mbcb
      ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_account_id ON quotes_mbcb(account_id);
    
    RAISE NOTICE '✅ Added account_id column to quotes_mbcb table';
  ELSE
    RAISE NOTICE 'ℹ️ account_id column already exists on quotes_mbcb table';
  END IF;

  -- Add account_id to quotes_signages
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'quotes_signages'
      AND column_name = 'account_id'
  ) THEN
    ALTER TABLE quotes_signages
      ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_quotes_signages_account_id ON quotes_signages(account_id);
    
    RAISE NOTICE '✅ Added account_id column to quotes_signages table';
  ELSE
    RAISE NOTICE 'ℹ️ account_id column already exists on quotes_signages table';
  END IF;

  -- Add account_id to quotes_paint
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'quotes_paint'
      AND column_name = 'account_id'
  ) THEN
    ALTER TABLE quotes_paint
      ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_quotes_paint_account_id ON quotes_paint(account_id);
    
    RAISE NOTICE '✅ Added account_id column to quotes_paint table';
  ELSE
    RAISE NOTICE 'ℹ️ account_id column already exists on quotes_paint table';
  END IF;
END $$;
