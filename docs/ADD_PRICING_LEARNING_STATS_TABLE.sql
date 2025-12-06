/**
 * Database Migration: Create Pricing Learning Stats Table (Optional)
 * 
 * Purpose: Cache learning statistics for faster retrieval and historical tracking.
 *          This table is optional - the learning engine can calculate stats on-the-fly.
 * 
 * Usage:
 * Run this migration in your Supabase SQL editor if you want to cache learning stats.
 */

-- ============================================
-- Create pricing_learning_stats table
-- ============================================

CREATE TABLE IF NOT EXISTS pricing_learning_stats (
  id SERIAL PRIMARY KEY,
  product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('mbcb', 'signages', 'paint')),
  lookback_days INTEGER NOT NULL DEFAULT 90,
  
  -- Learning metrics
  ai_accuracy NUMERIC(5,2) NOT NULL DEFAULT 0, -- % of wins when AI was used
  override_accuracy NUMERIC(5,2) NOT NULL DEFAULT 0, -- % of wins when AI was overridden
  avg_success_delta NUMERIC(10,2) NOT NULL DEFAULT 0, -- avg price diff between AI and winning price
  
  -- Sample sizes
  total_quotes_analyzed INTEGER NOT NULL DEFAULT 0,
  quotes_with_ai INTEGER NOT NULL DEFAULT 0,
  quotes_without_ai INTEGER NOT NULL DEFAULT 0,
  
  -- Insights
  recent_win_factors JSONB, -- Array of text insights
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one row per product type + lookback period
  UNIQUE(product_type, lookback_days)
);

-- ============================================
-- Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_pricing_learning_stats_product_type 
ON pricing_learning_stats(product_type);

CREATE INDEX IF NOT EXISTS idx_pricing_learning_stats_updated_at 
ON pricing_learning_stats(updated_at DESC);

-- ============================================
-- Add comments
-- ============================================

COMMENT ON TABLE pricing_learning_stats IS 'Cached learning statistics for AI pricing calibration';
COMMENT ON COLUMN pricing_learning_stats.ai_accuracy IS 'Win rate (%) when AI recommendation was followed';
COMMENT ON COLUMN pricing_learning_stats.override_accuracy IS 'Win rate (%) when user overrode AI';
COMMENT ON COLUMN pricing_learning_stats.avg_success_delta IS 'Average price difference between AI suggestion and actual winning price';
COMMENT ON COLUMN pricing_learning_stats.recent_win_factors IS 'JSON array of recent winning strategies/insights';

-- ============================================
-- Create function to update timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_pricing_learning_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Create trigger
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_pricing_learning_stats_updated_at 
ON pricing_learning_stats;

CREATE TRIGGER trigger_update_pricing_learning_stats_updated_at
  BEFORE UPDATE ON pricing_learning_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_learning_stats_updated_at();

-- ============================================
-- Migration Complete
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Pricing Learning Stats Table Created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Table: pricing_learning_stats';
  RAISE NOTICE 'Purpose: Cache AI learning statistics';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: This table is optional. The learning';
  RAISE NOTICE 'engine can calculate stats on-the-fly from';
  RAISE NOTICE 'the quotes tables.';
  RAISE NOTICE '';
END $$;

