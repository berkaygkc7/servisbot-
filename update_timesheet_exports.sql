-- Bu kod, evrensel puantaj tablolarına "Gelirlere Aktarıldı" ve "Giderlere Aktarıldı"
-- durumlarını tutmak için iki yeni tarih sütunu ekler.

ALTER TABLE public.universal_timesheets 
ADD COLUMN IF NOT EXISTS exported_to_incomes_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS exported_to_expenses_at TIMESTAMPTZ;
