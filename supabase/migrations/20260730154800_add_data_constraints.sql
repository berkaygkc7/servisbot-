
-- 1. Students Table Constraints
ALTER TABLE public.students ADD CONSTRAINT students_full_name_len CHECK (char_length(full_name) <= 150);
ALTER TABLE public.students ADD CONSTRAINT students_parent_name_len CHECK (parent_name IS NULL OR char_length(parent_name) <= 150);
ALTER TABLE public.students ADD CONSTRAINT students_parent_phone_len CHECK (parent_phone IS NULL OR char_length(parent_phone) <= 50);
ALTER TABLE public.students ADD CONSTRAINT students_address_len CHECK (address IS NULL OR char_length(address) <= 1000);
ALTER TABLE public.students ADD CONSTRAINT students_school_level_len CHECK (school_level IS NULL OR char_length(school_level) <= 50);
ALTER TABLE public.students ADD CONSTRAINT students_grade_len CHECK (grade IS NULL OR char_length(grade) <= 50);

-- 2. Companies Table Constraints
ALTER TABLE public.companies ADD CONSTRAINT companies_company_name_len CHECK (char_length(company_name) <= 255);

-- 3. Users Table Constraints
ALTER TABLE public.users ADD CONSTRAINT users_full_name_len CHECK (char_length(full_name) <= 150);
ALTER TABLE public.users ADD CONSTRAINT users_role_len CHECK (char_length(role) <= 50);

-- 4. Schools Table Constraints
ALTER TABLE public.schools ADD CONSTRAINT schools_name_len CHECK (char_length(name) <= 255);

-- 5. Drivers Table Constraints
ALTER TABLE public.drivers ADD CONSTRAINT drivers_full_name_len CHECK (char_length(full_name) <= 150);
ALTER TABLE public.drivers ADD CONSTRAINT drivers_phone_len CHECK (phone IS NULL OR char_length(phone) <= 50);

-- 6. Vehicles Table Constraints
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_plate_number_len CHECK (char_length(plate_number) <= 50);
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_driver_name_len CHECK (driver_name IS NULL OR char_length(driver_name) <= 150);

-- 7. Route Stops Table Constraints
ALTER TABLE public.route_stops ADD CONSTRAINT route_stops_name_len CHECK (char_length(name) <= 255);
