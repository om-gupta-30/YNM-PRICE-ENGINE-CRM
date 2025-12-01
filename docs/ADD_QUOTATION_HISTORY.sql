-- Add history columns to track all status and comment changes
-- This allows viewing all status updates and comments, not just the latest

-- Add status_history column to quotes_mbcb table
ALTER TABLE quotes_mbcb 
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- Add comments_history column to quotes_mbcb table
ALTER TABLE quotes_mbcb 
ADD COLUMN IF NOT EXISTS comments_history JSONB DEFAULT '[]'::jsonb;

-- Add status_history column to quotes_signages table
ALTER TABLE quotes_signages 
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- Add comments_history column to quotes_signages table
ALTER TABLE quotes_signages 
ADD COLUMN IF NOT EXISTS comments_history JSONB DEFAULT '[]'::jsonb;

-- Add status_history column to quotes_paint table
ALTER TABLE quotes_paint 
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- Add comments_history column to quotes_paint table
ALTER TABLE quotes_paint 
ADD COLUMN IF NOT EXISTS comments_history JSONB DEFAULT '[]'::jsonb;

-- Add comments to columns
COMMENT ON COLUMN quotes_mbcb.status_history IS 'Array of status changes with timestamps: [{"status": "draft", "updated_by": "user", "updated_at": "timestamp"}]';
COMMENT ON COLUMN quotes_mbcb.comments_history IS 'Array of comment changes with timestamps: [{"comment": "text", "updated_by": "user", "updated_at": "timestamp"}]';
COMMENT ON COLUMN quotes_signages.status_history IS 'Array of status changes with timestamps: [{"status": "draft", "updated_by": "user", "updated_at": "timestamp"}]';
COMMENT ON COLUMN quotes_signages.comments_history IS 'Array of comment changes with timestamps: [{"comment": "text", "updated_by": "user", "updated_at": "timestamp"}]';
COMMENT ON COLUMN quotes_paint.status_history IS 'Array of status changes with timestamps: [{"status": "draft", "updated_by": "user", "updated_at": "timestamp"}]';
COMMENT ON COLUMN quotes_paint.comments_history IS 'Array of comment changes with timestamps: [{"comment": "text", "updated_by": "user", "updated_at": "timestamp"}]';

