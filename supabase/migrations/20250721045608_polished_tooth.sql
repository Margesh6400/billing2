/*
  # Update Plate Sizes and Stock Management

  1. New Features
    - Add daily_rate column to stock table
    - Insert new plate sizes with Gujarati support
    - Add function to add new plate sizes dynamically
    
  2. Security
    - Maintain existing RLS policies
    - Add validation for new plate size function
*/

-- Add daily_rate column to stock table
ALTER TABLE stock ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10,2) DEFAULT 10.00;

-- Clear existing stock data and insert new plate sizes
DELETE FROM stock;

-- Insert the new plate sizes with Gujarati support
INSERT INTO stock (plate_size, total_quantity, available_quantity, on_rent_quantity, daily_rate) VALUES
('2 X 3', 50, 50, 0, 10.00),
('21 X 3', 40, 40, 0, 10.00),
('18 X 3', 45, 45, 0, 10.00),
('15 X 3', 35, 35, 0, 10.00),
('12 X 3', 30, 30, 0, 10.00),
('9 X 3', 25, 25, 0, 10.00),
('પતરા', 20, 20, 0, 10.00),
('2 X 2', 40, 40, 0, 10.00),
('2 ફુટ', 30, 30, 0, 10.00)
ON CONFLICT (plate_size) DO UPDATE SET
  total_quantity = EXCLUDED.total_quantity,
  available_quantity = EXCLUDED.available_quantity,
  daily_rate = EXCLUDED.daily_rate;

-- Function to add new plate size
CREATE OR REPLACE FUNCTION add_new_plate_size(
  new_size TEXT,
  initial_quantity INTEGER,
  rate DECIMAL(10,2)
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO stock (plate_size, total_quantity, available_quantity, on_rent_quantity, daily_rate)
  VALUES (new_size, initial_quantity, initial_quantity, 0, rate);
  RETURN TRUE;
EXCEPTION WHEN unique_violation THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to update plate size
CREATE OR REPLACE FUNCTION update_plate_size(
  old_size TEXT,
  new_size TEXT,
  new_rate DECIMAL(10,2)
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE stock 
  SET plate_size = new_size, daily_rate = new_rate
  WHERE plate_size = old_size;
  RETURN TRUE;
EXCEPTION WHEN unique_violation THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to delete plate size (only if no transactions exist)
CREATE OR REPLACE FUNCTION delete_plate_size(size_to_delete TEXT) RETURNS BOOLEAN AS $$
DECLARE
  has_transactions BOOLEAN;
BEGIN
  -- Check if plate size has any transactions
  SELECT EXISTS(
    SELECT 1 FROM challan_items WHERE plate_size = size_to_delete
    UNION
    SELECT 1 FROM return_line_items WHERE plate_size = size_to_delete
  ) INTO has_transactions;
  
  IF has_transactions THEN
    RETURN FALSE;
  END IF;
  
  DELETE FROM stock WHERE plate_size = size_to_delete;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;