-- Create a table to store the estimate counter
CREATE TABLE IF NOT EXISTS estimate_counter (
    id INTEGER PRIMARY KEY DEFAULT 1,
    current_number INTEGER NOT NULL DEFAULT 0,
    prefix VARCHAR(20) NOT NULL DEFAULT 'YNM/EST-',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert the initial row if it doesn't exist
INSERT INTO estimate_counter (id, current_number, prefix)
VALUES (1, 0, 'YNM/EST-')
ON CONFLICT (id) DO NOTHING;

-- Create or replace the function to get the next estimate number
CREATE OR REPLACE FUNCTION get_next_estimate_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    prefix_val VARCHAR(20);
BEGIN
    -- Atomically increment and get the next number
    UPDATE estimate_counter 
    SET current_number = current_number + 1,
        updated_at = NOW()
    WHERE id = 1
    RETURNING current_number, prefix INTO next_num, prefix_val;
    
    -- If no row was updated, insert one and return 1
    IF next_num IS NULL THEN
        INSERT INTO estimate_counter (id, current_number, prefix)
        VALUES (1, 1, 'YNM/EST-')
        RETURNING current_number, prefix INTO next_num, prefix_val;
    END IF;
    
    RETURN prefix_val || next_num::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON estimate_counter TO authenticated;
GRANT ALL ON estimate_counter TO service_role;
GRANT EXECUTE ON FUNCTION get_next_estimate_number() TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_estimate_number() TO service_role;

-- Test the function (optional - run separately)
-- SELECT get_next_estimate_number();
