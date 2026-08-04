import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://wlbpbmkfsqpxgwvzigaq.supabase.co', 'sb_publishable_tAiWjMUbZ9ozaKkQHZDjew_hVtpD70W');
async function run() {
    const res = await supabase.auth.signInWithPassword({ email: 'admin@servisbot.com', password: 'Admin123!' });
    console.log(res);
}
run();
