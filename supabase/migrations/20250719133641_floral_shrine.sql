/*
  # Fix Missing Database Schema Elements

  1. New Tables
    - Create missing `stock` table for inventory management
    - Create missing `returns` table for return tracking
    - Create missing `bills` table for billing management

  2. Missing Columns
    - Add `status` column to `challans` table (default: 'active')
    - Add `challan_date` column to `challans` table (default: current date)

  3. Foreign Key Relationships
    - Add foreign key constraint from `returns.challan_id` to `challans.id`
    - Add foreign key constraint from `bills.client_id` to `clients.id`

  4. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage data
*/

-- Create the stock table
CREATE TABLE IF NOT EXISTS public.stock (
  plate_size text PRIMARY KEY,
  quantity_available integer DEFAULT 0 NOT NULL,
  total_on_rent integer DEFAULT 0 NOT NULL,
  damaged integer DEFAULT 0 NOT NULL,
  partner_stock integer DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create the returns table
CREATE TABLE IF NOT EXISTS public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_id uuid NOT NULL,
  plate_size text NOT NULL,
  returned_count integer DEFAULT 0 NOT NULL,
  damaged_count integer DEFAULT 0 NOT NULL,
  lost_count integer DEFAULT 0 NOT NULL,
  return_date date DEFAULT CURRENT_DATE NOT NULL,
  notes text DEFAULT '' NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create the bills table
CREATE TABLE IF NOT EXISTS public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_amount numeric(10,2) DEFAULT 0 NOT NULL,
  payment_status text DEFAULT 'pending' NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add missing columns to challans table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challans' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.challans ADD COLUMN status text DEFAULT 'active' NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challans' AND column_name = 'challan_date'
  ) THEN
    ALTER TABLE public.challans ADD COLUMN challan_date date DEFAULT CURRENT_DATE NOT NULL;
  END IF;
END $$;

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'returns_challan_id_fkey'
  ) THEN
    ALTER TABLE public.returns
    ADD CONSTRAINT returns_challan_id_fkey
    FOREIGN KEY (challan_id) REFERENCES public.challans(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bills_client_id_fkey'
  ) THEN
    ALTER TABLE public.bills
    ADD CONSTRAINT bills_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Create policies for stock table
CREATE POLICY "Authenticated users can manage stock"
  ON public.stock
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for returns table
CREATE POLICY "Authenticated users can manage returns"
  ON public.returns
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for bills table
CREATE POLICY "Authenticated users can manage bills"
  ON public.bills
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default stock data for common plate sizes
INSERT INTO public.stock (plate_size, quantity_available, total_on_rent, damaged, partner_stock)
VALUES 
  ('6 inch', 0, 0, 0, 0),
  ('8 inch', 0, 0, 0, 0),
  ('10 inch', 0, 0, 0, 0),
  ('12 inch', 0, 0, 0, 0),
  ('14 inch', 0, 0, 0, 0),
  ('16 inch', 0, 0, 0, 0),
  ('18 inch', 0, 0, 0, 0),
  ('20 inch', 0, 0, 0, 0),
  ('24 inch', 0, 0, 0, 0)
ON CONFLICT (plate_size) DO NOTHING;

-- Create function to generate challan numbers
CREATE OR REPLACE FUNCTION generate_challan_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
  challan_number text;
BEGIN
  -- Get the next sequential number
  SELECT COALESCE(MAX(CAST(SUBSTRING(challan_number FROM '[0-9]+') AS integer)), 0) + 1
  INTO next_number
  FROM challans
  WHERE challan_number ~ '^CH[0-9]+$';
  
  -- Format as CH followed by 6-digit number
  challan_number := 'CH' || LPAD(next_number::text, 6, '0');
  
  RETURN challan_number;
END;
$$;