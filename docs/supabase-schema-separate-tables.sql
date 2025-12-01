-- Supabase Database Schema for YNM Safety Price Engine
-- SEPARATE TABLES FOR EACH PRODUCT TYPE
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

-- ============================================
-- MBCB QUOTATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quotes_mbcb (
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

-- ============================================
-- SIGNAGES QUOTATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quotes_signages (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  place_of_supply TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  purpose TEXT,
  date DATE NOT NULL,
  quantity NUMERIC,
  area_sq_ft NUMERIC,
  cost_per_piece NUMERIC,
  final_total_cost NUMERIC,
  raw_payload JSONB,
  created_by TEXT,
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAINT QUOTATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quotes_paint (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  place_of_supply TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  purpose TEXT,
  date DATE NOT NULL,
  quantity NUMERIC,
  area_sq_ft NUMERIC,
  cost_per_piece NUMERIC,
  final_total_cost NUMERIC,
  raw_payload JSONB,
  created_by TEXT,
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES FOR BETTER QUERY PERFORMANCE
-- ============================================

-- MBCB indexes
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_section ON quotes_mbcb(section);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_customer_name ON quotes_mbcb(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_created_at ON quotes_mbcb(created_at DESC);

-- Signages indexes
CREATE INDEX IF NOT EXISTS idx_quotes_signages_section ON quotes_signages(section);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_customer_name ON quotes_signages(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_created_at ON quotes_signages(created_at DESC);

-- Paint indexes
CREATE INDEX IF NOT EXISTS idx_quotes_paint_section ON quotes_paint(section);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_customer_name ON quotes_paint(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_created_at ON quotes_paint(created_at DESC);

-- Metadata indexes
CREATE INDEX IF NOT EXISTS idx_places_name ON places_of_supply(name);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_purposes_name ON purposes(name);

-- ============================================
-- RESET SEQUENCES FUNCTION (Required for automatic reset)
-- ============================================
CREATE OR REPLACE FUNCTION reset_sequence(sequence_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', sequence_name);
END;
$$;

GRANT EXECUTE ON FUNCTION reset_sequence(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_sequence(TEXT) TO service_role;

-- ============================================
-- SET SEQUENCE TO VALUE FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION set_sequence_to_value(sequence_name TEXT, new_value INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF new_value <= 0 THEN
    EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', sequence_name);
  ELSE
    EXECUTE format('SELECT setval(%L, %s, true)', sequence_name, new_value);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION set_sequence_to_value(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION set_sequence_to_value(TEXT, INTEGER) TO service_role;

-- ============================================
-- NORMALIZE TABLE IDS FUNCTION (Atomic ID Renumbering)
-- ============================================
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
BEGIN
  EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO row_count;
  
  IF row_count = 0 THEN
    EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', sequence_name);
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;
  
  EXECUTE format('
    UPDATE %I 
    SET %I = -(%I + 100000)
    WHERE %I > 0
  ', table_name, id_column, id_column, id_column);
  
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
  
  GET DIAGNOSTICS row_count = ROW_COUNT;
  last_id_val := row_count;
  
  EXECUTE format('SELECT setval(%L, %s, true)', sequence_name, last_id_val);
  
  RETURN QUERY SELECT row_count, last_id_val;
END;
$$;

GRANT EXECUTE ON FUNCTION normalize_table_ids(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_table_ids(TEXT, TEXT, TEXT) TO service_role;

-- ============================================
-- NOTES:
-- ============================================
-- 1. The old 'quotes' table can be kept for backward compatibility or dropped
-- 2. To migrate existing data, run:
--    INSERT INTO quotes_mbcb SELECT * FROM quotes WHERE section LIKE '%W-Beam%' OR section LIKE '%Thrie%';
--    INSERT INTO quotes_signages SELECT id, section, place_of_supply, customer_name, purpose, date, 
--      (raw_payload->>'quantity')::NUMERIC, (raw_payload->>'areaSqFt')::NUMERIC, 
--      (raw_payload->>'costPerPiece')::NUMERIC, final_total_cost, raw_payload, created_by, is_saved, created_at
--      FROM quotes WHERE section LIKE '%Signages%' OR section LIKE '%Reflective%';
-- 3. After migration, you can drop the old 'quotes' table if desired

