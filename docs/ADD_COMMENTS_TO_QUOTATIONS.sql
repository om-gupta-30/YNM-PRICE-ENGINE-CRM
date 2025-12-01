-- Add comments column to all quotation tables
-- This allows employees to add comments for each quotation

-- Add comments column to quotes_mbcb table
ALTER TABLE quotes_mbcb 
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Add comments column to quotes_signages table
ALTER TABLE quotes_signages 
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Add comments column to quotes_paint table
ALTER TABLE quotes_paint 
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Add comments to status columns
COMMENT ON COLUMN quotes_mbcb.comments IS 'Comments/notes for this quotation';
COMMENT ON COLUMN quotes_signages.comments IS 'Comments/notes for this quotation';
COMMENT ON COLUMN quotes_paint.comments IS 'Comments/notes for this quotation';

