-- Add status column to all quotation tables
-- This allows tracking quotation status (draft, sent, accepted, rejected, on_hold, etc.)

-- Add status column to quotes_mbcb table
ALTER TABLE quotes_mbcb 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Add status column to quotes_signages table
ALTER TABLE quotes_signages 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Add status column to quotes_paint table
ALTER TABLE quotes_paint 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Update existing records to have 'draft' status if null
UPDATE quotes_mbcb SET status = 'draft' WHERE status IS NULL;
UPDATE quotes_signages SET status = 'draft' WHERE status IS NULL;
UPDATE quotes_paint SET status = 'draft' WHERE status IS NULL;

-- Add comment to status column
COMMENT ON COLUMN quotes_mbcb.status IS 'Quotation status: draft, sent, accepted, rejected, on_hold, etc.';
COMMENT ON COLUMN quotes_signages.status IS 'Quotation status: draft, sent, accepted, rejected, on_hold, etc.';
COMMENT ON COLUMN quotes_paint.status IS 'Quotation status: draft, sent, accepted, rejected, on_hold, etc.';

-- Verify the columns were added:
-- SELECT column_name, data_type, column_default FROM information_schema.columns 
-- WHERE table_name IN ('quotes_mbcb', 'quotes_signages', 'quotes_paint') 
-- AND column_name = 'status';

