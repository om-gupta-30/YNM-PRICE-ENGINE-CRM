# Customer Management by Sales Employee - Implementation Guide

## Overview
This implementation creates a separate customer database for each sales employee. Each customer is assigned to a specific sales employee, and employees can only see/manage their own customers. Admin@Sales can see all customers.

## Changes Made

### 1. Database Schema Updates
**File**: `docs/ADD_SALES_EMPLOYEE_TO_CUSTOMERS.sql`

- Added `sales_employee` column to `customers` table
- Changed unique constraint from `name` to `(name, sales_employee)` - allows same customer name for different employees
- Added index on `sales_employee` for faster queries
- Existing customers assigned to `Admin@Sales` for migration

### 2. Admin User Removal
**File**: `docs/REMOVE_ADMIN_USER.sql`

- Removes the `Admin` user with password `Admin@123` from the system

### 3. API Updates
**File**: `app/api/meta/[type]/route.ts`

#### GET Endpoint (Fetch Customers)
- Now accepts query parameters: `salesEmployee` and `isAdmin`
- Filters customers by sales employee:
  - `Admin@Sales`: Sees all customers
  - Sales employees: Only see their own customers

#### POST Endpoint (Create Customer)
- Now accepts `salesEmployee` in request body
- Creates customer with assigned sales employee
- If no sales employee provided, defaults to `Admin@Sales`

### 4. Frontend Updates

#### SmartDropdown Component
**File**: `components/forms/SmartDropdown.tsx`
- Automatically passes `salesEmployee` and `isAdmin` when fetching customers
- Automatically includes `salesEmployee` when creating new customers
- Uses localStorage to get current user info

#### Quotation Pages
Updated all pages that create customers:
- `app/mbcb/w-beam/page.tsx`
- `app/mbcb/thrie/page.tsx`
- `app/mbcb/double-w-beam/page.tsx`
- `app/signages/reflective/page.tsx`

All now include `salesEmployee` when creating customers via API.

## Database Migration Steps

1. **Run the schema update:**
   ```sql
   -- Execute: docs/ADD_SALES_EMPLOYEE_TO_CUSTOMERS.sql
   ```

2. **Remove Admin user (if desired):**
   ```sql
   -- Execute: docs/REMOVE_ADMIN_USER.sql
   ```

## How It Works

### For Sales Employees
- When a sales employee creates a quotation, any new customer is automatically assigned to them
- When viewing customer dropdown, they only see customers assigned to them
- Example: `Sales@Employee1` only sees customers where `sales_employee = 'Sales@Employee1'`

### For Admin@Sales
- Can see all customers from all sales employees
- Can create customers (will be assigned to `Admin@Sales` by default)
- Has full visibility for management purposes

### Customer Assignment Logic
```typescript
// Determine sales employee from current user
const username = localStorage.getItem('username') || '';
const salesEmployee = username.includes('@Sales') ? username : 'Admin@Sales';
```

- If username contains `@Sales`, use that username as sales employee
- Otherwise, default to `Admin@Sales`

## Unique Constraint Behavior

The unique constraint `(name, sales_employee)` allows:
- ✅ Same customer name for different employees (e.g., "ABC Corp" for Employee1 and Employee2)
- ❌ Duplicate customer name for same employee (e.g., Employee1 cannot have two "ABC Corp" customers)

This ensures employees can have their own customer lists without conflicts.

## Testing Checklist

- [ ] Run SQL migration scripts
- [ ] Test customer creation by different sales employees
- [ ] Verify employees only see their own customers
- [ ] Verify Admin@Sales sees all customers
- [ ] Test customer creation in all quotation pages (MBCB, Signages, etc.)
- [ ] Verify dropdowns show correct customers for each user
- [ ] Test that same customer name can exist for different employees

