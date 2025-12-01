-- Create bill_to_addresses table
CREATE TABLE IF NOT EXISTS bill_to_addresses (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(255),
  state VARCHAR(255),
  pincode VARCHAR(20),
  gstin VARCHAR(50),
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_name)
);

-- Create ship_to_addresses table
CREATE TABLE IF NOT EXISTS ship_to_addresses (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(255),
  state VARCHAR(255),
  pincode VARCHAR(20),
  gstin VARCHAR(50),
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_name)
);

-- Create estimate_numbers table to track estimate numbers
CREATE TABLE IF NOT EXISTS estimate_numbers (
  id SERIAL PRIMARY KEY,
  last_estimate_number INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial estimate number record
INSERT INTO estimate_numbers (last_estimate_number) VALUES (0)
ON CONFLICT DO NOTHING;

-- Create function to get next estimate number
CREATE OR REPLACE FUNCTION get_next_estimate_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  estimate_id INTEGER;
BEGIN
  -- Get the ID of the estimate_numbers row (should be only one row)
  SELECT id INTO estimate_id FROM estimate_numbers LIMIT 1;
  
  -- If no row exists, create one
  IF estimate_id IS NULL THEN
    INSERT INTO estimate_numbers (last_estimate_number) VALUES (0) RETURNING id INTO estimate_id;
  END IF;
  
  -- Update the specific row by ID (IMPORTANT: WHERE clause required)
  UPDATE estimate_numbers
  SET last_estimate_number = last_estimate_number + 1,
      updated_at = NOW()
  WHERE id = estimate_id
  RETURNING last_estimate_number INTO next_num;
  
  -- Return formatted estimate number
  RETURN 'YNM/EST-' || next_num::TEXT;
END;
$$ LANGUAGE plpgsql;

