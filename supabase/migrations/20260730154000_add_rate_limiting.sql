CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_action_time ON public.rate_limits(ip_address, action, created_at);

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_ip TEXT, p_action TEXT, p_max_requests INT, p_window_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    DELETE FROM public.rate_limits WHERE created_at < now() - (p_window_seconds || ' seconds')::interval;

    SELECT COUNT(*) INTO v_count
    FROM public.rate_limits
    WHERE ip_address = p_ip AND action = p_action AND created_at >= now() - (p_window_seconds || ' seconds')::interval;

    IF v_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.rate_limits (ip_address, action) VALUES (p_ip, p_action);
    RETURN TRUE;
END;
$$;

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
    p_grade TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_student_id UUID;
    v_headers JSON;
    v_ip TEXT;
BEGIN
    BEGIN
        v_headers := current_setting('request.headers', true)::json;
        v_ip := v_headers->>'x-forwarded-for';
        IF v_ip IS NULL THEN
            v_ip := 'unknown';
        ELSE
            v_ip := split_part(v_ip, ',', 1);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip := 'unknown';
    END;

    IF v_ip != 'unknown' THEN
        IF NOT public.check_rate_limit(v_ip, 'submit_application', 3, 300) THEN
            RETURN json_build_object('success', false, 'error', 'Çok fazla istek gönderdiniz. Lütfen 5 dakika sonra tekrar deneyin.');
        END IF;
    END IF;

    SELECT id INTO v_company_id
    FROM public.companies
    WHERE public_registration_token = p_public_token
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid token');
    END IF;

    INSERT INTO public.students (
        company_id,
        full_name,
        parent_name,
        parent_phone,
        address,
        school_id,
        school_level,
        grade,
        status,
        home_latitude,
        home_longitude
    ) VALUES (
        v_company_id,
        p_full_name,
        p_parent_name,
        p_parent_phone,
        p_address,
        p_school_id,
        p_school_level,
        p_grade,
        'pending',
        p_lat,
        p_lng
    ) RETURNING id INTO v_student_id;

    RETURN json_build_object(
        'success', true,
        'student_id', v_student_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
