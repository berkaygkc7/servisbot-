-- Add color column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color TEXT DEFAULT NULL;
