-- Function for Parent to safely update their child's absent dates (bypasses RLS)
CREATE OR REPLACE FUNCTION public.update_student_absent_dates(p_student_id UUID, p_absent_dates date[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.students
    SET absent_dates = p_absent_dates
    WHERE id = p_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_student_absent_dates(UUID, date[]) TO anon, authenticated;
