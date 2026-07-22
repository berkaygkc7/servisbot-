-- 1. Add is_superadmin and original_company_id to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS original_company_id UUID REFERENCES public.companies(id);

-- 2. RPC to get all companies (bypassing RLS)
CREATE OR REPLACE FUNCTION public.sa_get_all_companies()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_superadmin boolean;
    result json;
BEGIN
    SELECT is_superadmin INTO v_is_superadmin FROM public.users WHERE id = auth.uid();
    
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT COALESCE(json_agg(
        json_build_object(
            'id', c.id,
            'company_name', c.company_name,
            'city', c.city,
            'subscription_status', c.subscription_status,
            'subscription_tier', c.subscription_tier,
            'created_at', c.created_at,
            'owner_id', c.owner_id,
            'owner_email', (SELECT email FROM auth.users WHERE id = c.owner_id)
        ) ORDER BY c.created_at DESC
    ), '[]'::json) INTO result
    FROM public.companies c;

    RETURN result;
END;
$$;

-- 3. RPC to update company subscription
CREATE OR REPLACE FUNCTION public.sa_update_company_subscription(
    p_company_id UUID, 
    p_tier TEXT, 
    p_status TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_superadmin boolean;
BEGIN
    SELECT is_superadmin INTO v_is_superadmin FROM public.users WHERE id = auth.uid();
    
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    UPDATE public.companies 
    SET subscription_tier = p_tier, subscription_status = p_status
    WHERE id = p_company_id;

    RETURN json_build_object('success', true);
END;
$$;

-- 4. RPC to get platform stats
CREATE OR REPLACE FUNCTION public.sa_get_platform_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_superadmin boolean;
    v_total_companies INT;
    v_total_users INT;
    v_total_students INT;
    v_total_vehicles INT;
BEGIN
    SELECT is_superadmin INTO v_is_superadmin FROM public.users WHERE id = auth.uid();
    
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT count(*) INTO v_total_companies FROM public.companies;
    SELECT count(*) INTO v_total_users FROM public.users;
    SELECT count(*) INTO v_total_students FROM public.students;
    SELECT count(*) INTO v_total_vehicles FROM public.vehicles;

    RETURN json_build_object(
        'total_companies', v_total_companies,
        'total_users', v_total_users,
        'total_students', v_total_students,
        'total_vehicles', v_total_vehicles
    );
END;
$$;

-- 5. RPC to generate impersonation token / get auth token
CREATE OR REPLACE FUNCTION public.sa_impersonate_company(p_target_company_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_superadmin boolean;
    v_current_company_id UUID;
    v_original_company_id UUID;
BEGIN
    SELECT is_superadmin, company_id, original_company_id 
    INTO v_is_superadmin, v_current_company_id, v_original_company_id
    FROM public.users WHERE id = auth.uid();
    
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    -- If we haven't impersonated anyone yet, save the current company_id as original
    IF v_original_company_id IS NULL THEN
        UPDATE public.users SET original_company_id = v_current_company_id WHERE id = auth.uid();
    END IF;

    UPDATE public.users 
    SET company_id = p_target_company_id
    WHERE id = auth.uid();

    RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.sa_stop_impersonating()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_superadmin boolean;
    v_original_company_id UUID;
BEGIN
    SELECT is_superadmin, original_company_id 
    INTO v_is_superadmin, v_original_company_id
    FROM public.users WHERE id = auth.uid();
    
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    IF v_original_company_id IS NOT NULL THEN
        UPDATE public.users 
        SET company_id = v_original_company_id, original_company_id = NULL
        WHERE id = auth.uid();
    END IF;

    RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sa_get_all_companies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_update_company_subscription(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_impersonate_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_stop_impersonating() TO authenticated;

-- 6. RPC to get all users for Super Admin
CREATE OR REPLACE FUNCTION public.sa_get_all_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_superadmin boolean;
    result json;
BEGIN
    SELECT is_superadmin INTO v_is_superadmin FROM public.users WHERE id = auth.uid();
    
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT COALESCE(json_agg(
        json_build_object(
            'id', u.id,
            'full_name', u.full_name,
            'role', u.role,
            'is_superadmin', u.is_superadmin,
            'company_name', (SELECT company_name FROM public.companies WHERE id = u.company_id),
            'email', (SELECT email FROM auth.users WHERE id = u.id)
        ) ORDER BY u.created_at DESC
    ), '[]'::json) INTO result
    FROM public.users u;

    RETURN result;
END;
$$;

-- 7. RPC to toggle admin status
CREATE OR REPLACE FUNCTION public.sa_toggle_admin(p_user_id UUID, p_is_superadmin BOOLEAN)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_superadmin boolean;
BEGIN
    SELECT is_superadmin INTO v_is_superadmin FROM public.users WHERE id = auth.uid();
    
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Kendisini de-admin yapmasını engelleyelim (yanlışlıkla kilitlenmemek için)
    IF p_user_id = auth.uid() AND p_is_superadmin = FALSE THEN
        RAISE EXCEPTION 'Kendi adminliğinizi kaldıramazsınız.';
    END IF;

    UPDATE public.users 
    SET is_superadmin = p_is_superadmin
    WHERE id = p_user_id;

    RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sa_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_toggle_admin(UUID, BOOLEAN) TO authenticated;

-- =======================================================
-- v2: ADVANCED STATS, PLATFORM CONFIGS AND TENANT DETAIL
-- =======================================================

-- 1. Create platform settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CONSTRAINT single_row CHECK (id),
    premium_price NUMERIC(12,2) DEFAULT 750.00,
    support_email TEXT DEFAULT 'destek@servisbot.com',
    is_maintenance_mode BOOLEAN DEFAULT FALSE,
    free_tier_max_users INTEGER DEFAULT 5,
    free_tier_max_vehicles INTEGER DEFAULT 3,
    free_tier_max_students INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Insert initial settings if not exists
INSERT INTO public.platform_settings (id, premium_price, support_email, is_maintenance_mode, free_tier_max_users, free_tier_max_vehicles, free_tier_max_students)
VALUES (TRUE, 750.00, 'destek@servisbot.com', FALSE, 5, 3, 50)
ON CONFLICT (id) DO NOTHING;

-- 2. RPC to get advanced platform stats
CREATE OR REPLACE FUNCTION public.sa_get_advanced_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_superadmin boolean;
    v_total_companies INT;
    v_total_users INT;
    v_total_students INT;
    v_total_vehicles INT;
    v_total_drivers INT;
    v_total_routes INT;
    v_total_schools INT;
    v_premium_companies INT;
    v_free_companies INT;
    v_mrr NUMERIC;
    v_total_payments NUMERIC;
    v_total_expenses NUMERIC;
    v_company_growth json;
    v_payment_growth json;
BEGIN
    SELECT is_superadmin INTO v_is_superadmin FROM public.users WHERE id = auth.uid();
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Counts
    SELECT count(*) INTO v_total_companies FROM public.companies;
    SELECT count(*) INTO v_total_users FROM public.users;
    SELECT count(*) INTO v_total_students FROM public.students;
    SELECT count(*) INTO v_total_vehicles FROM public.vehicles;
    SELECT count(*) INTO v_total_drivers FROM public.drivers;
    SELECT count(*) INTO v_total_routes FROM public.routes;
    SELECT count(*) INTO v_total_schools FROM public.schools;
    
    SELECT count(*) INTO v_premium_companies FROM public.companies WHERE subscription_tier = 'premium';
    SELECT count(*) INTO v_free_companies FROM public.companies WHERE subscription_tier = 'free' OR subscription_tier IS NULL;

    -- Financials
    SELECT COALESCE(SUM(amount), 0) INTO v_total_payments FROM public.payments WHERE status IN ('Ödendi', 'Paid');
    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses FROM public.expenses WHERE status IN ('Ödendi', 'Paid', 'paid');
    
    SELECT COALESCE(v_premium_companies * s.premium_price, 0) INTO v_mrr 
    FROM public.platform_settings s LIMIT 1;

    -- Company Growth (Last 6 months)
    SELECT COALESCE(json_agg(row_to_json(cg)), '[]'::json) INTO v_company_growth
    FROM (
        SELECT 
            to_char(created_at, 'YYYY-MM') as month,
            count(*) as count
        FROM public.companies
        GROUP BY 1
        ORDER BY 1 ASC
        LIMIT 6
    ) cg;

    -- Payment Growth (Last 6 months)
    SELECT COALESCE(json_agg(row_to_json(pg)), '[]'::json) INTO v_payment_growth
    FROM (
        SELECT 
            to_char(created_at, 'YYYY-MM') as month,
            sum(amount) as amount
        FROM public.payments
        WHERE status IN ('Ödendi', 'Paid')
        GROUP BY 1
        ORDER BY 1 ASC
        LIMIT 6
    ) pg;

    RETURN json_build_object(
        'total_companies', v_total_companies,
        'total_users', v_total_users,
        'total_students', v_total_students,
        'total_vehicles', v_total_vehicles,
        'total_drivers', v_total_drivers,
        'total_routes', v_total_routes,
        'total_schools', v_total_schools,
        'premium_companies', v_premium_companies,
        'free_companies', v_free_companies,
        'mrr', v_mrr,
        'total_payments', v_total_payments,
        'total_expenses', v_total_expenses,
        'company_growth', v_company_growth,
        'payment_growth', v_payment_growth
    );
END;
$$;

-- 3. RPC to get specific company details
CREATE OR REPLACE FUNCTION public.sa_get_company_details(p_company_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_superadmin boolean;
    v_users_count INT;
    v_drivers_count INT;
    v_vehicles_count INT;
    v_students_count INT;
    v_schools_count INT;
    v_routes_count INT;
    v_payments_total NUMERIC;
    v_expenses_total NUMERIC;
    result json;
BEGIN
    SELECT is_superadmin INTO v_is_superadmin FROM public.users WHERE id = auth.uid();
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT count(*) INTO v_users_count FROM public.users WHERE company_id = p_company_id;
    SELECT count(*) INTO v_drivers_count FROM public.drivers WHERE company_id = p_company_id;
    SELECT count(*) INTO v_vehicles_count FROM public.vehicles WHERE company_id = p_company_id;
    SELECT count(*) INTO v_students_count FROM public.students WHERE company_id = p_company_id;
    SELECT count(*) INTO v_schools_count FROM public.schools WHERE company_id = p_company_id;
    SELECT count(*) INTO v_routes_count FROM public.routes WHERE company_id = p_company_id;
    
    SELECT COALESCE(sum(amount), 0) INTO v_payments_total FROM public.payments WHERE company_id = p_company_id AND status IN ('Ödendi', 'Paid');
    SELECT COALESCE(sum(amount), 0) INTO v_expenses_total FROM public.expenses WHERE company_id = p_company_id AND status IN ('Ödendi', 'Paid', 'paid');

    SELECT json_build_object(
        'users_count', v_users_count,
        'drivers_count', v_drivers_count,
        'vehicles_count', v_vehicles_count,
        'students_count', v_students_count,
        'schools_count', v_schools_count,
        'routes_count', v_routes_count,
        'payments_total', v_payments_total,
        'expenses_total', v_expenses_total
    ) INTO result;

    RETURN result;
END;
$$;

-- 4. RPC to get global settings
CREATE OR REPLACE FUNCTION public.sa_get_platform_settings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_superadmin boolean;
    result json;
BEGIN
    SELECT is_superadmin INTO v_is_superadmin FROM public.users WHERE id = auth.uid();
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT row_to_json(s) INTO result
    FROM public.platform_settings s
    LIMIT 1;

    RETURN result;
END;
$$;

-- 5. RPC to update global settings
CREATE OR REPLACE FUNCTION public.sa_update_platform_settings(
    p_premium_price NUMERIC,
    p_support_email TEXT,
    p_is_maintenance_mode BOOLEAN,
    p_free_tier_max_users INTEGER,
    p_free_tier_max_vehicles INTEGER,
    p_free_tier_max_students INTEGER
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_superadmin boolean;
BEGIN
    SELECT is_superadmin INTO v_is_superadmin FROM public.users WHERE id = auth.uid();
    IF NOT v_is_superadmin THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    UPDATE public.platform_settings
    SET premium_price = p_premium_price,
        support_email = p_support_email,
        is_maintenance_mode = p_is_maintenance_mode,
        free_tier_max_users = p_free_tier_max_users,
        free_tier_max_vehicles = p_free_tier_max_vehicles,
        free_tier_max_students = p_free_tier_max_students,
        updated_at = timezone('utc'::text, now())
    WHERE id = TRUE;

    RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sa_get_advanced_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_get_company_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_get_platform_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sa_update_platform_settings(NUMERIC, TEXT, BOOLEAN, INTEGER, INTEGER, INTEGER) TO authenticated;


