-- 1. Add public_registration_token to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS public_registration_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- 2. Update existing companies to have a token if they don't already
UPDATE public.companies 
SET public_registration_token = gen_random_uuid() 
WHERE public_registration_token IS NULL;

-- 3. Create function to get company info by token (publicly accessible)
CREATE OR REPLACE FUNCTION public.get_company_info_by_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_company_name TEXT;
    v_schools JSON;
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

    RETURN json_build_object(
        'success', true,
        'company_id', v_company_id,
        'company_name', v_company_name,
        'schools', v_schools
    );
END;
$$;

-- 4. Create function to submit application (publicly accessible)
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

-- Grant permissions for public access
GRANT EXECUTE ON FUNCTION public.get_company_info_by_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_student_application(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_company_info_by_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_student_application(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, UUID, TEXT, TEXT) TO authenticated;
