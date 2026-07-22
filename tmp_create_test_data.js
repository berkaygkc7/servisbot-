
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    try {
        console.log('--- Test Verisi Olusturuluyor ---');
        
        // 1. Company
        const { data: co, error: coErr } = await supabase.from('companies').insert({ company_name: 'Test Servis' }).select().single();
        if (coErr) throw coErr;
        console.log('Sirket Tamam:', co.id);

        // 2. Student
        const { data: st, error: stErr } = await supabase.from('students').insert({ 
            full_name: 'Ahmet Yilmaz (Gercek)', 
            company_id: co.id, 
            parent_phone: '5320000000' 
        }).select().single();
        if (stErr) throw stErr;
        console.log('Ogrenci Tamam:', st.id);

        // 3. Vehicle
        const { data: ve, error: veErr } = await supabase.from('vehicles').insert({ 
            plate_number: '34 REAL 123', 
            company_id: co.id 
        }).select().single();
        if (veErr) throw veErr;
        console.log('Arac Tamam:', ve.id);

        console.log('--- Tum Veriler Basildi ---');
        console.log('Lutfen uygulamada 5320000000 numarasiyla (ya da varsa auth ile) tekrar giris yap.');
    } catch (e) {
        console.error('HATA:', e.message || e);
    }
}

run();
