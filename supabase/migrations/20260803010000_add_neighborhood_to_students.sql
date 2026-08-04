-- 1. Add neighborhood column to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- 2. Update the submit_student_application RPC to accept and save neighborhood
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
    p_neighborhood TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_student_id UUID;
BEGIN
    -- Find company by token
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE public_registration_token = p_public_token
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid token');
    END IF;

    -- Insert student as pending
    INSERT INTO public.students (
        company_id,
        full_name,
        parent_name,
        parent_phone,
        address,
        home_latitude,
        home_longitude,
        school_id,
        school_level,
        grade,
        neighborhood,
        status,
        registration_date
    ) VALUES (
        v_company_id,
        p_full_name,
        p_parent_name,
        p_parent_phone,
        p_address,
        p_lat,
        p_lng,
        p_school_id,
        p_school_level,
        p_grade,
        p_neighborhood,
        'pending',
        CURRENT_DATE
    ) RETURNING id INTO v_student_id;

    RETURN json_build_object(
        'success', true,
        'student_id', v_student_id,
        'message', 'Application submitted successfully'
    );
END;
$$;
