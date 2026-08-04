CREATE TABLE public.incomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    income_category TEXT NOT NULL,
    title TEXT NOT NULL,
    income_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view incomes of their company"
    ON public.incomes FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert incomes to their company"
    ON public.incomes FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their company incomes"
    ON public.incomes FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their company incomes"
    ON public.incomes FOR DELETE
    USING (company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
    ));
