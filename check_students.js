import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('students').select('id, full_name, parent_name');
    console.log(data?.filter(s => s.full_name === 'Bilinmiyor' || !s.full_name || s.full_name.trim() === ''));
}
check();
