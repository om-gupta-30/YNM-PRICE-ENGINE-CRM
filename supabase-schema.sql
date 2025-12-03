-- Supabase Database Schema for YNM Safety Price Engine
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Places of Supply table
CREATE TABLE IF NOT EXISTS places_of_supply (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quotes_section ON quotes(section);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_name ON quotes(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_places_name ON places_of_supply(name);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

