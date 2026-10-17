import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export type { Database };
export type TypedSupabaseClient = SupabaseClient<Database>;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Key missing in environment variables');
}

// Prevent crash if env vars are missing (e.g. during build or initial deploy)
const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(safeUrl, safeKey);
