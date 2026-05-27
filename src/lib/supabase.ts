import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Copy .env.example to .env and fill in your keys.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Analysis = {
  id: string;
  user_id: string;
  created_at: string;
  model_used: string;
  input_type: string;
  file_name: string | null;
  result_label: string;
  confidence: number;
  classification_mode: string;
  probabilities: Record<string, number> | null;
};
