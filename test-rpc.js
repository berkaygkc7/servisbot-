
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  await supabase.auth.signInWithPassword({ email: 'sofor945@test.com', password: 'password123' });
  const { data: companies, error } = await supabase.from('companies').select('*');
  console.log(companies, error);
}
run();
