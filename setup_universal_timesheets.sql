-- 1. Create Universal Timesheet config table
CREATE TABLE IF NOT EXISTS public.universal_timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    month VARCHAR(2) NOT NULL,
    year VARCHAR(4) NOT NULL,
    primary_label VARCHAR(100) DEFAULT 'Personel Adı/Hizmet',
    category_label VARCHAR(100) DEFAULT 'Departman/Güzergah',
    unique_key_label VARCHAR(100) DEFAULT 'Sicil No/Plaka/T.C.',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS and add policies
ALTER TABLE public.universal_timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read universal_timesheets" ON public.universal_timesheets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert universal_timesheets" ON public.universal_timesheets
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update universal_timesheets" ON public.universal_timesheets
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete universal_timesheets" ON public.universal_timesheets
    FOR DELETE TO authenticated USING (true);


-- 2. Create Universal Timesheet Rows table
CREATE TABLE IF NOT EXISTS public.universal_timesheet_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_id UUID REFERENCES public.universal_timesheets(id) ON DELETE CASCADE,
    primary_name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    unique_identifier VARCHAR(100),
    description TEXT,
    unit_price NUMERIC(15, 2) DEFAULT 0.00,
    extra_payment NUMERIC(15, 2) DEFAULT 0.00,
    deduction NUMERIC(15, 2) DEFAULT 0.00,
    days_data JSONB DEFAULT '{}'::jsonb, -- e.g., {"1": "8", "2": "R", "3": "İ"}
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.universal_timesheet_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read universal_timesheet_rows" ON public.universal_timesheet_rows
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert universal_timesheet_rows" ON public.universal_timesheet_rows
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update universal_timesheet_rows" ON public.universal_timesheet_rows
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete universal_timesheet_rows" ON public.universal_timesheet_rows
    FOR DELETE TO authenticated USING (true);


-- 3. Create Universal Timesheet Custom Taxes table
CREATE TABLE IF NOT EXISTS public.universal_timesheet_taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_id UUID REFERENCES public.universal_timesheets(id) ON DELETE CASCADE,
    tax_name VARCHAR(100) NOT NULL, -- e.g., 'KDV %10', 'Stopaj %20'
    tax_rate NUMERIC(5, 2) NOT NULL, -- e.g., 10.00, -20.00
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.universal_timesheet_taxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read universal_timesheet_taxes" ON public.universal_timesheet_taxes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert universal_timesheet_taxes" ON public.universal_timesheet_taxes
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update universal_timesheet_taxes" ON public.universal_timesheet_taxes
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete universal_timesheet_taxes" ON public.universal_timesheet_taxes
    FOR DELETE TO authenticated USING (true);
