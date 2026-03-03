import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your actual Supabase project URL and anon key
const supabaseUrl = 'https://oenpbtnnmyoivkhfdocj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lbnBidG5ubXlvaXZraGZkb2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODQyNDAsImV4cCI6MjA4Nzk2MDI0MH0.Pxy7doSI3lP2-i3PY8b-aQAQ3rcXlpaN1TmcgbqmqaA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);