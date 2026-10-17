-- ==============================================================================
-- Migration: 20261017174500_enhance_push_tokens_for_web.sql
-- Description:
--   1. Enhances push_tokens table to support Web Push subscriptions (W3C Push API).
--   2. Adds user_id and subscription_payload columns.
--   3. Adds save_web_push_subscription RPC for seamless PWA & Web subscription.
-- ==============================================================================

-- 1. Modify push_tokens table columns
ALTER TABLE public.push_tokens ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.push_tokens ADD COLUMN IF NOT EXISTS subscription_payload JSONB;
ALTER TABLE public.push_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Make student_id nullable if it was NOT NULL
ALTER TABLE public.push_tokens ALTER COLUMN student_id DROP NOT NULL;

-- Ensure unique constraint on token itself to prevent duplicate endpoint rows
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'push_tokens_token_unique'
    ) THEN
        -- Drop old student_id, token unique if exists
        ALTER TABLE public.push_tokens DROP CONSTRAINT IF EXISTS push_tokens_student_id_token_key;
        ALTER TABLE public.push_tokens ADD CONSTRAINT push_tokens_token_unique UNIQUE (token);
    END IF;
END $$;

-- Index for fast user/company lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_company_id ON public.push_tokens(company_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON public.push_tokens(platform);

-- 2. RPC to upsert web push subscriptions
CREATE OR REPLACE FUNCTION public.save_web_push_subscription(
    p_token TEXT,
    p_platform TEXT DEFAULT 'web',
    p_company_id UUID DEFAULT NULL,
    p_student_id UUID DEFAULT NULL,
    p_subscription JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_company_id UUID := p_company_id;
BEGIN
    IF v_company_id IS NULL AND v_user_id IS NOT NULL THEN
        SELECT company_id INTO v_company_id FROM public.users WHERE id = v_user_id;
    END IF;

    INSERT INTO public.push_tokens (
        company_id,
        user_id,
        student_id,
        token,
        platform,
        subscription_payload,
        updated_at
    ) VALUES (
        v_company_id,
        v_user_id,
        p_student_id,
        p_token,
        p_platform,
        p_subscription,
        NOW()
    )
    ON CONFLICT (token) DO UPDATE
    SET 
        company_id = COALESCE(EXCLUDED.company_id, public.push_tokens.company_id),
        user_id = COALESCE(EXCLUDED.user_id, public.push_tokens.user_id),
        student_id = COALESCE(EXCLUDED.student_id, public.push_tokens.student_id),
        subscription_payload = COALESCE(EXCLUDED.subscription_payload, public.push_tokens.subscription_payload),
        updated_at = NOW();

    RETURN json_build_object('success', true);
END;
$$;

-- Grant permissions to authenticated and anon (for parents without account)
GRANT EXECUTE ON FUNCTION public.save_web_push_subscription(TEXT, TEXT, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_web_push_subscription(TEXT, TEXT, UUID, UUID, JSONB) TO anon;
