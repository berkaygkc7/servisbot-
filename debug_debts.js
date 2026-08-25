const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://wlbpbmkfsqpxgwvzigaq.supabase.co', 'sb_publishable_tAiWjMUbZ9ozaKkQHZDjew_hVtpD70W');

async function debugDebts() {
  const { data: students, error: sErr } = await supabase.from('students').select('*').limit(3);
  const { data: rules, error: rErr } = await supabase.from('pricing_rules').select('*').limit(3);

  console.log("Students:", JSON.stringify(students, null, 2));
  console.log("Rules:", JSON.stringify(rules, null, 2));
}

debugDebts();
