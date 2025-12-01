# Related Products Auto-Update Feature

## Summary

When a quotation is created, the product/section is automatically added to the account's `related_products` field. This ensures that accounts always have an up-to-date list of products they've been quoted for.

## Implementation

### Database Setup

**Run this SQL script first:**
```sql
-- In Supabase SQL Editor
docs/ENSURE_RELATED_PRODUCTS_ARRAY.sql
```

This script ensures that:
- `related_products` column exists in `accounts` table
- Column type is `TEXT[]` (array of text)
- Default value is empty array `{}`

### Product Mapping

The system automatically maps quotation sections to product names:

| Section | Product Name |
|---------|--------------|
| W-Beam, Thrie, Double W-Beam | **MBCB** |
| Signages - Reflective, Signages | **Signages** |
| Paint | **Paint** |
| Other sections | First word of section name |

### How It Works

1. **When a quotation is created:**
   - System extracts the `section` from the quotation
   - Maps section to product name (MBCB, Signages, Paint)
   - Fetches the account's current `related_products` array
   - Adds the product if it's not already present
   - Updates the account record

2. **Example Flow:**
   ```
   Quotation Created: "W-Beam" section
   → Product Name: "MBCB"
   → Account's related_products: [] (empty)
   → Updated related_products: ["MBCB"]
   
   Next Quotation: "Signages - Reflective" section
   → Product Name: "Signages"
   → Account's related_products: ["MBCB"]
   → Updated related_products: ["MBCB", "Signages"]
   ```

### Code Changes

**File:** `app/api/quotes/route.ts`

- Added `getProductName()` function to map sections to products
- Added logic to fetch and update account's `related_products`
- Handles both TEXT[] and JSONB formats (for compatibility)
- Prevents duplicate products in the array
- Non-blocking: quotation creation succeeds even if product update fails

### Features

✅ **Automatic**: No manual intervention needed  
✅ **Deduplication**: Products are only added once  
✅ **Backward Compatible**: Works with existing TEXT[] and JSONB formats  
✅ **Non-Breaking**: Quotation creation doesn't fail if product update fails  
✅ **Activity Logging**: Product addition is logged in activity metadata

## Testing

1. **Create a quotation for an account:**
   - Go to any quotation page (W-Beam, Thrie, Signages, etc.)
   - Create and save a quotation
   - Check the account's detail page
   - Verify the product appears in "Related Products" field

2. **Create multiple quotations:**
   - Create quotations for different sections
   - Verify all products are added to the array
   - Verify no duplicates are created

3. **Check existing accounts:**
   - View account details
   - Related products should show all products quoted for that account

## Database Schema

The `related_products` field should be:
- **Type**: `TEXT[]` (PostgreSQL array)
- **Default**: `'{}'` (empty array)
- **Example**: `['MBCB', 'Signages', 'Paint']`

## Notes

- Products are added automatically when quotations are **saved** (not just generated as PDF)
- The product name is normalized (e.g., "W-Beam" → "MBCB")
- If the account_id is missing, the product won't be added (but quotation still succeeds)
- The update happens asynchronously and won't block quotation creation
