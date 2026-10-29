import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://xfydetlxscdatnoramnn.supabase.co';
const defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmeWRldGx4c2NkYXRub3JhbW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NzIzMDQsImV4cCI6MjEwNzQ0ODMwNH0.DQL4OMv81A03he8w9OoRsuJSXvJ40wWzElrpbtt1dz0';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
