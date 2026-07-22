** Rotalara Saat Özelliği Ekleme **

-- Bugünki rotalar sayfasındaki saat filtrelemesinin ve genel rota çalışma saatlerinin belirlenebilmesi için:
ALTER TABLE public.routes 
ADD COLUMN IF NOT EXISTS "time" text DEFAULT '08:00';
