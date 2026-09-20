-- ==========================================
-- Cari Hesap (Accounts) Sistemi
-- ==========================================

-- 1. Accounts tablosu oluştur
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'supplier',  -- 'supplier', 'customer', 'other'
    phone TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. RLS Politikaları
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accounts of their company"
    ON public.accounts FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert accounts to their company"
    ON public.accounts FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their company accounts"
    ON public.accounts FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their company accounts"
    ON public.accounts FOR DELETE
    USING (company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
    ));

-- 3. Expenses tablosuna account_id ekle
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- 4. Incomes tablosuna account_id ekle
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- 5. Realtime için publish et
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
