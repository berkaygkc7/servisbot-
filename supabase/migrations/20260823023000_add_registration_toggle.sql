-- 1. Add registration_enabled and registration_disabled_message columns to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS registration_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS registration_disabled_message TEXT DEFAULT 'Kayıt formu şu an kapatılmıştır. Bilgi için firmamızla iletişime geçiniz.';

-- 2. Update get_company_info_by_token function to include registration toggle and disabled message
CREATE OR REPLACE FUNCTION public.get_company_info_by_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_company_name TEXT;
    v_registration_enabled BOOLEAN;
    v_registration_disabled_message TEXT;
    v_schools JSON;
    v_pricing_rules JSON;
BEGIN
    -- Find company by token
    SELECT id, company_name, COALESCE(registration_enabled, true), registration_disabled_message 
    INTO v_company_id, v_company_name, v_registration_enabled, v_registration_disabled_message
    FROM public.companies
    WHERE public_registration_token = p_token
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid token');
    END IF;

    -- Get schools for this company
    SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'has_shifts', has_shifts)), '[]'::json) INTO v_schools
    FROM public.schools
    WHERE company_id = v_company_id;

    -- Get all pricing rules (both general and school-specific) including annual_amount
    SELECT COALESCE(json_agg(json_build_object(
        'id', id,
        'school_id', school_id,
        'name', school_level,
        'amount', amount,
        'annual_amount', annual_amount
    )), '[]'::json) INTO v_pricing_rules
    FROM public.pricing_rules
    WHERE company_id = v_company_id;

    RETURN json_build_object(
        'success', true,
        'company_id', v_company_id,
        'company_name', v_company_name,
        'registration_enabled', v_registration_enabled,
        'registration_disabled_message', v_registration_disabled_message,
        'schools', v_schools,
        'pricing_rules', v_pricing_rules,
        'neighborhoods', v_pricing_rules
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_info_by_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_company_info_by_token(UUID) TO authenticated;
