/*
  # Comprehensive Centering Plates Rental Management System

  1. New Tables
    - `clients` - Client management with manual ID entry
    - `stock` - Real-time inventory tracking
    - `challans` - Manual challan number entry
    - `challan_items` - Line items with partner stock notes
    - `returns` - Return tracking with damage/loss

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Triggers
    - Automatic stock updates on issue and return
    - Real-time inventory management
*/

-- Drop existing tables if they exist to recreate with new schema
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS challan_line_items CASCADE;
DROP TABLE IF EXISTS challan_items CASCADE;
DROP TABLE IF EXISTS challans CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS bills CASCADE;

-- Clients table with manual ID entry
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR PRIMARY KEY,
  name TEXT NOT NULL,
  site TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stock table for real-time inventory
CREATE TABLE IF NOT EXISTS stock (
  id SERIAL PRIMARY KEY,
  plate_size TEXT UNIQUE NOT NULL,
  total_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER DEFAULT 0,
  on_rent_quantity INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Challans with manual challan numbers
CREATE TABLE IF NOT EXISTS challans (
  id SERIAL PRIMARY KEY,
  challan_number VARCHAR UNIQUE NOT NULL,
  client_id VARCHAR REFERENCES clients(id),
  challan_date DATE NOT NULL,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Challan line items with partner stock notes
CREATE TABLE IF NOT EXISTS challan_items (
  id SERIAL PRIMARY KEY,
  challan_id INTEGER REFERENCES challans(id) ON DELETE CASCADE,
  plate_size TEXT NOT NULL,
  borrowed_quantity INTEGER NOT NULL,
  returned_quantity INTEGER DEFAULT 0,
  partner_stock_notes TEXT,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Returns tracking
CREATE TABLE IF NOT EXISTS returns (
  id SERIAL PRIMARY KEY,
  challan_id INTEGER REFERENCES challans(id) ON DELETE CASCADE,
  plate_size TEXT NOT NULL,
  returned_quantity INTEGER DEFAULT 0,
  damaged_quantity INTEGER DEFAULT 0,
  lost_quantity INTEGER DEFAULT 0,
  return_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bills table for future billing functionality
CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount DECIMAL(10,2) DEFAULT 0,
  payment_status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE challan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can manage clients"
  ON clients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage stock"
  ON stock FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage challans"
  ON challans FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage challan items"
  ON challan_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage returns"
  ON returns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage bills"
  ON bills FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default stock data for common plate sizes
INSERT INTO stock (plate_size, total_quantity, available_quantity, on_rent_quantity) VALUES
('Small', 100, 100, 0),
('Medium', 150, 150, 0),
('Large', 120, 120, 0),
('XL', 80, 80, 0),
('6 inch', 50, 50, 0),
('8 inch', 75, 75, 0),
('10 inch', 100, 100, 0),
('12 inch', 90, 90, 0),
('14 inch', 70, 70, 0),
('16 inch', 60, 60, 0),
('18 inch', 50, 50, 0),
('20 inch', 40, 40, 0),
('24 inch', 30, 30, 0)
ON CONFLICT (plate_size) DO NOTHING;

-- Stock update trigger for issue
CREATE OR REPLACE FUNCTION update_stock_on_issue()
RETURNS TRIGGER AS $$
BEGIN
  -- Subtract from available stock and add to on_rent
  UPDATE stock
  SET
    available_quantity = available_quantity - NEW.borrowed_quantity,
    on_rent_quantity = on_rent_quantity + NEW.borrowed_quantity,
    updated_at = NOW()
  WHERE plate_size = NEW.plate_size;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock updates on issue
DROP TRIGGER IF EXISTS stock_update_on_issue ON challan_items;
CREATE TRIGGER stock_update_on_issue
  AFTER INSERT ON challan_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_issue();

-- Stock update trigger for return
CREATE OR REPLACE FUNCTION update_stock_on_return()
RETURNS TRIGGER AS $$
BEGIN
  -- Add back to available stock and subtract from on_rent
  UPDATE stock
  SET
    available_quantity = available_quantity + NEW.returned_quantity,
    on_rent_quantity = on_rent_quantity - NEW.returned_quantity,
    updated_at = NOW()
  WHERE plate_size = NEW.plate_size;

  -- Update challan item returned quantity
  UPDATE challan_items
  SET
    returned_quantity = returned_quantity + NEW.returned_quantity
  WHERE challan_id = NEW.challan_id AND plate_size = NEW.plate_size;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock updates on return
DROP TRIGGER IF EXISTS stock_update_on_return ON returns;
CREATE TRIGGER stock_update_on_return
  AFTER INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_return();