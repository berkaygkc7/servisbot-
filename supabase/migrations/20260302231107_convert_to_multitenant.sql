-- 1. Create Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    subscription_status TEXT DEFAULT 'active',
    subscription_tier TEXT DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Users (Profiles) Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'admin', -- 'owner', 'admin', 'dispatcher'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Add company_id to all operational tables
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.vehicle_maintenance ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
-- Note: route_stops and student_route_assignments inherit their access strictly heavily through relationships, 
-- but adding company_id makes RLS much simpler and performant.
ALTER TABLE public.route_stops ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.student_route_assignments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 4. Create RLS Helper Function (Performance Optimization)
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 5. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_route_assignments ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies
-- Companies Table: Users can only see and update their own company
CREATE POLICY "Users can view their own company" ON public.companies FOR SELECT USING (id = public.get_auth_company_id());
CREATE POLICY "Users can update their own company" ON public.companies FOR UPDATE USING (id = public.get_auth_company_id());

-- Users Table: Users can see all users in their company
CREATE POLICY "Users can view co-workers" ON public.users FOR SELECT USING (company_id = public.get_auth_company_id());
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (id = auth.uid());

-- Operational Tables: Users can fully manage records belonging to their company_id
DO $$ 
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT unnest(ARRAY['schools', 'drivers', 'vehicles', 'tags', 'students', 'vehicle_maintenance', 'payments', 'routes', 'route_stops', 'student_route_assignments'])
    LOOP
        EXECUTE format('CREATE POLICY "Tenant isolation for %I" ON public.%I FOR ALL USING (company_id = public.get_auth_company_id()) WITH CHECK (company_id = public.get_auth_company_id());', t_name, t_name);
    END LOOP;
END $$;
