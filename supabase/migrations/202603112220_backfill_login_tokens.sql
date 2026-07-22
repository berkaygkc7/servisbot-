-- Backfill missing login_tokens for older drivers and students
UPDATE public.drivers 
SET login_token = gen_random_uuid() 
WHERE login_token IS NULL;

UPDATE public.students 
SET login_token = gen_random_uuid() 
WHERE login_token IS NULL;
