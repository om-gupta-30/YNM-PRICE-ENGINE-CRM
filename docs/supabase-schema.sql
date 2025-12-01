-- Supabase Database Schema for YNM Safety Price Engine
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Places of Supply table
CREATE TABLE IF NOT EXISTS places_of_supply (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purposes table
CREATE TABLE IF NOT EXISTS purposes (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  place_of_supply TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  purpose TEXT,
  date DATE NOT NULL,
  quantity_rm NUMERIC,
  total_weight_per_rm NUMERIC,
  total_cost_per_rm NUMERIC,
  final_total_cost NUMERIC,
  raw_payload JSONB,
  created_by TEXT,
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quotes_section ON quotes(section);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_name ON quotes(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_places_name ON places_of_supply(name);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_purposes_name ON purposes(name);

-- ============================================
-- RESET SEQUENCES FUNCTION (Required for automatic reset)
-- ============================================
-- Create a database function to reset sequences
-- This function is called automatically when tables become empty

CREATE OR REPLACE FUNCTION reset_sequence(sequence_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', sequence_name);
END;
$$;

-- Grant execute permission to authenticated users (or service role)
GRANT EXECUTE ON FUNCTION reset_sequence(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_sequence(TEXT) TO service_role;

-- ============================================
-- SET SEQUENCE TO VALUE FUNCTION
-- ============================================
-- Set a sequence to a specific value (for normalization)

CREATE OR REPLACE FUNCTION set_sequence_to_value(sequence_name TEXT, new_value INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If new_value is 0 or less, reset to 1, otherwise set to new_value
  IF new_value <= 0 THEN
    EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', sequence_name);
  ELSE
    EXECUTE format('SELECT setval(%L, %s, true)', sequence_name, new_value);
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_sequence_to_value(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION set_sequence_to_value(TEXT, INTEGER) TO service_role;

-- ============================================
-- NORMALIZE TABLE IDS FUNCTION (Atomic ID Renumbering)
-- ============================================
-- This function normalizes IDs in a table to be continuous (1, 2, 3, 4...)
-- It handles the entire process atomically to avoid conflicts

CREATE OR REPLACE FUNCTION normalize_table_ids(
  table_name TEXT,
  id_column TEXT,
  sequence_name TEXT
)
RETURNS TABLE(rows_updated INTEGER, last_id INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  row_count INTEGER;
  last_id_val INTEGER;
  update_sql TEXT;
BEGIN
  -- Get row count
  EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO row_count;
  
  IF row_count = 0 THEN
    -- Table is empty, reset sequence to 1
    EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', sequence_name);
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;
  
  -- Step 1: Set all IDs to negative temporary values (to avoid conflicts)
  EXECUTE format('
    UPDATE %I 
    SET %I = -(%I + 100000)
    WHERE %I > 0
  ', table_name, id_column, id_column, id_column);
  
  -- Step 2: Update IDs to their normalized values (1, 2, 3, ...)
  -- Use a subquery with ROW_NUMBER to assign new IDs
  EXECUTE format('
    UPDATE %I t
    SET %I = sub.new_id
    FROM (
      SELECT %I, ROW_NUMBER() OVER (ORDER BY %I) AS new_id
      FROM %I
      WHERE %I < 0
    ) sub
    WHERE t.%I = sub.%I
  ', table_name, id_column, id_column, id_column, table_name, id_column, id_column);
  
  -- Get the actual number of rows updated
  GET DIAGNOSTICS row_count = ROW_COUNT;
  last_id_val := row_count;
  
  -- Update sequence to point to last_id (so next insert gets last_id + 1)
  EXECUTE format('SELECT setval(%L, %s, true)', sequence_name, last_id_val);
  
  RETURN QUERY SELECT row_count, last_id_val;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION normalize_table_ids(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_table_ids(TEXT, TEXT, TEXT) TO service_role;

-- ============================================
-- ALLOW ID COLUMN UPDATES (Remove DEFAULT constraint)
-- ============================================
-- These commands allow manual ID updates for normalization
-- Run these AFTER creating the tables

-- ALTER TABLE quotes ALTER COLUMN id DROP DEFAULT;
-- ALTER TABLE customers ALTER COLUMN id DROP DEFAULT;
-- ALTER TABLE places_of_supply ALTER COLUMN id DROP DEFAULT;
-- ALTER TABLE purposes ALTER COLUMN id DROP DEFAULT;

-- ============================================
-- MANUAL RESET SEQUENCES (Run after clearing tables)
-- ============================================
-- After clearing/deleting all rows from tables, run these commands
-- to reset the SERIAL ID sequences back to 1:

-- ALTER SEQUENCE quotes_id_seq RESTART WITH 1;
-- ALTER SEQUENCE places_of_supply_id_seq RESTART WITH 1;
-- ALTER SEQUENCE customers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE purposes_id_seq RESTART WITH 1;

