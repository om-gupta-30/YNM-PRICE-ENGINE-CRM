-- Industries and Sub-Industries for Accounts
-- Run this SQL in your Supabase SQL Editor

-- 1. Create industries table
CREATE TABLE IF NOT EXISTS industries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create sub_industries table
CREATE TABLE IF NOT EXISTS sub_industries (
  id SERIAL PRIMARY KEY,
  industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(industry_id, name)
);

-- 3. Add industries column to accounts table (stores selected industry/sub-industry pairs as JSONB)
-- Format: [{ "industry_id": 1, "industry_name": "Manufacturing", "sub_industry_id": 1, "sub_industry_name": "Agricultural products" }, ...]
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'industries'
  ) THEN
    ALTER TABLE accounts ADD COLUMN industries JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE '✅ Added industries column to accounts table';
  ELSE
    RAISE NOTICE 'ℹ️ industries column already exists on accounts table';
  END IF;
END $$;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_sub_industries_industry_id ON sub_industries(industry_id);
CREATE INDEX IF NOT EXISTS idx_accounts_industries ON accounts USING GIN (industries);

-- 5. Insert Industries
INSERT INTO industries (name) VALUES
  ('Manufacturing'),
  ('Building Infrastructure'),
  ('Transport Infrastructure'),
  ('Power'),
  ('Water'),
  ('Oil and Gas'),
  ('Mining')
ON CONFLICT (name) DO NOTHING;

-- 6. Insert Sub-Industries

-- Manufacturing (id: 1)
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

-- Building Infrastructure (id: 2)
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

-- Transport Infrastructure (id: 3)
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

-- Power (id: 4)
INSERT INTO sub_industries (industry_id, name)
SELECT id, unnest(ARRAY[
  'Non renewable',
  'Renewable',
  'Transmission and distribution'
])
FROM industries WHERE name = 'Power'
ON CONFLICT (industry_id, name) DO NOTHING;

-- Water (id: 5)
INSERT INTO sub_industries (industry_id, name)
SELECT id, unnest(ARRAY[
  'Irrigation',
  'Water and sewerage pipeline and distribution',
  'Water, sewage and effluent treatment'
])
FROM industries WHERE name = 'Water'
ON CONFLICT (industry_id, name) DO NOTHING;

-- Oil and Gas (id: 6)
INSERT INTO sub_industries (industry_id, name)
SELECT id, unnest(ARRAY[
  'Downstream',
  'Midstream',
  'Upstream',
  'Storage and distribution'
])
FROM industries WHERE name = 'Oil and Gas'
ON CONFLICT (industry_id, name) DO NOTHING;

-- Mining (id: 7)
INSERT INTO sub_industries (industry_id, name)
SELECT id, unnest(ARRAY[
  'Metallic ore, slag, etc',
  'Mineral fuels',
  'Non metallic minerals'
])
FROM industries WHERE name = 'Mining'
ON CONFLICT (industry_id, name) DO NOTHING;

-- 7. Verify the data
SELECT '✅ Industries and Sub-Industries setup complete!' as status;

-- Show counts
SELECT 
  (SELECT COUNT(*) FROM industries) as total_industries,
  (SELECT COUNT(*) FROM sub_industries) as total_sub_industries;

-- Show all industries with their sub-industries count
SELECT 
  i.id,
  i.name as industry,
  COUNT(si.id) as sub_industries_count
FROM industries i
LEFT JOIN sub_industries si ON si.industry_id = i.id
GROUP BY i.id, i.name
ORDER BY i.id;
