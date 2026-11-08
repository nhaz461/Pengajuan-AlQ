import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://voocwjmnnxjclvvudxmc.supabase.co';
const defaultSupabaseAnonKey = 'sb_publishable_2BqjSwFW4XJia11KqQx7kg_n_3FWJjt';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
