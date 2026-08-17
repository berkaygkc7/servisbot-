-- 1. universal_timesheets tablosuna gerekli yeni kolonların eklenmesi
ALTER TABLE public.universal_timesheets 
ADD COLUMN IF NOT EXISTS grouped_view BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS holiday_days JSONB DEFAULT '[]'::jsonb;

-- 2. expenses (giderler) tablosuna kilometre kolonunun eklenmesi
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS kilometer INTEGER DEFAULT NULL;

-- 3. 'Geziler ve Ekstra İşler' kategorisi expenses sayfasında kod içerisinden yönetilecek.
