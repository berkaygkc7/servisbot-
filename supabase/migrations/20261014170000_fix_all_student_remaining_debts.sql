-- ==============================================================================
-- Migration: Tüm Öğrencilerin Kalan Yıllık Borçlarını Kesin ve Doğru Olarak Düzelt
-- 1) 'Peşin Ödedi' etiketine sahip olanların borcu 0 yapılır.
-- 2) Mahalle kuralı (okula özel veya genel) olanların yıllık tutarından 'Ödendi' tutarları düşülür.
-- 3) Mahalle kuralı olmayıp özel fiyatı (custom_price) olanların 10 taksit tutarından 'Ödendi' tutarları düşülür.
-- ==============================================================================

-- 1. Peşin ödeyenlerin borcunu 0 TL yap
UPDATE public.students
SET total_debt = 0
WHERE 'Peşin Ödedi' = ANY(tags);

-- 2. Fiyatlandırma kuralı olan öğrencilerin borcunu (Yıllık Tutar - Yapılan Ödemeler) olarak güncelle
UPDATE public.students s
SET total_debt = GREATEST(0, 
    COALESCE(pr.calculated_annual, 0) - COALESCE(paid.total_paid, 0)
)
FROM (
    SELECT DISTINCT ON (st.id) 
        st.id as student_id,
        COALESCE(
            NULLIF(pr.annual_amount, 0),
            pr.amount * (CASE 
                WHEN LOWER(c.company_name) LIKE '%güroz%' OR LOWER(c.company_name) LIKE '%guroz%' OR LOWER(c.company_name) LIKE '%halegül%' OR LOWER(c.company_name) LIKE '%halegul%' THEN 9 
                ELSE 10 
            END)
        ) as calculated_annual
    FROM public.students st
    JOIN public.companies c ON c.id = st.company_id
    JOIN public.pricing_rules pr ON pr.company_id = st.company_id
        AND (
            LOWER(TRIM(pr.school_level)) = LOWER(TRIM(st.neighborhood))
            OR LOWER(REPLACE(REPLACE(TRIM(pr.school_level), 'İ', 'i'), 'I', 'ı')) = LOWER(REPLACE(REPLACE(TRIM(st.neighborhood), 'İ', 'i'), 'I', 'ı'))
        )
        AND (pr.school_id = st.school_id OR pr.school_id IS NULL)
    WHERE st.status != 'pending'
        AND st.neighborhood IS NOT NULL
        AND (pr.annual_amount > 0 OR pr.amount > 0)
        AND NOT ('Peşin Ödedi' = ANY(COALESCE(st.tags, ARRAY[]::TEXT[])))
    ORDER BY st.id, pr.school_id NULLS LAST
) pr
LEFT JOIN (
    SELECT student_id, SUM(amount) as total_paid
    FROM public.payments
    WHERE status = 'Ödendi'
    GROUP BY student_id
) paid ON paid.student_id = pr.student_id
WHERE s.id = pr.student_id
AND s.status != 'pending'
AND NOT ('Peşin Ödedi' = ANY(COALESCE(s.tags, ARRAY[]::TEXT[])));

-- 3. Kuralı olmayıp özel fiyatı (custom_price) olan öğrencilerin borcunu güncelle
UPDATE public.students s
SET total_debt = GREATEST(0,
    COALESCE(s.custom_price, 0) * (CASE 
        WHEN LOWER(c.company_name) LIKE '%güroz%' OR LOWER(c.company_name) LIKE '%guroz%' OR LOWER(c.company_name) LIKE '%halegül%' OR LOWER(c.company_name) LIKE '%halegul%' THEN 9 
        ELSE 10 
    END) - COALESCE(paid.total_paid, 0)
)
FROM public.companies c
LEFT JOIN (
    SELECT student_id, SUM(amount) as total_paid
    FROM public.payments
    WHERE status = 'Ödendi'
    GROUP BY student_id
) paid ON paid.student_id = s.id
WHERE s.company_id = c.id
AND s.status != 'pending'
AND s.custom_price IS NOT NULL
AND s.custom_price > 0
AND NOT ('Peşin Ödedi' = ANY(COALESCE(s.tags, ARRAY[]::TEXT[])))
AND NOT EXISTS (
    SELECT 1 FROM public.pricing_rules pr
    WHERE pr.company_id = s.company_id
    AND (
        LOWER(TRIM(pr.school_level)) = LOWER(TRIM(s.neighborhood))
        OR LOWER(REPLACE(REPLACE(TRIM(pr.school_level), 'İ', 'i'), 'I', 'ı')) = LOWER(REPLACE(REPLACE(TRIM(s.neighborhood), 'İ', 'i'), 'I', 'ı'))
    )
    AND (pr.annual_amount > 0 OR pr.amount > 0)
);
