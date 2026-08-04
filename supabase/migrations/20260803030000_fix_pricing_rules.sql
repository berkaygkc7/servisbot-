-- 1. Ensure pricing_rules table exists with correct schema
CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    school_level TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ensure unique constraint exists for the UPSERT to work
-- First drop it if it exists under a different name to avoid duplicates (optional, but safe to just add if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_company_id_school_level_key'
    ) THEN
        ALTER TABLE public.pricing_rules ADD CONSTRAINT pricing_rules_company_id_school_level_key UNIQUE (company_id, school_level);
    END IF;
END $$;

-- 3. Remove any old CHECK constraints that might restrict school_level to 'İlkokul', 'Ortaokul' etc.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.pricing_rules'::regclass AND contype = 'c'
    ) LOOP
        EXECUTE 'ALTER TABLE public.pricing_rules DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 4. Re-apply correct RLS Policies (Drop old ones first to prevent conflicts)
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view pricing rules for their company" ON public.pricing_rules;
DROP POLICY IF EXISTS "Users can manage pricing rules for their company" ON public.pricing_rules;
DROP POLICY IF EXISTS "Tenant isolation for pricing_rules" ON public.pricing_rules;

CREATE POLICY "Tenant isolation for pricing_rules" ON public.pricing_rules 
    FOR ALL 
    USING (company_id = public.get_auth_company_id()) 
    WITH CHECK (company_id = public.get_auth_company_id());
