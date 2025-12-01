# Database Cleanup Summary

## Changes Made

### ✅ Removed Tables
1. **`places_of_supply`** - Replaced by `states` and `cities` tables
2. **`customers`** - Replaced by `accounts` → `sub_accounts` hierarchy

### ✅ Updated Tables
1. **`quotes_mbcb`**, **`quotes_signages`**, **`quotes_paint`**:
   - ❌ Removed: `place_of_supply` (TEXT)
   - ❌ Removed: `customer_id` (INTEGER)
   - ✅ Added: `state_id` (INTEGER REFERENCES states(id))
   - ✅ Added: `city_id` (INTEGER REFERENCES cities(id))
   - ✅ Kept: `sub_account_id` (INTEGER NOT NULL REFERENCES sub_accounts(id))
   - ✅ Kept: `customer_name` (TEXT) - Display name from sub-account

### ✅ New Component
- **`StateCitySelect`** - Replaces `PlaceOfSupplySelect`
  - Shows State dropdown first
  - Shows City dropdown based on selected state
  - Returns both IDs and names

## Files Updated

### SQL Script
- ✅ `docs/COMPLETE_DATABASE_REBUILD.sql` - Removed old tables, updated quotation schema

### Components
- ✅ `components/forms/StateCitySelect.tsx` - New component created
- ❌ `components/forms/PlaceOfSupplySelect.tsx` - Can be removed
- ❌ `components/forms/CustomerSelect.tsx` - Can be removed (replaced by SubAccountSelect)

### API Routes
- ✅ `app/api/quotes/route.ts` - Updated to use state_id/city_id, removed customer_id
- ⚠️ `app/api/meta/[type]/route.ts` - Still has 'places' and 'customers' endpoints (can remove later)

### Pages (W-Beam Done)
- ✅ `app/mbcb/w-beam/page.tsx` - Updated to use StateCitySelect
- ⏳ `app/mbcb/double-w-beam/page.tsx` - TODO: Update
- ⏳ `app/mbcb/thrie/page.tsx` - TODO: Update
- ⏳ `app/signages/reflective/page.tsx` - TODO: Update
- ⏳ `app/paint/page.tsx` - TODO: Update
- ⏳ `app/history/page.tsx` - TODO: Update to display state/city instead of place_of_supply

## Remaining Work

### 1. Update Remaining Quotation Pages
All quotation pages need the same changes as W-Beam:
- Replace `PlaceOfSupplySelect` with `StateCitySelect`
- Replace `placeOfSupply` state with `stateId`, `cityId`, `stateName`, `cityName`
- Update `handleSaveQuotation` to send `state_id` and `city_id`
- Update PDF generation to use state/city names

### 2. Update Quotation History Page
- Display state/city names instead of place_of_supply
- Update filters to use state/city dropdowns
- Fetch state/city names from IDs when loading quotes

### 3. Clean Up
- Delete `components/forms/PlaceOfSupplySelect.tsx`
- Delete `components/forms/CustomerSelect.tsx`
- Remove 'places' and 'customers' endpoints from `/api/meta/[type]`

### 4. Update GET /api/quotes Route
- When fetching quotes, include state/city names via joins
- Return `state_name` and `city_name` in response

## Testing Checklist

- [ ] Create quotation with state/city selection
- [ ] Verify state/city saved correctly in database
- [ ] Verify PDF generation works with state/city
- [ ] Verify quotation history shows state/city
- [ ] Verify filters work with state/city
- [ ] Verify employee can only see their sub-accounts

