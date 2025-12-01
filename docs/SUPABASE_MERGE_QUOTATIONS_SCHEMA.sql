-- ====================================================
-- MERGED QUOTATIONS TABLE SCHEMA
-- ====================================================
-- Run this SQL in Supabase SQL Editor to create the merged_quotations table
-- This table stores merged quotations with references to original quote IDs

-- Create merged_quotations table
CREATE TABLE IF NOT EXISTS merged_quotations (
  id SERIAL PRIMARY KEY,
  merged_quote_ids INTEGER[] NOT NULL,
  product_type VARCHAR(50) NOT NULL CHECK (product_type IN ('mbcb', 'signages', 'paint')),
  customer_name VARCHAR(255) NOT NULL,
  place_of_supply VARCHAR(255) NOT NULL,
  purpose TEXT,
  date VARCHAR(50) NOT NULL,
  final_total_cost NUMERIC(15, 2),
  created_by VARCHAR(255),
  is_saved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  raw_payload JSONB
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_merged_quotations_product_type ON merged_quotations(product_type);
CREATE INDEX IF NOT EXISTS idx_merged_quotations_created_at ON merged_quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merged_quotations_merged_quote_ids ON merged_quotations USING GIN(merged_quote_ids);

-- Add comment
COMMENT ON TABLE merged_quotations IS 'Stores merged quotations with references to original quote IDs';

-- ====================================================
-- NOTES:
-- ====================================================
-- 1. merged_quote_ids: Array of original quotation IDs that were merged
-- 2. product_type: Type of product (mbcb, signages, or paint) - ensures only same types are merged
-- 3. raw_payload: JSONB field to store merged quotation data for PDF generation
-- 4. The table structure mirrors the individual quotation tables for consistency
-- ====================================================

