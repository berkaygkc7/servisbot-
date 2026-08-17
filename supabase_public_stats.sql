-- Bu SQL komutunu Supabase Dashboard -> SQL Editor sayfasında çalıştırın.
-- Landing Page'de (anasayfada) toplam sayıları göstermek için kullanılır.
-- Güvenlik sebebiyle tabloların tamamını değil sadece satır sayısını (count) döndürür.

CREATE OR REPLACE FUNCTION get_public_platform_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Güvenliği atlayarak verileri sayabilmesini sağlar (sadece sayım için)
AS $$
DECLARE
  companies_count INT;
  students_count INT;
  vehicles_count INT;
BEGIN
  -- Firmaların sayısını al
  SELECT count(*) INTO companies_count FROM public.companies;
  
  -- Öğrencilerin sayısını al
  SELECT count(*) INTO students_count FROM public.students;
  
  -- Araçların sayısını al
  SELECT count(*) INTO vehicles_count FROM public.vehicles;

  -- Sonucu JSON olarak döndür
  RETURN json_build_object(
    'companies', companies_count,
    'students', students_count,
    'vehicles', vehicles_count
  );
END;
$$;

-- Herkesin (anonim kullanıcıların) bu fonksiyona erişebilmesine izin veriyoruz
GRANT EXECUTE ON FUNCTION get_public_platform_stats() TO anon, authenticated;
