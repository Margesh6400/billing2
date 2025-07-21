/*
  # Update Returns Schema for Simple Manual Process

  1. New Tables
    - `returns` - Main return records with manual challan numbers
    - `return_line_items` - Individual return items (only created for quantities > 0)
  
  2. Changes
    - Remove complex validation requirements
    - Support manual return challan numbers
    - Optional quantity processing
    
  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Drop existing returns table if it exists
DROP TABLE IF EXISTS returns CASCADE;

-- Create new returns table for manual process
CREATE TABLE IF NOT EXISTS returns (
  id SERIAL PRIMARY KEY,
  return_challan_number VARCHAR UNIQUE NOT NULL,
  client_id VARCHAR REFERENCES clients(id),
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create return line items table
CREATE TABLE IF NOT EXISTS return_line_items (
  id SERIAL PRIMARY KEY,
  return_id INTEGER REFERENCES returns(id) ON DELETE CASCADE,
  plate_size TEXT NOT NULL,
  returned_quantity INTEGER NOT NULL,
  damage_notes TEXT,
  partner_stock_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_line_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can manage returns"
  ON returns
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage return line items"
  ON return_line_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger function for stock updates on returns
CREATE OR REPLACE FUNCTION update_stock_on_return_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Add returned quantity back to available stock
  -- Subtract from on_rent_quantity
  UPDATE stock
  SET 
    available_quantity = available_quantity + NEW.returned_quantity,
    on_rent_quantity = GREATEST(0, on_rent_quantity - NEW.returned_quantity),
    updated_at = NOW()
  WHERE plate_size = NEW.plate_size;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS stock_update_on_return_item ON return_line_items;
CREATE TRIGGER stock_update_on_return_item
  AFTER INSERT ON return_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_return_item();