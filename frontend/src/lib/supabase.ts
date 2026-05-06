import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

export const missingEnv: string[] = [];
if (!url) missingEnv.push('VITE_SUPABASE_URL');
if (!anonKey) missingEnv.push('VITE_SUPABASE_ANON_KEY');

// Build a real client when configured. When missing, build a stub so the
// rest of the app can import freely without crashing — the UI shows a
// "Configuration needed" page instead of a blank screen.
function buildStub(): SupabaseClient {
  const err = (..._args: unknown[]) =>
    Promise.reject(new Error('Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'));
  const ch = { unsubscribe() {} };
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: (_cb: unknown) => ({ data: { subscription: ch } }),
      signInWithPassword: err,
      signUp: err,
      signOut: async () => ({ error: null }),
    },
    storage: {
      from: () => ({ upload: err, createSignedUrl: err, remove: err }),
    },
  } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = isConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : buildStub();
