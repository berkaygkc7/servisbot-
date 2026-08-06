-- Migration to add school_id to pricing_rules table for school-specific neighborhood pricing

ALTER TABLE public.pricing_rules ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pricing_rules_school_id ON public.pricing_rules(school_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_company_school ON public.pricing_rules(company_id, school_id);

-- Update get_company_info_by_token to return pricing_rules with school_id
CREATE OR REPLACE FUNCTION public.get_company_info_by_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_company_name TEXT;
    v_schools JSON;
    v_pricing_rules JSON;
BEGIN
    -- Find company by token
    SELECT id, company_name INTO v_company_id, v_company_name
    FROM public.companies
    WHERE public_registration_token = p_token
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid token');
    END IF;

    -- Get schools for this company
    SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name)), '[]'::json) INTO v_schools
    FROM public.schools
    WHERE company_id = v_company_id;

    -- Get all pricing rules (both general and school-specific)
    SELECT COALESCE(json_agg(json_build_object(
        'id', id,
        'school_id', school_id,
        'name', school_level,
        'amount', amount
    )), '[]'::json) INTO v_pricing_rules
    FROM public.pricing_rules
    WHERE company_id = v_company_id;

    RETURN json_build_object(
        'success', true,
        'company_id', v_company_id,
        'company_name', v_company_name,
        'schools', v_schools,
        'pricing_rules', v_pricing_rules,
        'neighborhoods', v_pricing_rules
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_info_by_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_company_info_by_token(UUID) TO authenticated;
