import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { extractSupabaseHost, isSupabaseEnvConfigured } from './supabaseHelpers';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = isSupabaseEnvConfigured(supabaseUrl, supabaseKey);
export const supabaseProjectHost = extractSupabaseHost(supabaseUrl);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;
