-- Add sales_employee field to customers table
-- This allows each customer to be assigned to a specific sales employee
-- Admin@Sales can see all customers, but employees only see their own

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
-- Update existing customers to be owned by Admin@Sales (for migration purposes)
UPDATE customers 
SET sales_employee = 'Admin@Sales' 
WHERE sales_employee IS NULL;

-- Step 6: Add comment to column
COMMENT ON COLUMN customers.sales_employee IS 'Sales employee assigned to this customer. NULL or Admin@Sales means accessible to all sales team.';

-- Verify the changes:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'customers' AND column_name = 'sales_employee';

