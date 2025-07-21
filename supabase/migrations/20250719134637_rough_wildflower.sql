/*
  # Fix challan number generation function

  1. Drop and recreate the generate_challan_number function
  2. Fix ambiguous column reference by using proper table qualification
  3. Ensure function returns a unique challan number
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_challan_number();

-- Create the corrected function
CREATE OR REPLACE FUNCTION generate_challan_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER := 1;
  base_number TEXT;
BEGIN
  -- Generate base number using current date
  base_number := 'CH' || TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Find the next available number
  LOOP
    new_number := base_number || LPAD(counter::TEXT, 3, '0');
    
    -- Check if this number already exists in challans table
    IF NOT EXISTS (
      SELECT 1 FROM challans WHERE challans.challan_number = new_number
    ) THEN
      EXIT;
    END IF;
    
    counter := counter + 1;
  END LOOP;
  
  RETURN new_number;
END;
$$;