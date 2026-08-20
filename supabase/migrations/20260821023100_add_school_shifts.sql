-- 1. Add has_shifts to schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS has_shifts BOOLEAN DEFAULT FALSE;

-- 2. Add shift to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS shift TEXT;

-- 3. Update get_company_info_by_token to return has_shifts for schools
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
        'schools', v_schools,
        'pricing_rules', v_pricing_rules,
        'neighborhoods', v_pricing_rules
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_info_by_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_company_info_by_token(UUID) TO authenticated;

-- 4. Update submit_student_application to accept and save p_shift
CREATE OR REPLACE FUNCTION public.submit_student_application(
    p_public_token UUID,
    p_full_name TEXT,
    p_parent_name TEXT,
    p_parent_phone TEXT,
    p_address TEXT,
    p_lat NUMERIC DEFAULT NULL,
    p_lng NUMERIC DEFAULT NULL,
    p_school_id UUID DEFAULT NULL,
    p_school_level TEXT DEFAULT NULL,
    p_grade TEXT DEFAULT NULL,
    p_neighborhood TEXT DEFAULT NULL,
    p_parent_tc TEXT DEFAULT NULL,
    p_total_debt NUMERIC DEFAULT 0,
    p_custom_price NUMERIC DEFAULT 0,
    p_shift TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_student_id UUID;
    v_ip TEXT;
    v_attempt_count INT;
    v_last_attempt TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. Rate Limiting Check
    BEGIN
        v_ip := current_setting('request.headers', true)::json->>'x-forwarded-for';
        IF v_ip IS NOT NULL THEN
            v_ip := split_part(v_ip, ',', 1);
            v_ip := trim(v_ip);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip := 'unknown';
    END;

    IF v_ip IS NOT NULL AND v_ip != 'unknown' THEN
        SELECT attempt_count, last_attempt INTO v_attempt_count, v_last_attempt 
        FROM public.rate_limits 
        WHERE ip_address = v_ip AND action = 'submit_application';
        
        IF v_attempt_count IS NOT NULL THEN
            IF v_last_attempt <= NOW() - INTERVAL '1 day' THEN
                UPDATE public.rate_limits SET attempt_count = 1, last_attempt = NOW() WHERE ip_address = v_ip AND action = 'submit_application';
            ELSIF v_attempt_count >= 3 THEN
                RETURN json_build_object('success', false, 'error', 'TOO_MANY_REQUESTS', 'message', 'Güvenlik nedeniyle bu cihazdan yeni kayıt yapılamaz. Lütfen yarın tekrar deneyin veya okul ile iletişime geçin.');
            ELSE
                UPDATE public.rate_limits SET attempt_count = attempt_count + 1, last_attempt = NOW() WHERE ip_address = v_ip AND action = 'submit_application';
            END IF;
        ELSE
            INSERT INTO public.rate_limits (ip_address, action) VALUES (v_ip, 'submit_application');
        END IF;
    END IF;

    -- 2. Validate Token
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE public_registration_token = p_public_token
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'INVALID_TOKEN', 'message', 'Geçersiz veya süresi dolmuş başvuru bağlantısı.');
    END IF;

    -- 3. Insert Student (now includes custom_price and shift)
    INSERT INTO public.students (
        company_id,
        full_name,
        parent_name,
        parent_phone,
        parent_tc,
        address,
        home_latitude,
        home_longitude,
        school_id,
        school_level,
        grade,
        neighborhood,
        status,
        registration_date,
        total_debt,
        custom_price,
        shift
    ) VALUES (
        v_company_id,
        p_full_name,
        p_parent_name,
        p_parent_phone,
        p_parent_tc,
        p_address,
        p_lat,
        p_lng,
        p_school_id,
        p_school_level,
        p_grade,
        p_neighborhood,
        'pending',
        CURRENT_DATE,
        p_total_debt,
        CASE WHEN p_custom_price > 0 THEN p_custom_price ELSE NULL END,
        p_shift
    ) RETURNING id INTO v_student_id;

    RETURN json_build_object(
        'success', true,
        'student_id', v_student_id,
        'message', 'Application submitted successfully'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_student_application(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_student_application(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT) TO authenticated;
