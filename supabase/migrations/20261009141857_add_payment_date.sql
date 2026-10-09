-- Add payment_date to payments table to track when a payment was marked as paid
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone;
