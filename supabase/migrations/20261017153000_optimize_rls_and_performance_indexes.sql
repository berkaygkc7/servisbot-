-- ==============================================================================
-- Migration: 20261017153000_optimize_rls_and_performance_indexes.sql
-- Description:
--   1. Optimizes public.get_auth_company_id() with STABLE + SECURITY DEFINER + search_path.
--   2. Streamlines RLS policies on incomes, accounts, and attendance_records using get_auth_company_id().
--   3. Adds high-performance composite B-Tree indexes for fast multi-tenant filtering.
--   4. Adds spatial/coordinate indexes on vehicles and students for geofence queries.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Upgrade public.get_auth_company_id() Helper Function
-- ------------------------------------------------------------------------------
-- Making it STABLE allows PostgreSQL to cache the result for the entire query statement,
-- avoiding subquery evaluations per inspected row.
-- SECURITY DEFINER ensures reliable execution without recursive RLS checks on public.users.
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.users WHERE id = (SELECT auth.uid()) LIMIT 1;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_auth_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_company_id() TO anon;


-- ------------------------------------------------------------------------------
-- 2. Streamline RLS Policies on Incomes & Accounts
-- ------------------------------------------------------------------------------
-- Replace the unindexed subquery "IN (SELECT company_id FROM users WHERE id = auth.uid())"
-- with the optimized scalar "(SELECT public.get_auth_company_id())".

-- Incomes Table RLS
DROP POLICY IF EXISTS "Users can view incomes of their company" ON public.incomes;
DROP POLICY IF EXISTS "Users can insert incomes to their company" ON public.incomes;
DROP POLICY IF EXISTS "Users can update their company incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can delete their company incomes" ON public.incomes;
DROP POLICY IF EXISTS "Tenant isolation for incomes" ON public.incomes;

CREATE POLICY "Tenant isolation for incomes" ON public.incomes
  FOR ALL
  USING (company_id = (SELECT public.get_auth_company_id()))
  WITH CHECK (company_id = (SELECT public.get_auth_company_id()));

-- Accounts Table RLS (Cari Hesaplar)
DROP POLICY IF EXISTS "Users can view accounts of their company" ON public.accounts;
DROP POLICY IF EXISTS "Users can insert accounts to their company" ON public.accounts;
DROP POLICY IF EXISTS "Users can update their company accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete their company accounts" ON public.accounts;
DROP POLICY IF EXISTS "Tenant isolation for accounts" ON public.accounts;

CREATE POLICY "Tenant isolation for accounts" ON public.accounts
  FOR ALL
  USING (company_id = (SELECT public.get_auth_company_id()))
  WITH CHECK (company_id = (SELECT public.get_auth_company_id()));

-- Attendance Records Table RLS (Yoklama Kayıtları)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_records') THEN
    ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Tenant isolation for attendance_records" ON public.attendance_records;
    CREATE POLICY "Tenant isolation for attendance_records" ON public.attendance_records
      FOR ALL
      USING (company_id = (SELECT public.get_auth_company_id()))
      WITH CHECK (company_id = (SELECT public.get_auth_company_id()));
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 3. Composite & Partial High-Performance B-Tree Indexes
-- ------------------------------------------------------------------------------

-- Students Table (High-volume filtering by active status, archive, and assignments)
CREATE INDEX IF NOT EXISTS idx_students_company_status_archived 
  ON public.students(company_id, status, is_archived);

CREATE INDEX IF NOT EXISTS idx_students_company_school 
  ON public.students(company_id, school_id);

CREATE INDEX IF NOT EXISTS idx_students_company_vehicle 
  ON public.students(company_id, vehicle_id);

CREATE INDEX IF NOT EXISTS idx_students_parent_phone 
  ON public.students(parent_phone);

-- Payments Table (Chronological and per-student reporting)
CREATE INDEX IF NOT EXISTS idx_payments_company_date_desc 
  ON public.payments(company_id, payment_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_payments_company_student 
  ON public.payments(company_id, student_id);

-- Accounts Table (Cari Hesaplar)
CREATE INDEX IF NOT EXISTS idx_accounts_company_id 
  ON public.accounts(company_id);

-- Activity Logs (Audit logging ordered by newest first)
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_created_desc 
  ON public.activity_logs(company_id, created_at DESC);

-- Attendance Records (Attendance per day and student)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_records') THEN
    CREATE INDEX IF NOT EXISTS idx_attendance_company_date 
      ON public.attendance_records(company_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
      ON public.attendance_records(student_id, date);
  END IF;
END $$;

-- Route Stops (Sequential stop traversal)
CREATE INDEX IF NOT EXISTS idx_route_stops_route_order 
  ON public.route_stops(route_id, stop_order);

-- Vehicles (Status & Active flag)
CREATE INDEX IF NOT EXISTS idx_vehicles_company_active 
  ON public.vehicles(company_id, is_active);


-- ------------------------------------------------------------------------------
-- 4. Spatial / Coordinate B-Tree Indexes for Geofencing & Distance Queries
-- ------------------------------------------------------------------------------
-- Fast coordinate retrieval when calculating vehicle proximity to stops/students
CREATE INDEX IF NOT EXISTS idx_vehicles_coords 
  ON public.vehicles(current_latitude, current_longitude) 
  WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_students_home_coords 
  ON public.students(home_latitude, home_longitude) 
  WHERE home_latitude IS NOT NULL AND home_longitude IS NOT NULL;
