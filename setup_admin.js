import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://wlbpbmkfsqpxgwvzigaq.supabase.co', 'sb_publishable_tAiWjMUbZ9ozaKkQHZDjew_hVtpD70W');
async function run() {
    try {
        const email = 'patron123@servisbot.com';
        const password = 'Admin123!';
        console.log('Signing up...');
        await supabase.auth.signUp({ email, password, options: { data: { full_name: 'Patron' } } });
        
        console.log('Logging in...');
        const { data } = await supabase.auth.signInWithPassword({ email, password });
        
        if(data.user) {
            console.log('Registering company...');
            await supabase.rpc('register_company', { p_user_id: data.user.id, p_company_name: 'Merkez', p_full_name: 'Patron', p_city: 'Ist', p_subscription_tier: 'PREMIUM' });
            console.log('Successfully created!');
        }
    } catch (e) {
        console.error(e);
    }
}
run();
