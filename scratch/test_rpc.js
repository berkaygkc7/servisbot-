const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wlbpbmkfsqpxgwvzigaq.supabase.co';
const supabaseKey = 'sb_publishable_tAiWjMUbZ9ozaKkQHZDjew_hVtpD70W';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('sa_get_advanced_stats');
  console.log('RPC Data:', data);
  console.log('RPC Error:', error);
  
  const { data: companies, count: cCount, error: compErr } = await supabase.from('companies').select('*', { count: 'exact', head: true });
  console.log('Companies count:', cCount, 'Error:', compErr?.message);
}

check();
