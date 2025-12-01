# Database Migration Guide - Separate Tables for Products

## Overview
The quotation system has been updated to use separate database tables for each product type:
- **MBCB** → `quotes_mbcb`
- **Signages** → `quotes_signages`
- **Paint** → `quotes_paint`

## SQL Setup

### Step 1: Run the SQL Schema
Execute the SQL file `supabase-schema-separate-tables.sql` in your Supabase SQL Editor to create the new tables.

### Step 2: Migrate Existing Data (Optional)
If you have existing data in the old `quotes` table, you can migrate it using these queries:

```sql
-- Migrate MBCB quotations
INSERT INTO quotes_mbcb (id, section, place_of_supply, customer_name, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, raw_payload, created_by, is_saved, created_at)
SELECT id, section, place_of_supply, customer_name, purpose, date, quantity_rm, total_weight_per_rm, total_cost_per_rm, final_total_cost, raw_payload, created_by, is_saved, created_at
FROM quotes
WHERE section LIKE '%W-Beam%' OR section LIKE '%Thrie%' OR section LIKE '%Double%';

-- Migrate Signages quotations
INSERT INTO quotes_signages (id, section, place_of_supply, customer_name, purpose, date, quantity, area_sq_ft, cost_per_piece, final_total_cost, raw_payload, created_by, is_saved, created_at)
SELECT 
  id, 
  section, 
  place_of_supply, 
  customer_name, 
  purpose, 
  date, 
  (raw_payload->>'quantity')::NUMERIC as quantity,
  (raw_payload->>'areaSqFt')::NUMERIC as area_sq_ft,
  (raw_payload->>'costPerPiece')::NUMERIC as cost_per_piece,
  final_total_cost, 
  raw_payload, 
  created_by, 
  is_saved, 
  created_at
FROM quotes
WHERE section LIKE '%Signages%' OR section LIKE '%Reflective%';

-- Migrate Paint quotations (if any)
INSERT INTO quotes_paint (id, section, place_of_supply, customer_name, purpose, date, quantity, area_sq_ft, cost_per_piece, final_total_cost, raw_payload, created_by, is_saved, created_at)
SELECT 
  id, 
  section, 
  place_of_supply, 
  customer_name, 
  purpose, 
  date, 
  (raw_payload->>'quantity')::NUMERIC as quantity,
  (raw_payload->>'areaSqFt')::NUMERIC as area_sq_ft,
  (raw_payload->>'costPerPiece')::NUMERIC as cost_per_piece,
  final_total_cost, 
  raw_payload, 
  created_by, 
  is_saved, 
  created_at
FROM quotes
WHERE section LIKE '%Paint%';
```

### Step 3: Drop Old Table (After Verification)
Once you've verified the migration is successful, you can drop the old `quotes` table:

```sql
DROP TABLE IF EXISTS quotes;
```

## Code Changes

### API Routes Updated
1. **`app/api/quotes/route.ts`**
   - POST: Automatically routes to the correct table based on `section` field
   - GET: Can filter by `product_type` query parameter or fetch from all tables

2. **`app/api/quotes/delete/route.ts`**
   - Accepts `product_type` parameter to determine which table to delete from
   - Falls back to searching all tables if `product_type` not provided

3. **`app/api/admin/normalize-ids/route.ts`**
   - Updated to normalize IDs for all three new tables

### Frontend Updates
1. **`app/history/page.tsx`**
   - Queries from the correct table based on active tab (MBCB, Signages, Paint)
   - Passes `product_type` when deleting quotations

2. **`lib/types.ts`**
   - Updated `Quote` interface to support fields from all three table types

## Table Structures

### `quotes_mbcb`
- `quantity_rm` (NUMERIC)
- `total_weight_per_rm` (NUMERIC)
- `total_cost_per_rm` (NUMERIC)

### `quotes_signages`
- `quantity` (NUMERIC)
- `area_sq_ft` (NUMERIC)
- `cost_per_piece` (NUMERIC)

### `quotes_paint`
- `quantity` (NUMERIC)
- `area_sq_ft` (NUMERIC)
- `cost_per_piece` (NUMERIC)

### Common Fields (All Tables)
- `id` (SERIAL PRIMARY KEY)
- `section` (TEXT)
- `place_of_supply` (TEXT)
- `customer_name` (TEXT)
- `purpose` (TEXT)
- `date` (DATE)
- `final_total_cost` (NUMERIC)
- `raw_payload` (JSONB)
- `created_by` (TEXT)
- `is_saved` (BOOLEAN)
- `created_at` (TIMESTAMP)

## Benefits

1. **Better Organization**: Each product type has its own table with appropriate fields
2. **Performance**: Smaller tables with product-specific indexes
3. **Scalability**: Easy to add product-specific fields without affecting other products
4. **Type Safety**: Clearer data structure for each product type

## Notes

- The old `quotes` table can be kept for backward compatibility during migration
- All existing functionality (save, delete, view, export) works with the new structure
- The system automatically determines which table to use based on the `section` field

