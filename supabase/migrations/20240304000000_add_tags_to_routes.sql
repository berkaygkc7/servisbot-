-- Add tags array to routes table
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
