-- Ekstra İşler ve Kesintiler Tablosu
CREATE TABLE IF NOT EXISTS public.timesheet_adjustments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    month TEXT NOT NULL,
    year TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('extra', 'deduction')),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE public.timesheet_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for timesheet_adjustments" ON public.timesheet_adjustments;
CREATE POLICY "Tenant isolation for timesheet_adjustments" 
    ON public.timesheet_adjustments 
    FOR ALL 
    USING (company_id = public.get_auth_company_id()) 
    WITH CHECK (company_id = public.get_auth_company_id());
