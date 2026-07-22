-- ========================================================
-- ServisBot Demo / Test Verisi Yükleme Betiği
-- ========================================================

DO $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_school1_id UUID;
    v_school2_id UUID;
    v_school3_id UUID;
    v_driver1_id UUID;
    v_driver2_id UUID;
    v_driver3_id UUID;
    v_vehicle1_id UUID;
    v_vehicle2_id UUID;
    v_vehicle3_id UUID;
    v_route1_id UUID;
    v_route2_id UUID;
    v_route3_id UUID;
    v_stop1_1 UUID;
    v_stop1_2 UUID;
    v_stop1_3 UUID;
    v_stop2_1 UUID;
    v_stop2_2 UUID;
    v_stop2_3 UUID;
    v_stop3_1 UUID;
    v_stop3_2 UUID;
    v_stop3_3 UUID;
    v_student1_id UUID;
    v_student2_id UUID;
    v_student3_id UUID;
    v_student4_id UUID;
    v_student5_id UUID;
    v_student6_id UUID;
    v_student7_id UUID;
    v_student8_id UUID;
    v_student9_id UUID;
    v_student10_id UUID;
    v_date DATE;
BEGIN
    -- 1. EĞER HİÇ KULLANICI YOKSA DEMO KULLANICI OLUŞTUR
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    IF v_user_id IS NULL THEN
        v_user_id := '00000000-0000-0000-0000-000000000001';
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, is_super_admin, role, created_at, updated_at
        )
        VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'demo@servisbot.com',
            -- 'DemoPassword123!' şifresinin bcrypt hash hali:
            '$2a$10$TqyY8.fP3zR6bV1L/pQkpe2k8d1/Fz/U8vX4.rS3D4N/m2m5H8.7G',
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Demo Yönetici"}',
            false,
            'authenticated',
            now(),
            now()
        );
    END IF;

    -- 2. ŞİRKETİ BUL VEYA OLUŞTUR
    SELECT id INTO v_company_id FROM public.companies LIMIT 1;
    
    IF v_company_id IS NULL THEN
        INSERT INTO public.companies (company_name, city, subscription_tier, owner_id)
        VALUES ('ServisBot Örnek Şirketi', 'Tokat', 'premium', v_user_id)
        RETURNING id INTO v_company_id;
        
        INSERT INTO public.users (id, company_id, full_name, role)
        VALUES (v_user_id, v_company_id, 'Demo Yönetici', 'owner')
        ON CONFLICT (id) DO UPDATE SET company_id = v_company_id, role = 'owner';
    END IF;

    -- 3. ESKİ TEST VERİLERİNİ TEMİZLE (Çakışmaları önlemek için)
    DELETE FROM public.student_route_assignments WHERE company_id = v_company_id;
    DELETE FROM public.route_stops WHERE company_id = v_company_id;
    DELETE FROM public.route_attendances WHERE company_id = v_company_id;
    DELETE FROM public.timesheet_adjustments WHERE company_id = v_company_id;
    DELETE FROM public.payments WHERE company_id = v_company_id;
    DELETE FROM public.expenses WHERE company_id = v_company_id;
    DELETE FROM public.students WHERE company_id = v_company_id;
    DELETE FROM public.routes WHERE company_id = v_company_id;
    DELETE FROM public.vehicles WHERE company_id = v_company_id;
    DELETE FROM public.drivers WHERE company_id = v_company_id;
    DELETE FROM public.schools WHERE company_id = v_company_id;
    DELETE FROM public.pricing_rules WHERE company_id = v_company_id;

    -- 4. FİYAT KURALLARINI EKLE (pricing_rules)
    INSERT INTO public.pricing_rules (company_id, school_level, amount) VALUES
    (v_company_id, 'primary', 1500.00),
    (v_company_id, 'middle', 1800.00),
    (v_company_id, 'high', 2200.00)
    ON CONFLICT (company_id, school_level) DO NOTHING;

    -- 5. OKULLARI EKLE (schools)
    INSERT INTO public.schools (company_id, name, district, latitude, longitude)
    VALUES (v_company_id, 'Tokat Atatürk İlkokulu', 'Merkez', 40.3120, 36.5450) RETURNING id INTO v_school1_id;
    
    INSERT INTO public.schools (company_id, name, district, latitude, longitude)
    VALUES (v_company_id, 'Tokat Cumhuriyet Ortaokulu', 'Merkez', 40.3220, 36.5610) RETURNING id INTO v_school2_id;
    
    INSERT INTO public.schools (company_id, name, district, latitude, longitude)
    VALUES (v_company_id, 'Tokat Milli Piyango Anadolu Lisesi', 'Merkez', 40.3180, 36.5520) RETURNING id INTO v_school3_id;

    -- 6. ŞOFÖRLERİ EKLE (drivers)
    INSERT INTO public.drivers (company_id, full_name, phone, status, blood_group)
    VALUES (v_company_id, 'Ahmet Yılmaz', '0532 111 2233', 'active', 'A Rh+') RETURNING id INTO v_driver1_id;
    
    INSERT INTO public.drivers (company_id, full_name, phone, status, blood_group)
    VALUES (v_company_id, 'Mehmet Demir', '0544 222 3344', 'active', 'B Rh+') RETURNING id INTO v_driver2_id;
    
    INSERT INTO public.drivers (company_id, full_name, phone, status, blood_group)
    VALUES (v_company_id, 'Mustafa Kaya', '0505 333 4455', 'active', '0 Rh-') RETURNING id INTO v_driver3_id;

    -- 7. ARAÇLARI EKLE (vehicles)
    INSERT INTO public.vehicles (company_id, plate_number, driver_id, driver_name, driver_phone, capacity, current_latitude, current_longitude, status)
    VALUES (v_company_id, '60 AA 101', v_driver1_id, 'Ahmet Yılmaz', '0532 111 2233', 16, 40.3130, 36.5470, 'active') RETURNING id INTO v_vehicle1_id;
    
    INSERT INTO public.vehicles (company_id, plate_number, driver_id, driver_name, driver_phone, capacity, current_latitude, current_longitude, status)
    VALUES (v_company_id, '60 BB 202', v_driver2_id, 'Mehmet Demir', '0544 222 3344', 19, 40.3210, 36.5590, 'active') RETURNING id INTO v_vehicle2_id;
    
    INSERT INTO public.vehicles (company_id, plate_number, driver_id, driver_name, driver_phone, capacity, current_latitude, current_longitude, status)
    VALUES (v_company_id, '60 CC 303', v_driver3_id, 'Mustafa Kaya', '0505 333 4455', 16, 40.3170, 36.5500, 'active') RETURNING id INTO v_vehicle3_id;

    -- 8. ROTALARI EKLE (routes)
    INSERT INTO public.routes (company_id, name, school_id, vehicle_id, status, creation_method, distance_km, duration_min, geometry, time, price)
    VALUES (v_company_id, 'Atatürk İlkokulu - Merkez Rota', v_school1_id, v_vehicle1_id, 'active', 'auto', 5.2, 15, '{"type": "LineString", "coordinates": [[36.5410, 40.3100], [36.5430, 40.3110], [36.5450, 40.3120]]}', '08:00', 80.00) RETURNING id INTO v_route1_id;
    
    INSERT INTO public.routes (company_id, name, school_id, vehicle_id, status, creation_method, distance_km, duration_min, geometry, time, price)
    VALUES (v_company_id, 'Cumhuriyet Ortaokulu Rota', v_school2_id, v_vehicle2_id, 'active', 'auto', 7.4, 20, '{"type": "LineString", "coordinates": [[36.5550, 40.3190], [36.5580, 40.3200], [36.5610, 40.3220]]}', '08:15', 90.00) RETURNING id INTO v_route2_id;
    
    INSERT INTO public.routes (company_id, name, school_id, vehicle_id, status, creation_method, distance_km, duration_min, geometry, time, price)
    VALUES (v_company_id, 'Anadolu Lisesi Rota', v_school3_id, v_vehicle3_id, 'active', 'auto', 4.8, 12, '{"type": "LineString", "coordinates": [[36.5480, 40.3150], [36.5500, 40.3160], [36.5520, 40.3180]]}', '07:45', 100.00) RETURNING id INTO v_route3_id;

    -- 9. GÜZERGAH DURAKLARINI EKLE (route_stops)
    INSERT INTO public.route_stops (company_id, route_id, order_index, name, latitude, longitude, estimated_time)
    VALUES (v_company_id, v_route1_id, 0, 'Karşıyaka Kavşağı', 40.3100, 36.5410, '07:45') RETURNING id INTO v_stop1_1;
    INSERT INTO public.route_stops (company_id, route_id, order_index, name, latitude, longitude, estimated_time)
    VALUES (v_company_id, v_route1_id, 1, 'Yeşilırmak Mah. Parkı', 40.3110, 36.5430, '07:52') RETURNING id INTO v_stop1_2;
    INSERT INTO public.route_stops (company_id, route_id, order_index, name, latitude, longitude, estimated_time)
    VALUES (v_company_id, v_route1_id, 2, 'Okul Varış', 40.3120, 36.5450, '08:00') RETURNING id INTO v_stop1_3;

    INSERT INTO public.route_stops (company_id, route_id, order_index, name, latitude, longitude, estimated_time)
    VALUES (v_company_id, v_route2_id, 0, 'Esentepe Meydanı', 40.3190, 36.5550, '07:55') RETURNING id INTO v_stop2_1;
    INSERT INTO public.route_stops (company_id, route_id, order_index, name, latitude, longitude, estimated_time)
    VALUES (v_company_id, v_route2_id, 1, 'Ali Paşa Mah. GOP Bulvarı', 40.3200, 36.5580, '08:05') RETURNING id INTO v_stop2_2;
    INSERT INTO public.route_stops (company_id, route_id, order_index, name, latitude, longitude, estimated_time)
    VALUES (v_company_id, v_route2_id, 2, 'Okul Varış', 40.3220, 36.5610, '08:15') RETURNING id INTO v_stop2_3;

    INSERT INTO public.route_stops (company_id, route_id, order_index, name, latitude, longitude, estimated_time)
    VALUES (v_company_id, v_route3_id, 0, 'Geyras Girişi', 40.3150, 36.5480, '07:30') RETURNING id INTO v_stop3_1;
    INSERT INTO public.route_stops (company_id, route_id, order_index, name, latitude, longitude, estimated_time)
    VALUES (v_company_id, v_route3_id, 1, '600 Evler Sitesi', 40.3160, 36.5500, '07:38') RETURNING id INTO v_stop3_2;
    INSERT INTO public.route_stops (company_id, route_id, order_index, name, latitude, longitude, estimated_time)
    VALUES (v_company_id, v_route3_id, 2, 'Okul Varış', 40.3180, 36.5520, '07:45') RETURNING id INTO v_stop3_3;

    -- 10. ÖĞRENCİLERİ EKLE (students)
    INSERT INTO public.students (company_id, full_name, school_id, vehicle_id, tags, grade, blood_group, allergies, registration_date, school_level, parent_name, parent_phone, address, home_latitude, home_longitude, status)
    VALUES (v_company_id, 'Can Yıldız', v_school1_id, v_vehicle1_id, '{"Öğleci"}', '3-B', 'A Rh+', 'Fındık alerjisi var', '2026-09-01', 'primary', 'Murat Yıldız', '0555 123 4567', 'Karşıyaka Mah. 12. Sokak No:4', 40.3100, 36.5410, 'active') RETURNING id INTO v_student1_id;
    
    INSERT INTO public.students (company_id, full_name, school_id, vehicle_id, tags, grade, blood_group, allergies, registration_date, school_level, parent_name, parent_phone, address, home_latitude, home_longitude, status)
    VALUES (v_company_id, 'Efe Polat', v_school1_id, v_vehicle1_id, '{}', '2-A', '0 Rh+', NULL, '2026-09-01', 'primary', 'Selin Polat', '0555 234 5678', 'Yeşilırmak Mah. Vali Zekai Gümüşdiş Cad. No:12', 40.3110, 36.5430, 'active') RETURNING id INTO v_student2_id;
    
    INSERT INTO public.students (company_id, full_name, school_id, vehicle_id, tags, grade, blood_group, allergies, registration_date, school_level, parent_name, parent_phone, address, home_latitude, home_longitude, status)
    VALUES (v_company_id, 'Zeynep Aksoy', v_school1_id, v_vehicle1_id, '{"Servis Lideri"}', '4-C', 'B Rh-', NULL, '2026-09-02', 'primary', 'Hakan Aksoy', '0555 345 6789', 'Karşıyaka Mah. Gül Sk. No:2', 40.3095, 36.5405, 'active') RETURNING id INTO v_student3_id;

    INSERT INTO public.students (company_id, full_name, school_id, vehicle_id, tags, grade, blood_group, allergies, registration_date, school_level, parent_name, parent_phone, address, home_latitude, home_longitude, status)
    VALUES (v_company_id, 'Mert Arslan', v_school2_id, v_vehicle2_id, '{}', '7-A', 'AB Rh+', NULL, '2026-09-01', 'middle', 'Ayşe Arslan', '0555 456 7890', 'Esentepe Mah. 3004. Sk. No:1', 40.3190, 36.5550, 'active') RETURNING id INTO v_student4_id;
    
    INSERT INTO public.students (company_id, full_name, school_id, vehicle_id, tags, grade, blood_group, allergies, registration_date, school_level, parent_name, parent_phone, address, home_latitude, home_longitude, status)
    VALUES (v_company_id, 'Ela Çelik', v_school2_id, v_vehicle2_id, '{"Nöbetçi"}', '8-B', 'A Rh-', 'Toz alerjisi', '2026-09-01', 'middle', 'Fatma Çelik', '0555 567 8901', 'Ali Paşa Mah. GOP Bulvarı No:84', 40.3200, 36.5580, 'active') RETURNING id INTO v_student5_id;
    
    INSERT INTO public.students (company_id, full_name, school_id, vehicle_id, tags, grade, blood_group, allergies, registration_date, school_level, parent_name, parent_phone, address, home_latitude, home_longitude, status)
    VALUES (v_company_id, 'Bora Yurt', v_school2_id, v_vehicle2_id, '{}', '6-C', '0 Rh-', NULL, '2026-09-05', 'middle', 'Kemal Yurt', '0555 678 9012', 'Ali Paşa Mah. 15. Sk. No:8', 40.3205, 36.5585, 'active') RETURNING id INTO v_student6_id;

    INSERT INTO public.students (company_id, full_name, school_id, vehicle_id, tags, grade, blood_group, allergies, registration_date, school_level, parent_name, parent_phone, address, home_latitude, home_longitude, status)
    VALUES (v_company_id, 'Deniz Tekin', v_school3_id, v_vehicle3_id, '{}', '10-A', 'B Rh+', NULL, '2026-09-01', 'high', 'Semra Tekin', '0555 789 0123', 'Geyras Mah. Sivas Yolu 2. Km', 40.3150, 36.5480, 'active') RETURNING id INTO v_student7_id;
    
    INSERT INTO public.students (company_id, full_name, school_id, vehicle_id, tags, grade, blood_group, allergies, registration_date, school_level, parent_name, parent_phone, address, home_latitude, home_longitude, status)
    VALUES (v_company_id, 'Yiğit Öztürk', v_school3_id, v_vehicle3_id, '{"Burslu"}', '11-F', 'A Rh+', NULL, '2026-09-01', 'high', 'Ahmet Öztürk', '0555 890 1234', 'GOP Bulvarı 600 Evler Sitesi C Blok', 40.3160, 36.5500, 'active') RETURNING id INTO v_student8_id;
    
    INSERT INTO public.students (company_id, full_name, school_id, vehicle_id, tags, grade, blood_group, allergies, registration_date, school_level, parent_name, parent_phone, address, home_latitude, home_longitude, status)
    VALUES (v_company_id, 'Melis Şen', v_school3_id, v_vehicle3_id, '{}', '12-C', '0 Rh+', 'Arı sokmasına alerji', '2026-09-03', 'high', 'Canan Şen', '0555 901 2345', 'Geyras Mah. 5. Sk. No:11', 40.3145, 36.5475, 'active') RETURNING id INTO v_student9_id;
    
    INSERT INTO public.students (company_id, full_name, school_id, vehicle_id, tags, grade, blood_group, allergies, registration_date, school_level, parent_name, parent_phone, address, home_latitude, home_longitude, status)
    VALUES (v_company_id, 'Arda Kurt', v_school3_id, v_vehicle3_id, '{}', '9-B', 'AB Rh-', NULL, '2026-09-01', 'high', 'Salih Kurt', '0555 012 3456', 'Yeşilırmak Mah. GOP Bulvarı No:112', 40.3125, 36.5440, 'active') RETURNING id INTO v_student10_id;

    -- 11. ÖĞRENCİ-GÜZERGAH ATAMALARI (student_route_assignments)
    INSERT INTO public.student_route_assignments (company_id, student_id, route_id, stop_id, type) VALUES
    (v_company_id, v_student1_id, v_route1_id, v_stop1_1, 'pickup'),
    (v_company_id, v_student2_id, v_route1_id, v_stop1_2, 'pickup'),
    (v_company_id, v_student3_id, v_route1_id, v_stop1_1, 'pickup'),
    
    (v_company_id, v_student4_id, v_route2_id, v_stop2_1, 'pickup'),
    (v_company_id, v_student5_id, v_route2_id, v_stop2_2, 'pickup'),
    (v_company_id, v_student6_id, v_route2_id, v_stop2_2, 'pickup'),
    
    (v_company_id, v_student7_id, v_route3_id, v_stop3_1, 'pickup'),
    (v_company_id, v_student8_id, v_route3_id, v_stop3_2, 'pickup'),
    (v_company_id, v_student9_id, v_route3_id, v_stop3_1, 'pickup'),
    (v_company_id, v_student10_id, v_route3_id, v_stop3_2, 'pickup');

    -- 12. GİDERLERİ EKLE (expenses)
    INSERT INTO public.expenses (company_id, expense_category, vehicle_id, title, expense_date, amount, description, status) VALUES
    (v_company_id, 'Yakıt', v_vehicle1_id, 'Shell Mazot Alımı - 60 AA 101', '2026-07-10', 4500.00, 'Haftalık mazot alımı', 'paid'),
    (v_company_id, 'Yakıt', v_vehicle2_id, 'Opet Motorin - 60 BB 202', '2026-07-12', 5200.00, 'Haftalık yakıt dolumu', 'paid'),
    (v_company_id, 'Araç Bakım', v_vehicle1_id, 'Periyodik 10.000 Bakımı', '2026-07-05', 8500.00, 'Motor yağı, filtreler değişti', 'paid'),
    (v_company_id, 'Vergi/Sigorta', v_vehicle3_id, 'Kasko İlk Taksit', '2026-07-15', 3000.00, 'Yıllık kasko sigortası', 'upcoming'),
    (v_company_id, 'Maaş', NULL, 'Personel Maaşı - Ahmet Şoför', '2026-07-28', 25000.00, 'Şoför aylık hak ediş', 'upcoming');

    -- 13. ÖDEMELERİ EKLE (payments)
    INSERT INTO public.payments (company_id, invoice_no, student_id, month, amount, due_date, status, payment_method) VALUES
    (v_company_id, 'SB-2026-001', v_student1_id, 'Temmuz', 1500.00, '2026-07-20', 'Ödendi', 'EFT/Havale'),
    (v_company_id, 'SB-2026-002', v_student2_id, 'Temmuz', 1500.00, '2026-07-20', 'Ödendi', 'Kredi Kartı'),
    (v_company_id, 'SB-2026-003', v_student3_id, 'Temmuz', 1500.00, '2026-07-20', 'Bekliyor', NULL),
    (v_company_id, 'SB-2026-004', v_student4_id, 'Temmuz', 1800.00, '2026-07-20', 'Ödendi', 'Nakit'),
    (v_company_id, 'SB-2026-005', v_student5_id, 'Temmuz', 1800.00, '2026-07-20', 'Bekliyor', NULL),
    (v_company_id, 'SB-2026-006', v_student7_id, 'Temmuz', 2200.00, '2026-07-20', 'Ödendi', 'EFT/Havale'),
    (v_company_id, 'SB-2026-007', v_student8_id, 'Temmuz', 2200.00, '2026-07-20', 'Bekliyor', NULL);

    -- 14. PUANTAJ SEFER KAYITLARINI EKLE (route_attendances)
    -- Temmuz ayının ilk 18 günü için hafta içi günlerine 1 veya 2 sefer ekleyelim
    v_date := '2026-07-01'::DATE;
    WHILE v_date <= '2026-07-18'::DATE LOOP
        -- Hafta sonu değilse (Cumartesi = 6, Pazar = 7)
        IF EXTRACT(ISODOW FROM v_date) < 6 THEN
            -- Rota 1: Günde 2 sefer (Sabah-Akşam)
            INSERT INTO public.route_attendances (company_id, route_id, vehicle_id, attendance_date, trip_count, source)
            VALUES (v_company_id, v_route1_id, v_vehicle1_id, v_date, 2, 'manual');
            
            -- Rota 2: Günde 2 sefer
            INSERT INTO public.route_attendances (company_id, route_id, vehicle_id, attendance_date, trip_count, source)
            VALUES (v_company_id, v_route2_id, v_vehicle2_id, v_date, 2, 'manual');
            
            -- Rota 3: Günde 1 sefer
            INSERT INTO public.route_attendances (company_id, route_id, vehicle_id, attendance_date, trip_count, source)
            VALUES (v_company_id, v_route3_id, v_vehicle3_id, v_date, 1, 'manual');
        END IF;
        v_date := v_date + 1;
    END LOOP;

    -- 15. PUANTAJ DÜZELTMELERİNİ EKLE (timesheet_adjustments)
    INSERT INTO public.timesheet_adjustments (company_id, month, year, type, description, amount) VALUES
    (v_company_id, '07', '2026', 'extra', 'Hafta sonu piknik gezisi ekstra servisi', 1200.00),
    (v_company_id, '07', '2026', 'deduction', 'Gecikme cezası kesintisi (10 Temmuz)', 350.00);

END $$;
