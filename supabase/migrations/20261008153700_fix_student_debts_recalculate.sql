-- Migration: Fix all student debts by recalculating from actual paid payments
-- Root cause: handleFixDebts was filtering by 'approved'/'completed' instead of 'Ödendi'
-- This caused student debts to be reset to full annual amounts, ignoring paid amounts

-- Step 1: Recalculate total_debt for students who have pricing rules with annual_amount
-- Formula: total_debt = annual_amount - SUM(paid payments)
UPDATE public.students s
SET total_debt = GREATEST(0, 
    COALESCE(pr.annual_amount, 0) - COALESCE(paid.total_paid, 0)
)
FROM (
    -- Get the best matching pricing rule for each student
    SELECT DISTINCT ON (st.id) 
        st.id as student_id,
        pr.annual_amount
    FROM public.students st
    JOIN public.pricing_rules pr ON pr.company_id = st.company_id
        AND LOWER(TRIM(pr.school_level)) = LOWER(TRIM(st.neighborhood))
        AND (pr.school_id = st.school_id OR pr.school_id IS NULL)
    WHERE st.status != 'pending'
        AND st.neighborhood IS NOT NULL
        AND pr.annual_amount IS NOT NULL
        AND pr.annual_amount > 0
    ORDER BY st.id, pr.school_id NULLS LAST  -- Prefer school-specific rules
) pr
LEFT JOIN (
    -- Sum all paid payments per student
    SELECT student_id, SUM(amount) as total_paid
    FROM public.payments
    WHERE status = 'Ödendi'
    GROUP BY student_id
) paid ON paid.student_id = pr.student_id
WHERE s.id = pr.student_id
AND s.status != 'pending';

-- Step 2: For students WITHOUT pricing rules but WITH custom_price,
-- recalculate based on custom_price * multiplier (default 10) minus paid
-- This handles edge cases where students have custom pricing
UPDATE public.students s
SET total_debt = GREATEST(0,
    COALESCE(s.custom_price, 0) * 10 - COALESCE(paid.total_paid, 0)
)
FROM (
    SELECT student_id, SUM(amount) as total_paid
    FROM public.payments
    WHERE status = 'Ödendi'
    GROUP BY student_id
) paid
WHERE s.id = paid.student_id
AND s.status != 'pending'
AND s.custom_price IS NOT NULL
AND s.custom_price > 0
-- Only update students that DON'T have a pricing rule (already handled above)
AND NOT EXISTS (
    SELECT 1 FROM public.pricing_rules pr
    WHERE pr.company_id = s.company_id
    AND LOWER(TRIM(pr.school_level)) = LOWER(TRIM(s.neighborhood))
    AND pr.annual_amount IS NOT NULL
    AND pr.annual_amount > 0
);
