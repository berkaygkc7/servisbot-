
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    try {
        const { data: tokens, error: tokenError } = await supabase.from('push_tokens').select('*').order('created_at', { ascending: false }).limit(5);
        
        console.log('--- Son Push Token Kayitlari ---');
        console.table(tokens);
        if (tokenError) console.error('Hata:', tokenError.message);
    } catch (e) {
        console.error(e);
    }
}

check();
