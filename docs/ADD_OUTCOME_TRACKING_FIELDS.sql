/**
 * Database Migration: Add Outcome Tracking Fields
 * 
 * Purpose: Enable tracking of quotation outcomes (won/lost/pending) for
 *          learning, reporting, and analytics.
 * 
 * Tables Modified:
 * - quotes_mbcb
 * - quotes_signages
 * - quotes_paint
 * 
 * New Fields:
 * - outcome_status: ENUM/Text (pending, won, lost)
 * - outcome_notes: TEXT (optional notes about why won/lost)
 * - closed_at: DATETIME (timestamp when outcome was set)
 * 
 * Usage:
 * Run this migration in your Supabase SQL editor or via migration tool.
 */

-- ============================================
-- Create ENUM type for outcome_status
-- ============================================

-- Check if the enum type already exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outcome_status_enum') THEN
        CREATE TYPE outcome_status_enum AS ENUM ('pending', 'won', 'lost');
        RAISE NOTICE '✅ Created outcome_status_enum type';
    ELSE
        RAISE NOTICE 'ℹ️ outcome_status_enum type already exists';
    END IF;
END $$;

-- ============================================
-- 1. Add outcome fields to quotes_mbcb
-- ============================================

DO $$
BEGIN
  -- Add outcome_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_mbcb' AND column_name = 'outcome_status'
  ) THEN
    ALTER TABLE quotes_mbcb 
    ADD COLUMN outcome_status outcome_status_enum DEFAULT 'pending';
    RAISE NOTICE '✅ Added outcome_status column to quotes_mbcb table';
  ELSE
    RAISE NOTICE 'ℹ️ outcome_status column already exists on quotes_mbcb table';
  END IF;

  -- Add outcome_notes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_mbcb' AND column_name = 'outcome_notes'
  ) THEN
    ALTER TABLE quotes_mbcb 
    ADD COLUMN outcome_notes TEXT;
    RAISE NOTICE '✅ Added outcome_notes column to quotes_mbcb table';
  ELSE
    RAISE NOTICE 'ℹ️ outcome_notes column already exists on quotes_mbcb table';
  END IF;

  -- Add closed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_mbcb' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE quotes_mbcb 
    ADD COLUMN closed_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Added closed_at column to quotes_mbcb table';
  ELSE
    RAISE NOTICE 'ℹ️ closed_at column already exists on quotes_mbcb table';
  END IF;
END $$;

-- ============================================
-- 2. Add outcome fields to quotes_signages
-- ============================================

DO $$
BEGIN
  -- Add outcome_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_signages' AND column_name = 'outcome_status'
  ) THEN
    ALTER TABLE quotes_signages 
    ADD COLUMN outcome_status outcome_status_enum DEFAULT 'pending';
    RAISE NOTICE '✅ Added outcome_status column to quotes_signages table';
  ELSE
    RAISE NOTICE 'ℹ️ outcome_status column already exists on quotes_signages table';
  END IF;

  -- Add outcome_notes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_signages' AND column_name = 'outcome_notes'
  ) THEN
    ALTER TABLE quotes_signages 
    ADD COLUMN outcome_notes TEXT;
    RAISE NOTICE '✅ Added outcome_notes column to quotes_signages table';
  ELSE
    RAISE NOTICE 'ℹ️ outcome_notes column already exists on quotes_signages table';
  END IF;

  -- Add closed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_signages' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE quotes_signages 
    ADD COLUMN closed_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Added closed_at column to quotes_signages table';
  ELSE
    RAISE NOTICE 'ℹ️ closed_at column already exists on quotes_signages table';
  END IF;
END $$;

-- ============================================
-- 3. Add outcome fields to quotes_paint
-- ============================================

DO $$
BEGIN
  -- Add outcome_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_paint' AND column_name = 'outcome_status'
  ) THEN
    ALTER TABLE quotes_paint 
    ADD COLUMN outcome_status outcome_status_enum DEFAULT 'pending';
    RAISE NOTICE '✅ Added outcome_status column to quotes_paint table';
  ELSE
    RAISE NOTICE 'ℹ️ outcome_status column already exists on quotes_paint table';
  END IF;

  -- Add outcome_notes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_paint' AND column_name = 'outcome_notes'
  ) THEN
    ALTER TABLE quotes_paint 
    ADD COLUMN outcome_notes TEXT;
    RAISE NOTICE '✅ Added outcome_notes column to quotes_paint table';
  ELSE
    RAISE NOTICE 'ℹ️ outcome_notes column already exists on quotes_paint table';
  END IF;

  -- Add closed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_paint' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE quotes_paint 
    ADD COLUMN closed_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ Added closed_at column to quotes_paint table';
  ELSE
    RAISE NOTICE 'ℹ️ closed_at column already exists on quotes_paint table';
  END IF;
END $$;

-- ============================================
-- 4. Create indexes for better query performance
-- ============================================

-- Index on outcome_status for filtering
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_outcome_status 
ON quotes_mbcb(outcome_status);

CREATE INDEX IF NOT EXISTS idx_quotes_signages_outcome_status 
ON quotes_signages(outcome_status);

CREATE INDEX IF NOT EXISTS idx_quotes_paint_outcome_status 
ON quotes_paint(outcome_status);

-- Index on closed_at for date-based queries
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_closed_at 
ON quotes_mbcb(closed_at);

CREATE INDEX IF NOT EXISTS idx_quotes_signages_closed_at 
ON quotes_signages(closed_at);

CREATE INDEX IF NOT EXISTS idx_quotes_paint_closed_at 
ON quotes_paint(closed_at);

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_outcome_closed 
ON quotes_mbcb(outcome_status, closed_at);

CREATE INDEX IF NOT EXISTS idx_quotes_signages_outcome_closed 
ON quotes_signages(outcome_status, closed_at);

CREATE INDEX IF NOT EXISTS idx_quotes_paint_outcome_closed 
ON quotes_paint(outcome_status, closed_at);

-- ============================================
-- 5. Add comments for documentation
-- ============================================

COMMENT ON COLUMN quotes_mbcb.outcome_status IS 'Outcome of the quotation: pending (default), won, or lost';
COMMENT ON COLUMN quotes_mbcb.outcome_notes IS 'Optional notes explaining why the quotation was won or lost';
COMMENT ON COLUMN quotes_mbcb.closed_at IS 'Timestamp when the outcome was set (won or lost)';

COMMENT ON COLUMN quotes_signages.outcome_status IS 'Outcome of the quotation: pending (default), won, or lost';
COMMENT ON COLUMN quotes_signages.outcome_notes IS 'Optional notes explaining why the quotation was won or lost';
COMMENT ON COLUMN quotes_signages.closed_at IS 'Timestamp when the outcome was set (won or lost)';

COMMENT ON COLUMN quotes_paint.outcome_status IS 'Outcome of the quotation: pending (default), won, or lost';
COMMENT ON COLUMN quotes_paint.outcome_notes IS 'Optional notes explaining why the quotation was won or lost';
COMMENT ON COLUMN quotes_paint.closed_at IS 'Timestamp when the outcome was set (won or lost)';

-- ============================================
-- Migration Complete
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Outcome Tracking Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Added fields to:';
  RAISE NOTICE '  - quotes_mbcb';
  RAISE NOTICE '  - quotes_signages';
  RAISE NOTICE '  - quotes_paint';
  RAISE NOTICE '';
  RAISE NOTICE 'New fields:';
  RAISE NOTICE '  - outcome_status (ENUM: pending, won, lost)';
  RAISE NOTICE '  - outcome_notes (TEXT, optional)';
  RAISE NOTICE '  - closed_at (TIMESTAMP, nullable)';
  RAISE NOTICE '';
  RAISE NOTICE 'Indexes created for performance optimization';
  RAISE NOTICE '';
END $$;

