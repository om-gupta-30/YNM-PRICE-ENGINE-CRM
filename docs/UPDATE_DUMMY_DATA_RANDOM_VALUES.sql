-- ============================================
-- UPDATE DUMMY DATA WITH RANDOM VALUES
-- This script adds:
-- - Random follow-up dates to contacts (within next 30 days)
-- - Random state_id and city_id to sub_accounts
-- - Random engagement scores to accounts (0-100)
-- - Random engagement scores to sub_accounts (0-100)
-- ============================================

-- ============================================
-- 1. ENSURE STATES AND CITIES EXIST
-- ============================================
-- Insert states if they don't exist
INSERT INTO states (state_name) VALUES
  ('Karnataka'),
  ('Maharashtra'),
  ('Tamil Nadu'),
  ('Delhi'),
  ('Gujarat'),
  ('West Bengal'),
  ('Rajasthan'),
  ('Uttar Pradesh'),
  ('Telangana'),
  ('Andhra Pradesh')
ON CONFLICT (state_name) DO NOTHING;

-- Insert cities for major states (using NOT EXISTS to avoid conflicts)
DO $$
DECLARE
  state_rec RECORD;
  city_name_val TEXT;
BEGIN
  -- Karnataka cities
  FOR state_rec IN SELECT id FROM states WHERE state_name = 'Karnataka' LOOP
    FOR city_name_val IN SELECT unnest(ARRAY['Bangalore', 'Mysore', 'Hubli', 'Mangalore']) LOOP
      INSERT INTO cities (state_id, city_name)
      SELECT state_rec.id, city_name_val
      WHERE NOT EXISTS (
        SELECT 1 FROM cities WHERE state_id = state_rec.id AND cities.city_name = city_name_val
      );
    END LOOP;
  END LOOP;

  -- Maharashtra cities
  FOR state_rec IN SELECT id FROM states WHERE state_name = 'Maharashtra' LOOP
    FOR city_name_val IN SELECT unnest(ARRAY['Mumbai', 'Pune', 'Nagpur', 'Nashik']) LOOP
      INSERT INTO cities (state_id, city_name)
      SELECT state_rec.id, city_name_val
      WHERE NOT EXISTS (
        SELECT 1 FROM cities WHERE state_id = state_rec.id AND cities.city_name = city_name_val
      );
    END LOOP;
  END LOOP;

  -- Tamil Nadu cities
  FOR state_rec IN SELECT id FROM states WHERE state_name = 'Tamil Nadu' LOOP
    FOR city_name_val IN SELECT unnest(ARRAY['Chennai', 'Coimbatore', 'Madurai', 'Salem']) LOOP
      INSERT INTO cities (state_id, city_name)
      SELECT state_rec.id, city_name_val
      WHERE NOT EXISTS (
        SELECT 1 FROM cities WHERE state_id = state_rec.id AND cities.city_name = city_name_val
      );
    END LOOP;
  END LOOP;

  -- Delhi cities
  FOR state_rec IN SELECT id FROM states WHERE state_name = 'Delhi' LOOP
    FOR city_name_val IN SELECT unnest(ARRAY['New Delhi', 'Delhi']) LOOP
      INSERT INTO cities (state_id, city_name)
      SELECT state_rec.id, city_name_val
      WHERE NOT EXISTS (
        SELECT 1 FROM cities WHERE state_id = state_rec.id AND cities.city_name = city_name_val
      );
    END LOOP;
  END LOOP;

  -- Gujarat cities
  FOR state_rec IN SELECT id FROM states WHERE state_name = 'Gujarat' LOOP
    FOR city_name_val IN SELECT unnest(ARRAY['Ahmedabad', 'Surat', 'Vadodara', 'Gandhinagar']) LOOP
      INSERT INTO cities (state_id, city_name)
      SELECT state_rec.id, city_name_val
      WHERE NOT EXISTS (
        SELECT 1 FROM cities WHERE state_id = state_rec.id AND cities.city_name = city_name_val
      );
    END LOOP;
  END LOOP;

  -- West Bengal cities
  FOR state_rec IN SELECT id FROM states WHERE state_name = 'West Bengal' LOOP
    FOR city_name_val IN SELECT unnest(ARRAY['Kolkata', 'Howrah', 'Durgapur']) LOOP
      INSERT INTO cities (state_id, city_name)
      SELECT state_rec.id, city_name_val
      WHERE NOT EXISTS (
        SELECT 1 FROM cities WHERE state_id = state_rec.id AND cities.city_name = city_name_val
      );
    END LOOP;
  END LOOP;

  -- Rajasthan cities
  FOR state_rec IN SELECT id FROM states WHERE state_name = 'Rajasthan' LOOP
    FOR city_name_val IN SELECT unnest(ARRAY['Jaipur', 'Udaipur', 'Jodhpur']) LOOP
      INSERT INTO cities (state_id, city_name)
      SELECT state_rec.id, city_name_val
      WHERE NOT EXISTS (
        SELECT 1 FROM cities WHERE state_id = state_rec.id AND cities.city_name = city_name_val
      );
    END LOOP;
  END LOOP;

  -- Uttar Pradesh cities
  FOR state_rec IN SELECT id FROM states WHERE state_name = 'Uttar Pradesh' LOOP
    FOR city_name_val IN SELECT unnest(ARRAY['Lucknow', 'Kanpur', 'Agra']) LOOP
      INSERT INTO cities (state_id, city_name)
      SELECT state_rec.id, city_name_val
      WHERE NOT EXISTS (
        SELECT 1 FROM cities WHERE state_id = state_rec.id AND cities.city_name = city_name_val
      );
    END LOOP;
  END LOOP;

  -- Telangana cities
  FOR state_rec IN SELECT id FROM states WHERE state_name = 'Telangana' LOOP
    FOR city_name_val IN SELECT unnest(ARRAY['Hyderabad', 'Warangal', 'Nizamabad']) LOOP
      INSERT INTO cities (state_id, city_name)
      SELECT state_rec.id, city_name_val
      WHERE NOT EXISTS (
        SELECT 1 FROM cities WHERE state_id = state_rec.id AND cities.city_name = city_name_val
      );
    END LOOP;
  END LOOP;

  -- Andhra Pradesh cities
  FOR state_rec IN SELECT id FROM states WHERE state_name = 'Andhra Pradesh' LOOP
    FOR city_name_val IN SELECT unnest(ARRAY['Visakhapatnam', 'Vijayawada', 'Guntur']) LOOP
      INSERT INTO cities (state_id, city_name)
      SELECT state_rec.id, city_name_val
      WHERE NOT EXISTS (
        SELECT 1 FROM cities WHERE state_id = state_rec.id AND cities.city_name = city_name_val
      );
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 2. UPDATE CONTACTS WITH RANDOM FOLLOW-UP DATES
-- ============================================
-- Add random follow-up dates to all contacts
-- 70% will have dates in the future (next 30 days), 30% in the past (last 7 days)
UPDATE contacts
SET follow_up_date = CASE
  WHEN RANDOM() < 0.7 THEN 
    CURRENT_DATE + (RANDOM() * 30)::INTEGER  -- Future dates (next 30 days)
  ELSE 
    CURRENT_DATE - (RANDOM() * 7)::INTEGER   -- Past dates (last 7 days)
END;

-- ============================================
-- 3. UPDATE SUB_ACCOUNTS WITH RANDOM STATE_ID AND CITY_ID
-- ============================================
-- First, update state_id for all sub_accounts (assign random state to all)
UPDATE sub_accounts
SET state_id = (
  SELECT id FROM states 
  ORDER BY RANDOM() 
  LIMIT 1
);

-- Then, update city_id based on the state_id (cities must belong to the assigned state)
UPDATE sub_accounts sa
SET city_id = (
  SELECT c.id FROM cities c
  WHERE c.state_id = sa.state_id
  ORDER BY RANDOM()
  LIMIT 1
)
WHERE state_id IS NOT NULL;

-- If any sub_accounts still don't have a city (no cities for that state), assign a random city
UPDATE sub_accounts
SET city_id = (
  SELECT id FROM cities 
  ORDER BY RANDOM() 
  LIMIT 1
)
WHERE city_id IS NULL;

-- ============================================
-- 4. UPDATE ACCOUNTS WITH RANDOM ENGAGEMENT SCORES
-- ============================================
-- Update all accounts with random engagement scores (0-100, whole numbers only)
UPDATE accounts
SET engagement_score = FLOOR(RANDOM() * 101)::INTEGER;

-- ============================================
-- 5. UPDATE SUB_ACCOUNTS WITH RANDOM ENGAGEMENT SCORES
-- ============================================
-- Update all sub_accounts with random engagement scores (0-100, whole numbers only)
UPDATE sub_accounts
SET engagement_score = FLOOR(RANDOM() * 101)::INTEGER;

-- ============================================
-- 6. VERIFICATION QUERIES
-- ============================================

-- Check contacts with follow-up dates
SELECT 
  'Contacts with Follow-up Dates' as metric,
  COUNT(*)::text as count,
  MIN(follow_up_date)::text as earliest_date,
  MAX(follow_up_date)::text as latest_date
FROM contacts
WHERE follow_up_date IS NOT NULL;

-- Check sub_accounts with state and city
SELECT 
  'Sub-Accounts with Location' as metric,
  COUNT(*)::text as total_sub_accounts,
  COUNT(state_id)::text as with_state,
  COUNT(city_id)::text as with_city
FROM sub_accounts;

-- Check engagement scores
SELECT 
  'Engagement Scores' as metric,
  'Accounts' as table_name,
  COUNT(*)::text as total,
  ROUND(AVG(engagement_score))::text as avg_score,
  MIN(engagement_score)::text as min_score,
  MAX(engagement_score)::text as max_score
FROM accounts
UNION ALL
SELECT 
  'Engagement Scores' as metric,
  'Sub-Accounts' as table_name,
  COUNT(*)::text as total,
  ROUND(AVG(engagement_score))::text as avg_score,
  MIN(engagement_score)::text as min_score,
  MAX(engagement_score)::text as max_score
FROM sub_accounts;

-- Sample data preview
SELECT 
  'Sample Contacts' as preview_type,
  c.name,
  c.follow_up_date,
  sa.sub_account_name,
  s.state_name,
  ci.city_name
FROM contacts c
LEFT JOIN sub_accounts sa ON c.sub_account_id = sa.id
LEFT JOIN states s ON sa.state_id = s.id
LEFT JOIN cities ci ON sa.city_id = ci.id
WHERE c.follow_up_date IS NOT NULL
LIMIT 10;

-- Sample sub-accounts with location
SELECT 
  'Sample Sub-Accounts' as preview_type,
  sa.sub_account_name,
  a.account_name,
  s.state_name,
  ci.city_name,
  sa.engagement_score
FROM sub_accounts sa
LEFT JOIN accounts a ON sa.account_id = a.id
LEFT JOIN states s ON sa.state_id = s.id
LEFT JOIN cities ci ON sa.city_id = ci.id
LIMIT 10;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅ Random dummy data updated successfully! Follow-up dates, locations, and engagement scores have been added.' as result;
