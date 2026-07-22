-- ============================================================
-- Push Notifications: push_tokens table + notification RPCs
-- ============================================================

-- 1. Push Tokens Table
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by SECURITY DEFINER functions)
DROP POLICY IF EXISTS "push_tokens_service_access" ON public.push_tokens;
CREATE POLICY "push_tokens_service_access" ON public.push_tokens
    FOR ALL USING (true) WITH CHECK (true);

-- 2. RPC: Save/Upsert Push Token (called from parent app)
CREATE OR REPLACE FUNCTION public.save_push_token(
    p_student_id UUID,
    p_token TEXT,
    p_platform TEXT DEFAULT 'android'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id
    FROM public.students
    WHERE id = p_student_id;

    INSERT INTO public.push_tokens (company_id, student_id, token, platform)
    VALUES (v_company_id, p_student_id, p_token, p_platform)
    ON CONFLICT (student_id, token) DO NOTHING;
END;
$$;

-- 3. RPC: Notify Route Started (sends to all parents in route)
CREATE OR REPLACE FUNCTION public.notify_route_started(p_route_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tokens TEXT[];
    v_route_name TEXT;
BEGIN
    SELECT name INTO v_route_name FROM public.routes WHERE id = p_route_id;

    -- Collect push tokens for all students in this route
    SELECT array_agg(DISTINCT pt.token)
    INTO v_tokens
    FROM public.student_route_assignments sra
    JOIN public.push_tokens pt ON pt.student_id = sra.student_id
    WHERE sra.route_id = p_route_id;

    IF v_tokens IS NOT NULL AND array_length(v_tokens, 1) > 0 THEN
        PERFORM net.http_post(
            url := 'https://wlbpbmkfsqpxgwvzigaq.supabase.co/functions/v1/send-push',
            body := json_build_object(
                'tokens', v_tokens,
                'title', '🚌 Servis Yola Çıktı',
                'body', v_route_name || ' rotası başladı. Durakta hazır olun!'
            )::text,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    END IF;
END;
$$;

-- 4. RPC: Notify Student Boarded
CREATE OR REPLACE FUNCTION public.notify_student_boarded(p_student_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tokens TEXT[];
    v_student_name TEXT;
BEGIN
    SELECT full_name INTO v_student_name FROM public.students WHERE id = p_student_id;

    SELECT array_agg(DISTINCT token) INTO v_tokens
    FROM public.push_tokens
    WHERE student_id = p_student_id;

    IF v_tokens IS NOT NULL AND array_length(v_tokens, 1) > 0 THEN
        PERFORM net.http_post(
            url := 'https://wlbpbmkfsqpxgwvzigaq.supabase.co/functions/v1/send-push',
            body := json_build_object(
                'tokens', v_tokens,
                'title', '✅ Servise Bindi',
                'body', v_student_name || ' servise güvenle bindi.'
            )::text,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    END IF;
END;
$$;

-- 5. RPC: Notify Student Alighted
CREATE OR REPLACE FUNCTION public.notify_student_alighted(p_student_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tokens TEXT[];
    v_student_name TEXT;
BEGIN
    SELECT full_name INTO v_student_name FROM public.students WHERE id = p_student_id;

    SELECT array_agg(DISTINCT token) INTO v_tokens
    FROM public.push_tokens
    WHERE student_id = p_student_id;

    IF v_tokens IS NOT NULL AND array_length(v_tokens, 1) > 0 THEN
        PERFORM net.http_post(
            url := 'https://wlbpbmkfsqpxgwvzigaq.supabase.co/functions/v1/send-push',
            body := json_build_object(
                'tokens', v_tokens,
                'title', '🏠 İndi',
                'body', v_student_name || ' güvenle indi.'
            )::text,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    END IF;
END;
$$;

-- 6. Grants
GRANT EXECUTE ON FUNCTION public.save_push_token(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_route_started(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_student_boarded(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_student_alighted(UUID) TO anon, authenticated;

