-- Add Test Customers for Sales Employees
-- This script adds test customers to verify the employee-specific customer system

-- Sales@Employee1 customers: a, b, c
INSERT INTO customers (name, sales_employee) 
VALUES 
  ('a', 'Sales@Employee1'),
  ('b', 'Sales@Employee1'),
  ('c', 'Sales@Employee1')
ON CONFLICT (name, sales_employee) DO NOTHING;

-- Sales@Employee2 customers: d, e, f
INSERT INTO customers (name, sales_employee) 
VALUES 
  ('d', 'Sales@Employee2'),
  ('e', 'Sales@Employee2'),
  ('f', 'Sales@Employee2')
ON CONFLICT (name, sales_employee) DO NOTHING;

-- Sales@Employee3 customers: g, h, i
INSERT INTO customers (name, sales_employee) 
VALUES 
  ('g', 'Sales@Employee3'),
  ('h', 'Sales@Employee3'),
  ('i', 'Sales@Employee3')
ON CONFLICT (name, sales_employee) DO NOTHING;

-- Verify the customers were created:
-- SELECT name, sales_employee, created_at FROM customers WHERE sales_employee LIKE 'Sales@Employee%' ORDER BY sales_employee, name;

