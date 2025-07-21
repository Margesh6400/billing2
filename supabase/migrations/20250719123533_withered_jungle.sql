/*
  # Create rental management tables

  1. New Tables
    - `clients`
      - `id` (text, primary key, manually assigned)
      - `name` (text)
      - `site` (text)
      - `mobile_number` (text)
      - `created_at` (timestamp)
    
    - `challans`
      - `id` (uuid, primary key)
      - `challan_number` (text, unique, auto-generated)
      - `client_id` (text, foreign key)
      - `created_at` (timestamp)
    
    - `challan_line_items`
      - `id` (uuid, primary key)
      - `challan_id` (uuid, foreign key)
      - `plate_size` (text)
      - `count` (integer)
      - `notes` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
*/

CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  site text NOT NULL,
  mobile_number text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_number text UNIQUE NOT NULL,
  client_id text NOT NULL REFERENCES clients(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challan_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_id uuid NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
  plate_size text NOT NULL,
  count integer NOT NULL CHECK (count > 0),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE challan_line_items ENABLE ROW LEVEL SECURITY;

-- Policies for clients table
CREATE POLICY "Authenticated users can manage clients"
  ON clients
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for challans table
CREATE POLICY "Authenticated users can manage challans"
  ON challans
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for challan_line_items table
CREATE POLICY "Authenticated users can manage challan line items"
  ON challan_line_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to generate unique challan number
CREATE OR REPLACE FUNCTION generate_challan_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER := 1;
BEGIN
  LOOP
    new_number := 'CH' || TO_CHAR(EXTRACT(YEAR FROM NOW()), 'YYYY') || 
                  LPAD(counter::TEXT, 6, '0');
    
    IF NOT EXISTS (SELECT 1 FROM challans WHERE challan_number = new_number) THEN
      RETURN new_number;
    END IF;
    
    counter := counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;