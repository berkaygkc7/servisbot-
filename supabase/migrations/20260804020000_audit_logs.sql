-- Migration to add Audit Logging (activity_logs)

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON public.activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow Super Admins to read all logs, and Company Owners to read their own company's logs
CREATE POLICY "Read access for activity_logs" ON public.activity_logs 
FOR SELECT USING (
    company_id = public.get_auth_company_id()
    OR 
    auth.jwt() ->> 'email' = 'patron123@servisbot.com' -- Fallback super admin check
);

-- Trigger Function for Logging
CREATE OR REPLACE FUNCTION public.log_table_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $\$
DECLARE
    v_user_id UUID := auth.uid();
    v_ip TEXT;
    v_company_id UUID;
    v_record_id TEXT;
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
BEGIN
    -- Extract IP Address safely
    BEGIN
        v_ip := current_setting('request.headers', true)::json->>'x-forwarded-for';
        IF v_ip IS NOT NULL THEN
            v_ip := split_part(v_ip, ',', 1);
            v_ip := trim(v_ip);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip := 'unknown';
    END;

    IF TG_OP = 'INSERT' THEN
        v_new_data := to_jsonb(NEW);
        v_company_id := NEW.company_id;
        v_record_id := NEW.id::TEXT;
    ELSIF TG_OP = 'UPDATE' THEN
        v_new_data := to_jsonb(NEW);
        v_old_data := to_jsonb(OLD);
        v_company_id := NEW.company_id;
        v_record_id := NEW.id::TEXT;
    ELSIF TG_OP = 'DELETE' THEN
        v_old_data := to_jsonb(OLD);
        v_company_id := OLD.company_id;
        v_record_id := OLD.id::TEXT;
    END IF;

    -- Only log if it's a known company context to avoid orphaned logs
    IF v_company_id IS NOT NULL THEN
        INSERT INTO public.activity_logs (
            company_id, user_id, action_type, table_name, record_id, old_data, new_data, ip_address
        ) VALUES (
            v_company_id, v_user_id, TG_OP, TG_TABLE_NAME, v_record_id, v_old_data, v_new_data, v_ip
        );
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$\$;

-- Drop existing triggers to avoid duplicates if re-running
DROP TRIGGER IF EXISTS audit_students ON public.students;
DROP TRIGGER IF EXISTS audit_payments ON public.payments;
DROP TRIGGER IF EXISTS audit_vehicles ON public.vehicles;
DROP TRIGGER IF EXISTS audit_schools ON public.schools;
DROP TRIGGER IF EXISTS audit_routes ON public.routes;
DROP TRIGGER IF EXISTS audit_incomes ON public.incomes;
DROP TRIGGER IF EXISTS audit_expenses ON public.expenses;

-- Attach Triggers to critical tables
CREATE TRIGGER audit_students AFTER INSERT OR UPDATE OR DELETE ON public.students FOR EACH ROW EXECUTE FUNCTION public.log_table_activity();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_table_activity();
CREATE TRIGGER audit_vehicles AFTER INSERT OR UPDATE OR DELETE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.log_table_activity();
CREATE TRIGGER audit_schools AFTER INSERT OR UPDATE OR DELETE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.log_table_activity();
CREATE TRIGGER audit_routes AFTER INSERT OR UPDATE OR DELETE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.log_table_activity();
CREATE TRIGGER audit_incomes AFTER INSERT OR UPDATE OR DELETE ON public.incomes FOR EACH ROW EXECUTE FUNCTION public.log_table_activity();
CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.log_table_activity();

-- RPC for logging manual actions (like LOGIN)
CREATE OR REPLACE FUNCTION public.log_user_login(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $\$
DECLARE
    v_user_id UUID := auth.uid();
    v_ip TEXT;
BEGIN
    IF v_user_id IS NULL OR p_company_id IS NULL THEN RETURN; END IF;

    BEGIN
        v_ip := current_setting('request.headers', true)::json->>'x-forwarded-for';
        IF v_ip IS NOT NULL THEN
            v_ip := split_part(v_ip, ',', 1);
            v_ip := trim(v_ip);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip := 'unknown';
    END;

    INSERT INTO public.activity_logs (
        company_id, user_id, action_type, table_name, record_id, old_data, new_data, ip_address
    ) VALUES (
        p_company_id, v_user_id, 'LOGIN', 'auth', v_user_id::TEXT, NULL, NULL, v_ip
    );
END;
$\$;
