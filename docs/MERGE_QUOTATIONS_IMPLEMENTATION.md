# Merge Quotations Implementation Guide

## Database Schema for Merged Quotations

Run this SQL in Supabase SQL Editor:

```sql
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

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_merged_quotations_product_type ON merged_quotations(product_type);
CREATE INDEX IF NOT EXISTS idx_merged_quotations_created_at ON merged_quotations(created_at DESC);

-- Add comment
COMMENT ON TABLE merged_quotations IS 'Stores merged quotations with references to original quote IDs';
```

## Implementation Steps

1. Install pdf-lib: `npm install pdf-lib`
2. Create helper function to generate PDF buffer
3. Create /api/merge-quotes route
4. Update history page with checkboxes and merge button
5. Add validation to only allow merging same product types

