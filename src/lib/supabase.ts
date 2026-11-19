import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isSupabaseConfigured) {
  console.warn(
    '[Life OS] Supabase environment variables not configured. ' +
    'Auth and analytics will be disabled. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local to enable them.',
  );
}

// Use placeholder values when not configured so createClient never throws at
// module-load time. All Supabase API calls will simply fail silently.
// Use || (not ??) because empty-string env vars are falsy but not nullish.
export const supabase = createClient(
  supabaseUrl     || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder_anon_key_for_local_dev',
  {
    auth: {
      detectSessionInUrl: true,
      persistSession:     true,
    },
  },
);
