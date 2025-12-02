-- ============================================
-- RESTORE INDUSTRIES AND SUB-INDUSTRIES
-- ============================================
-- This script restores all industries and sub-industries data
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)
-- ============================================

-- Ensure tables exist
CREATE TABLE IF NOT EXISTS industries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sub_industries (
  id SERIAL PRIMARY KEY,
  industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(industry_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sub_industries_industry_id ON sub_industries(industry_id);

-- ============================================
-- INSERT INDUSTRIES
-- ============================================
INSERT INTO industries (name) VALUES
  ('Manufacturing'),
  ('Building Infrastructure'),
  ('Transport Infrastructure'),
  ('Power'),
  ('Water'),
  ('Oil and Gas'),
  ('Mining')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- INSERT SUB-INDUSTRIES
-- ============================================

-- Manufacturing
INSERT INTO sub_industries (industry_id, name)
SELECT id, unnest(ARRAY[
  'Agricultural products',
  'Alcohols and derivatives',
  'Automobiles and ancillaries',
  'Basic metals',
  'Cement and asbestos',
  'Defence equipment',
  'Drugs and pharmaceuticals',
  'Edible oils',
  'Electrical machinery',
  'Electronics',
  'Fertilisers',
  'Food products',
  'Glass and ceramic products',
  'Inorganic chemicals',
  'Leather products',
  'Miscellaneous manufacturing',
  'Non electrical machinery',
  'Organic chemicals',
  'Paint and dyestuff',
  'Paper and paper products',
  'Pesticides',
  'Plastic and plastic products',
  'Rubber and rubber products',
  'Soaps, detergents and cosmetics',
  'Textiles'
])
FROM industries WHERE name = 'Manufacturing'
ON CONFLICT (industry_id, name) DO NOTHING;

-- Building Infrastructure
INSERT INTO sub_industries (industry_id, name)
SELECT id, unnest(ARRAY[
  'Commercial complexes',
  'Datacenters',
  'Educational and govt buildings',
  'Healthcare',
  'Hospitality',
  'Industrial and software parks',
  'Logistics and warehouses',
  'Residential buildings',
  'Tourism and recreation'
])
FROM industries WHERE name = 'Building Infrastructure'
ON CONFLICT (industry_id, name) DO NOTHING;

-- Transport Infrastructure
INSERT INTO sub_industries (industry_id, name)
SELECT id, unnest(ARRAY[
  'Aviation infrastructure',
  'Rail infrastructure',
  'Road infrastructure',
  'Shipping infrastructure',
  'Telecom infrastructure'
])
FROM industries WHERE name = 'Transport Infrastructure'
ON CONFLICT (industry_id, name) DO NOTHING;

-- Power
INSERT INTO sub_industries (industry_id, name)
SELECT id, unnest(ARRAY[
  'Non renewable',
  'Renewable',
  'Transmission and distribution'
])
FROM industries WHERE name = 'Power'
ON CONFLICT (industry_id, name) DO NOTHING;

-- Water
INSERT INTO sub_industries (industry_id, name)
SELECT id, unnest(ARRAY[
  'Irrigation',
  'Water and sewerage pipeline and distribution',
  'Water, sewage and effluent treatment'
])
FROM industries WHERE name = 'Water'
ON CONFLICT (industry_id, name) DO NOTHING;

-- Oil and Gas
INSERT INTO sub_industries (industry_id, name)
SELECT id, unnest(ARRAY[
  'Downstream',
  'Midstream',
  'Upstream',
  'Storage and distribution'
])
FROM industries WHERE name = 'Oil and Gas'
ON CONFLICT (industry_id, name) DO NOTHING;

-- Mining
INSERT INTO sub_industries (industry_id, name)
SELECT id, unnest(ARRAY[
  'Metallic ore, slag, etc',
  'Mineral fuels',
  'Non metallic minerals'
])
FROM industries WHERE name = 'Mining'
ON CONFLICT (industry_id, name) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    industries_count INTEGER;
    sub_industries_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO industries_count FROM industries;
    SELECT COUNT(*) INTO sub_industries_count FROM sub_industries;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Industries and Sub-Industries Restored!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total Industries: %', industries_count;
    RAISE NOTICE 'Total Sub-Industries: %', sub_industries_count;
    RAISE NOTICE '========================================';
END $$;

-- Show all industries with their sub-industries
SELECT 
  i.id,
  i.name as industry,
  COUNT(si.id) as sub_industries_count
FROM industries i
LEFT JOIN sub_industries si ON si.industry_id = i.id
GROUP BY i.id, i.name
ORDER BY i.id;
