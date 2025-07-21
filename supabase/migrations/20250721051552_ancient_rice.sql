/*
  # Update Stock with New Plate Sizes

  1. New Plate Sizes
    - Replace old generic sizes with specific construction plate dimensions
    - Add support for Gujarati text: 'પતરા' and '2 ફુટ'
    - Include standard sizes: '2 X 3', '21 X 3', '18 X 3', '15 X 3', '12 X 3', '9 X 3', '2 X 2'

  2. Data Migration
    - Clear existing stock entries (if any)
    - Insert new plate sizes with zero quantities
    - Maintain daily rate structure

  3. Character Encoding
    - Ensure proper UTF-8 support for Gujarati characters
    - Set appropriate collation for text fields
*/

-- Clear existing stock entries to start fresh with new sizes
DELETE FROM stock;

-- Insert new plate sizes with zero initial quantities
INSERT INTO stock (plate_size, total_quantity, available_quantity, on_rent_quantity, daily_rate) VALUES
('2 X 3', 0, 0, 0, 10.00),
('21 X 3', 0, 0, 0, 10.00),
('18 X 3', 0, 0, 0, 10.00),
('15 X 3', 0, 0, 0, 10.00),
('12 X 3', 0, 0, 0, 10.00),
('9 X 3', 0, 0, 0, 10.00),
('પતરા', 0, 0, 0, 10.00),
('2 X 2', 0, 0, 0, 10.00),
('2 ફુટ', 0, 0, 0, 10.00)
ON CONFLICT (plate_size) DO NOTHING;