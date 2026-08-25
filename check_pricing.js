import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://wlbpbmkfsqpxgwvzigaq.supabase.co', 'sb_publishable_tAiWjMUbZ9ozaKkQHZDjew_hVtpD70W');

async function check() {
  const { data: companies } = await supabase.from('companies').select('*');
  if (companies) {
      console.log(companies.map(c => c.company_name));
  } else {
      console.log('No companies found');
  }
}

check();
