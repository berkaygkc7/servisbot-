-- Migration: Add RPCs for remote parent contract signing via WhatsApp / SMS link
-- Description: Allows anonymous parents with a unique token to view and sign their student service contract

-- 1. RPC to get student contract details securely by token
CREATE OR REPLACE FUNCTION public.get_contract_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student RECORD;
    v_company RECORD;
    v_school RECORD;
BEGIN
    SELECT * INTO v_student
    FROM public.students
    WHERE login_token::text = p_token OR id::text = p_token
    LIMIT 1;

    IF v_student IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Sözleşme bulunamadı veya bağlantı süresi dolmuş.');
    END IF;

    SELECT * INTO v_company
    FROM public.companies
    WHERE id = v_student.company_id
    LIMIT 1;

    SELECT * INTO v_school
    FROM public.schools
    WHERE id = v_student.school_id
    LIMIT 1;

    RETURN json_build_object(
        'success', true,
        'student', json_build_object(
            'id', v_student.id,
            'full_name', v_student.full_name,
            'parent_name', v_student.parent_name,
            'parent_phone', v_student.parent_phone,
            'parent_tc', v_student.parent_tc,
            'address', v_student.address,
            'grade', v_student.grade,
            'total_debt', v_student.total_debt,
            'custom_price', v_student.custom_price,
            'shift', v_student.shift,
            'parent_signature', v_student.parent_signature,
            'contract_signed_at', v_student.contract_signed_at,
            'school_name', COALESCE(v_school.name, ''),
            'company_name', COALESCE(v_company.company_name, ''),
            'company_logo', v_company.logo_url
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contract_by_token(TEXT) TO anon, authenticated;

-- 2. RPC to sign contract securely by token
CREATE OR REPLACE FUNCTION public.sign_contract_by_token(p_token TEXT, p_signature TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id UUID;
BEGIN
    IF p_signature IS NULL OR LENGTH(TRIM(p_signature)) < 30 THEN
        RETURN json_build_object('success', false, 'error', 'Lütfen geçerli bir imza atınız.');
    END IF;

    UPDATE public.students
    SET 
        parent_signature = p_signature,
        contract_signed_at = NOW()
    WHERE (login_token::text = p_token OR id::text = p_token)
    RETURNING id INTO v_student_id;

    IF v_student_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Öğrenci kaydı bulunamadı.');
    END IF;

    RETURN json_build_object(
        'success', true,
        'student_id', v_student_id,
        'message', 'Sözleşme başarıyla imzalandı.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sign_contract_by_token(TEXT, TEXT) TO anon, authenticated;
