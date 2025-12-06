-- ============================================
-- Add AI Pricing Fields to All Quote Tables
-- This script adds AI-powered pricing fields to quotes_mbcb, quotes_signages, and quotes_paint tables
-- Run this in your Supabase SQL Editor
-- ============================================

DO $$
BEGIN
  -- ============================================
  -- 1. Add AI pricing columns to quotes_mbcb
  -- ============================================
  
  -- Add competitor_price_per_unit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_mbcb' AND column_name = 'competitor_price_per_unit'
  ) THEN
    ALTER TABLE quotes_mbcb 
    ADD COLUMN competitor_price_per_unit NUMERIC;
    RAISE NOTICE '✅ Added competitor_price_per_unit column to quotes_mbcb table';
  ELSE
    RAISE NOTICE 'ℹ️ competitor_price_per_unit column already exists on quotes_mbcb table';
  END IF;

  -- Add client_demand_price_per_unit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_mbcb' AND column_name = 'client_demand_price_per_unit'
  ) THEN
    ALTER TABLE quotes_mbcb 
    ADD COLUMN client_demand_price_per_unit NUMERIC;
    RAISE NOTICE '✅ Added client_demand_price_per_unit column to quotes_mbcb table';
  ELSE
    RAISE NOTICE 'ℹ️ client_demand_price_per_unit column already exists on quotes_mbcb table';
  END IF;

  -- Add ai_suggested_price_per_unit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_mbcb' AND column_name = 'ai_suggested_price_per_unit'
  ) THEN
    ALTER TABLE quotes_mbcb 
    ADD COLUMN ai_suggested_price_per_unit NUMERIC;
    RAISE NOTICE '✅ Added ai_suggested_price_per_unit column to quotes_mbcb table';
  ELSE
    RAISE NOTICE 'ℹ️ ai_suggested_price_per_unit column already exists on quotes_mbcb table';
  END IF;

  -- Add ai_win_probability
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_mbcb' AND column_name = 'ai_win_probability'
  ) THEN
    ALTER TABLE quotes_mbcb 
    ADD COLUMN ai_win_probability NUMERIC;
    RAISE NOTICE '✅ Added ai_win_probability column to quotes_mbcb table';
  ELSE
    RAISE NOTICE 'ℹ️ ai_win_probability column already exists on quotes_mbcb table';
  END IF;

  -- Add ai_pricing_insights
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_mbcb' AND column_name = 'ai_pricing_insights'
  ) THEN
    ALTER TABLE quotes_mbcb 
    ADD COLUMN ai_pricing_insights JSONB;
    RAISE NOTICE '✅ Added ai_pricing_insights column to quotes_mbcb table';
  ELSE
    RAISE NOTICE 'ℹ️ ai_pricing_insights column already exists on quotes_mbcb table';
  END IF;

  -- ============================================
  -- 2. Add AI pricing columns to quotes_signages
  -- ============================================
  
  -- Add competitor_price_per_unit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_signages' AND column_name = 'competitor_price_per_unit'
  ) THEN
    ALTER TABLE quotes_signages 
    ADD COLUMN competitor_price_per_unit NUMERIC;
    RAISE NOTICE '✅ Added competitor_price_per_unit column to quotes_signages table';
  ELSE
    RAISE NOTICE 'ℹ️ competitor_price_per_unit column already exists on quotes_signages table';
  END IF;

  -- Add client_demand_price_per_unit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_signages' AND column_name = 'client_demand_price_per_unit'
  ) THEN
    ALTER TABLE quotes_signages 
    ADD COLUMN client_demand_price_per_unit NUMERIC;
    RAISE NOTICE '✅ Added client_demand_price_per_unit column to quotes_signages table';
  ELSE
    RAISE NOTICE 'ℹ️ client_demand_price_per_unit column already exists on quotes_signages table';
  END IF;

  -- Add ai_suggested_price_per_unit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_signages' AND column_name = 'ai_suggested_price_per_unit'
  ) THEN
    ALTER TABLE quotes_signages 
    ADD COLUMN ai_suggested_price_per_unit NUMERIC;
    RAISE NOTICE '✅ Added ai_suggested_price_per_unit column to quotes_signages table';
  ELSE
    RAISE NOTICE 'ℹ️ ai_suggested_price_per_unit column already exists on quotes_signages table';
  END IF;

  -- Add ai_win_probability
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_signages' AND column_name = 'ai_win_probability'
  ) THEN
    ALTER TABLE quotes_signages 
    ADD COLUMN ai_win_probability NUMERIC;
    RAISE NOTICE '✅ Added ai_win_probability column to quotes_signages table';
  ELSE
    RAISE NOTICE 'ℹ️ ai_win_probability column already exists on quotes_signages table';
  END IF;

  -- Add ai_pricing_insights
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_signages' AND column_name = 'ai_pricing_insights'
  ) THEN
    ALTER TABLE quotes_signages 
    ADD COLUMN ai_pricing_insights JSONB;
    RAISE NOTICE '✅ Added ai_pricing_insights column to quotes_signages table';
  ELSE
    RAISE NOTICE 'ℹ️ ai_pricing_insights column already exists on quotes_signages table';
  END IF;

  -- ============================================
  -- 3. Add AI pricing columns to quotes_paint
  -- ============================================
  
  -- Add competitor_price_per_unit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_paint' AND column_name = 'competitor_price_per_unit'
  ) THEN
    ALTER TABLE quotes_paint 
    ADD COLUMN competitor_price_per_unit NUMERIC;
    RAISE NOTICE '✅ Added competitor_price_per_unit column to quotes_paint table';
  ELSE
    RAISE NOTICE 'ℹ️ competitor_price_per_unit column already exists on quotes_paint table';
  END IF;

  -- Add client_demand_price_per_unit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_paint' AND column_name = 'client_demand_price_per_unit'
  ) THEN
    ALTER TABLE quotes_paint 
    ADD COLUMN client_demand_price_per_unit NUMERIC;
    RAISE NOTICE '✅ Added client_demand_price_per_unit column to quotes_paint table';
  ELSE
    RAISE NOTICE 'ℹ️ client_demand_price_per_unit column already exists on quotes_paint table';
  END IF;

  -- Add ai_suggested_price_per_unit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_paint' AND column_name = 'ai_suggested_price_per_unit'
  ) THEN
    ALTER TABLE quotes_paint 
    ADD COLUMN ai_suggested_price_per_unit NUMERIC;
    RAISE NOTICE '✅ Added ai_suggested_price_per_unit column to quotes_paint table';
  ELSE
    RAISE NOTICE 'ℹ️ ai_suggested_price_per_unit column already exists on quotes_paint table';
  END IF;

  -- Add ai_win_probability
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_paint' AND column_name = 'ai_win_probability'
  ) THEN
    ALTER TABLE quotes_paint 
    ADD COLUMN ai_win_probability NUMERIC;
    RAISE NOTICE '✅ Added ai_win_probability column to quotes_paint table';
  ELSE
    RAISE NOTICE 'ℹ️ ai_win_probability column already exists on quotes_paint table';
  END IF;

  -- Add ai_pricing_insights
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes_paint' AND column_name = 'ai_pricing_insights'
  ) THEN
    ALTER TABLE quotes_paint 
    ADD COLUMN ai_pricing_insights JSONB;
    RAISE NOTICE '✅ Added ai_pricing_insights column to quotes_paint table';
  ELSE
    RAISE NOTICE 'ℹ️ ai_pricing_insights column already exists on quotes_paint table';
  END IF;

END $$;

-- ============================================
-- 4. Add Comments to Columns for Documentation
-- ============================================

COMMENT ON COLUMN quotes_mbcb.competitor_price_per_unit IS 'Competitor price per unit (numeric, nullable)';
COMMENT ON COLUMN quotes_mbcb.client_demand_price_per_unit IS 'Client demand price per unit (numeric, nullable)';
COMMENT ON COLUMN quotes_mbcb.ai_suggested_price_per_unit IS 'AI suggested price per unit (numeric, nullable)';
COMMENT ON COLUMN quotes_mbcb.ai_win_probability IS 'AI win probability (0-100, numeric, nullable)';
COMMENT ON COLUMN quotes_mbcb.ai_pricing_insights IS 'AI pricing insights/reasoning (JSON/JSONB, nullable)';

COMMENT ON COLUMN quotes_signages.competitor_price_per_unit IS 'Competitor price per unit (numeric, nullable)';
COMMENT ON COLUMN quotes_signages.client_demand_price_per_unit IS 'Client demand price per unit (numeric, nullable)';
COMMENT ON COLUMN quotes_signages.ai_suggested_price_per_unit IS 'AI suggested price per unit (numeric, nullable)';
COMMENT ON COLUMN quotes_signages.ai_win_probability IS 'AI win probability (0-100, numeric, nullable)';
COMMENT ON COLUMN quotes_signages.ai_pricing_insights IS 'AI pricing insights/reasoning (JSON/JSONB, nullable)';

COMMENT ON COLUMN quotes_paint.competitor_price_per_unit IS 'Competitor price per unit (numeric, nullable)';
COMMENT ON COLUMN quotes_paint.client_demand_price_per_unit IS 'Client demand price per unit (numeric, nullable)';
COMMENT ON COLUMN quotes_paint.ai_suggested_price_per_unit IS 'AI suggested price per unit (numeric, nullable)';
COMMENT ON COLUMN quotes_paint.ai_win_probability IS 'AI win probability (0-100, numeric, nullable)';
COMMENT ON COLUMN quotes_paint.ai_pricing_insights IS 'AI pricing insights/reasoning (JSON/JSONB, nullable)';

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================
-- Uncomment to verify the columns were added:

-- SELECT 
--   'quotes_mbcb' as table_name,
--   column_name, 
--   data_type, 
--   is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'quotes_mbcb' 
-- AND column_name IN (
--   'competitor_price_per_unit',
--   'client_demand_price_per_unit',
--   'ai_suggested_price_per_unit',
--   'ai_win_probability',
--   'ai_pricing_insights'
-- )
-- ORDER BY column_name;

-- SELECT 
--   'quotes_signages' as table_name,
--   column_name, 
--   data_type, 
--   is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'quotes_signages' 
-- AND column_name IN (
--   'competitor_price_per_unit',
--   'client_demand_price_per_unit',
--   'ai_suggested_price_per_unit',
--   'ai_win_probability',
--   'ai_pricing_insights'
-- )
-- ORDER BY column_name;

-- SELECT 
--   'quotes_paint' as table_name,
--   column_name, 
--   data_type, 
--   is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'quotes_paint' 
-- AND column_name IN (
--   'competitor_price_per_unit',
--   'client_demand_price_per_unit',
--   'ai_suggested_price_per_unit',
--   'ai_win_probability',
--   'ai_pricing_insights'
-- )
-- ORDER BY column_name;

-- ============================================
-- END OF SCRIPT
-- ============================================

