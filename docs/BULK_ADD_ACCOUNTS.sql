-- ============================================
-- BULK ADD ACCOUNTS (75 Accounts)
-- ============================================
-- This script adds 75 accounts with:
-- - Company Tag: "new"
-- - Company Stage: "enterprise"
-- - Assigned Employee: NULL (unassigned)
-- - Industries/Sub-industries: NULL
-- - Notes: NULL
-- ============================================
-- Run this in your Supabase SQL Editor
-- ============================================

BEGIN;

-- Insert accounts (Batch 1 - 37 accounts)
INSERT INTO accounts (
  account_name,
  company_stage,
  company_tag,
  assigned_employee,
  engagement_score,
  is_active,
  created_at,
  updated_at
) VALUES
  ('Aqua Space Developers Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Rajapushpa Properties Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('S R Infra & Developers', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Honer Homes', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Aparna Infrahousing Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('My Home Constructions Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Incor Lake City Projects Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Phoenix Global Spaces Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Greenmark Developers Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Hyma Developers Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Eden Buildcon Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Tellapur Technocity Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('First SMR Holdings', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Raghuram Constructions & Developers Pvt Ltd', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Aparna Constructions & Estates Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Aaditri Properties Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Prestige Estates Projects Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Sensation Infracon Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Auro Realty Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Gangothri Developers', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Samvir Estates LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Lansum Properties LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Raghava Highrise', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Aaditri Housing Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Alekhya Homes Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('RS Pasura Tellapur Builders LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Vasavi Homes LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Ektha Western Windsor Park LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Karimnagar Smart City Corporation Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Aliens Developers Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('DSR Prime Spaces', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Anuktha Ikigai City Developers Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Sumadhura Constructions Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Mahira Ventures Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('MSN Urban Ventures LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Telangana Power Generation Corporation Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Yula Globus Developers LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW())
ON CONFLICT (account_name) DO NOTHING;

-- Insert accounts (Batch 2 - 38 accounts)
INSERT INTO accounts (
  account_name,
  company_stage,
  company_tag,
  assigned_employee,
  engagement_score,
  is_active,
  created_at,
  updated_at
) VALUES
  ('Oakmont Developers LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Candeur Developers & Builders', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Supadha Developers Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Jayabheri Properties Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('S.S. Holdings & Investments', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Cloudswood Constructions Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Nivan Habitats Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Ashoka Builders India Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Venkata Praneeth Developers Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Vertex Homes Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Phoenix Spaces Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('DSR KC Builders & Developers', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Aspire Spaces Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Ramky Estates & Farms Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Vajra Infra Project LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Team 4 Life Spaces LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('NSL SEZ Hyderabad Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Sri Sreenivasa Infra', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Alliance Inn India Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Sri Aditya Kedia Realtors LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Supadha Infra Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Om Sree Builders & Developers LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Kurra Infra LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Anvita Buildpro LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Varapradha Real Estates Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Newmark Urbanspaces', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Vasavi Infrastructures LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Anuhar Mahan Homes LLP', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Raghava Projects', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Blueoak Constructions', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Vision Infra Developers (India) Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Squarespace Infra City Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Anand Homes, Hyderabad', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Poulomi Estates Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Candeur Constructions', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Shanta Sriram Constructions Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Mahaveer Estate Projects', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW()),
  ('Indis Smart Homes Pvt. Ltd.', 'Enterprise', 'New', NULL, 0, true, NOW(), NOW())
ON CONFLICT (account_name) DO NOTHING;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
  id,
  account_name,
  company_stage,
  company_tag,
  assigned_employee,
  engagement_score,
  is_active,
  created_at
FROM accounts
WHERE company_tag = 'New' 
  AND company_stage = 'Enterprise'
  AND assigned_employee IS NULL
ORDER BY account_name;
