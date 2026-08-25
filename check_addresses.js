import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://wlbpbmkfsqpxgwvzigaq.supabase.co', 'sb_publishable_tAiWjMUbZ9ozaKkQHZDjew_hVtpD70W');

async function check() {
  const { data: companies } = await supabase.from('companies').select('*').ilike('company_name', '%servispark%');
  if (!companies || companies.length === 0) return;
  
  const { data: students } = await supabase.from('students').select('address, neighborhood').eq('company_id', companies[0].id);
  
  const addresses = students.map(s => s.address).filter(Boolean);
  const neighborhoods = students.map(s => s.neighborhood).filter(Boolean);
  
  console.log("Unique addresses:");
  const uniqueAddrs = Array.from(new Set(addresses)).slice(0, 20);
  console.log(uniqueAddrs);
  
  console.log("\nUnique stored neighborhoods:");
  console.log(Array.from(new Set(neighborhoods)));
}

check();
