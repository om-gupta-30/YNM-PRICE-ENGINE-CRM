-- ============================================
-- COMPLETE DATABASE UPDATE FOR YNM SAFETY SYSTEM
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: ADD SALES_EMPLOYEE TO CUSTOMERS TABLE
-- ============================================

-- Step 1: Add sales_employee column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS sales_employee VARCHAR(255);

-- Step 2: Drop the unique constraint on name (since same customer name can exist for different employees)
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS customers_name_key;

-- Step 3: Add unique constraint on (name, sales_employee) combination
-- This ensures same customer name can exist for different sales employees, but not duplicate for same employee
ALTER TABLE customers 
ADD CONSTRAINT customers_name_sales_employee_unique UNIQUE (name, sales_employee);

-- Step 4: Create index on sales_employee for faster queries
CREATE INDEX IF NOT EXISTS idx_customers_sales_employee ON customers(sales_employee);

-- Step 5: For existing customers without sales_employee, assign them to Admin@Sales
UPDATE customers 
SET sales_employee = 'Admin@Sales' 
WHERE sales_employee IS NULL;

-- Step 6: Add comment to column
COMMENT ON COLUMN customers.sales_employee IS 'Sales employee assigned to this customer. NULL or Admin@Sales means accessible to all sales team.';

-- ============================================
-- PART 2: ADD STATUS COLUMN TO QUOTATION TABLES
-- ============================================

-- Add status column to quotes_mbcb table
ALTER TABLE quotes_mbcb 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Add status column to quotes_signages table
ALTER TABLE quotes_signages 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Add status column to quotes_paint table
ALTER TABLE quotes_paint 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Update existing records to have 'draft' status if null
UPDATE quotes_mbcb SET status = 'draft' WHERE status IS NULL;
UPDATE quotes_signages SET status = 'draft' WHERE status IS NULL;
UPDATE quotes_paint SET status = 'draft' WHERE status IS NULL;

-- Add comments to status columns
COMMENT ON COLUMN quotes_mbcb.status IS 'Quotation status: draft, sent, accepted, rejected, on_hold, etc.';
COMMENT ON COLUMN quotes_signages.status IS 'Quotation status: draft, sent, accepted, rejected, on_hold, etc.';
COMMENT ON COLUMN quotes_paint.status IS 'Quotation status: draft, sent, accepted, rejected, on_hold, etc.';

-- ============================================
-- PART 3: REMOVE ADMIN USER
-- ============================================

-- Delete Admin user
DELETE FROM users 
WHERE user_id = 'Admin' AND password = 'Admin@123';

-- ============================================
-- PART 4: CREATE DEPARTMENT USERS
-- ============================================

-- Sales Department Users
INSERT INTO users (user_id, password) 
VALUES 
  ('Admin@Sales', 'Admin@Sales@123'),
  ('Sales@Employee1', 'Sales@Employee1@123'),
  ('Sales@Employee2', 'Sales@Employee2@123'),
  ('Sales@Employee3', 'Sales@Employee3@123')
ON CONFLICT (user_id) DO UPDATE 
SET password = EXCLUDED.password,
    updated_at = NOW();

-- Accounts Department Users
INSERT INTO users (user_id, password) 
VALUES 
  ('Admin@Accounts', 'Admin@Accounts@123')
ON CONFLICT (user_id) DO UPDATE 
SET password = EXCLUDED.password,
    updated_at = NOW();

-- ============================================
-- VERIFICATION QUERIES (Optional - run to verify)
-- ============================================

-- Verify customers table has sales_employee column
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'customers' AND column_name = 'sales_employee';

-- Verify quotation tables have status column
-- SELECT table_name, column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name IN ('quotes_mbcb', 'quotes_signages', 'quotes_paint') 
-- AND column_name = 'status';

-- Verify Admin user is removed
-- SELECT user_id, created_at FROM users WHERE user_id = 'Admin';
-- Should return no rows

-- Verify all users were created
-- SELECT user_id, created_at, last_password_change FROM users ORDER BY user_id;

-- ============================================
-- END OF SCRIPT
-- ============================================

