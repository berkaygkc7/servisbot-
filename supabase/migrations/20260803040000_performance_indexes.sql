-- Optimize database performance with indexes for high-volume multitenant usage

-- 1. Students Table Indexes
CREATE INDEX IF NOT EXISTS idx_students_company_id ON public.students(company_id);
CREATE INDEX IF NOT EXISTS idx_students_full_name ON public.students USING btree (full_name);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

-- 2. Payments Table Indexes
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_month ON public.payments(month);

-- 3. Routes Table Indexes
CREATE INDEX IF NOT EXISTS idx_routes_company_id ON public.routes(company_id);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON public.routes(vehicle_id);

-- 4. Vehicles Table Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON public.vehicles(company_id);

-- 5. Schools Table Indexes
CREATE INDEX IF NOT EXISTS idx_schools_company_id ON public.schools(company_id);

-- 6. Incomes Table Indexes
CREATE INDEX IF NOT EXISTS idx_incomes_company_id ON public.incomes(company_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON public.incomes(income_date);

-- 7. Expenses Table Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
