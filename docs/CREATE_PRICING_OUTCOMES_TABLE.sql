-- Create pricing_outcomes table for AI learning
-- This table stores pricing win/loss outcomes to help AI learn from past victories

CREATE TABLE IF NOT EXISTS pricing_outcomes (
  id SERIAL PRIMARY KEY,
  product_type TEXT NOT NULL,
  quoted_price NUMERIC NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('won', 'lost')),
  margin NUMERIC,
  competitor_price NUMERIC,
  client_demand_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pricing_outcomes_product_type ON pricing_outcomes(product_type);
CREATE INDEX IF NOT EXISTS idx_pricing_outcomes_outcome ON pricing_outcomes(outcome);
CREATE INDEX IF NOT EXISTS idx_pricing_outcomes_created_at ON pricing_outcomes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_outcomes_product_outcome ON pricing_outcomes(product_type, outcome);

-- Add comments
COMMENT ON TABLE pricing_outcomes IS 'Stores pricing outcomes (won/lost) for AI learning and pattern recognition';
COMMENT ON COLUMN pricing_outcomes.product_type IS 'Product type: mbcb, signages, or paint';
COMMENT ON COLUMN pricing_outcomes.quoted_price IS 'The price that was quoted (per unit)';
COMMENT ON COLUMN pricing_outcomes.outcome IS 'Outcome: won or lost';
COMMENT ON COLUMN pricing_outcomes.margin IS 'Calculated margin: (quoted_price - client_demand_price) / client_demand_price';
COMMENT ON COLUMN pricing_outcomes.competitor_price IS 'Competitor price per unit (if known)';
COMMENT ON COLUMN pricing_outcomes.client_demand_price IS 'Client demand price per unit (if known)';

