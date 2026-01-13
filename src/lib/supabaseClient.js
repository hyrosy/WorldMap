import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your actual Supabase project URL and anon key
const supabaseUrl = 'https://rugprcqrjickuzcjzzly.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1Z3ByY3Fyamlja3V6Y2p6emx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjc5ODUsImV4cCI6MjA3MTY0Mzk4NX0.n-G3EEjDQgh-2tTliU1CKx4jvIFUBaKAP0a1Dm307WI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);