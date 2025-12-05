-- ====================================================
-- FIX: Make place_of_supply nullable in quotes tables
-- ====================================================
-- The application now uses state_id and city_id instead of place_of_supply
-- This script makes place_of_supply nullable to prevent constraint violations

-- Make place_of_supply nullable in quotes_mbcb
ALTER TABLE quotes_mbcb 
ALTER COLUMN place_of_supply DROP NOT NULL;

-- Make place_of_supply nullable in quotes_signages
ALTER TABLE quotes_signages 
ALTER COLUMN place_of_supply DROP NOT NULL;

-- Make place_of_supply nullable in quotes_paint
ALTER TABLE quotes_paint 
ALTER COLUMN place_of_supply DROP NOT NULL;

-- Also make customer_name nullable (we use sub_account_name now)
ALTER TABLE quotes_mbcb 
ALTER COLUMN customer_name DROP NOT NULL;

ALTER TABLE quotes_signages 
ALTER COLUMN customer_name DROP NOT NULL;

ALTER TABLE quotes_paint 
ALTER COLUMN customer_name DROP NOT NULL;

-- ====================================================
-- DONE! place_of_supply and customer_name are now nullable
-- ====================================================

