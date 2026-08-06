-- Disable IP Rate Limiting in submit_student_application RPC to allow unlimited testing

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
    p_total_debt NUMERIC DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_student_id UUID;
BEGIN
    -- 1. Validate Token
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE public_registration_token = p_public_token
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'INVALID_TOKEN', 'message', 'Geçersiz veya süresi dolmuş başvuru bağlantısı.');
    END IF;

    -- 2. Insert Student
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
        total_debt
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
        p_total_debt
    ) RETURNING id INTO v_student_id;

    RETURN json_build_object(
        'success', true,
        'student_id', v_student_id,
        'message', 'Application submitted successfully'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_student_application(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_student_application(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;
