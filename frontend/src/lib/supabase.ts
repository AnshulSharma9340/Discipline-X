import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const apiBase = import.meta.env.VITE_API_BASE_URL;

// All three env vars must be set. apiBase must also be a reachable URL —
// localhost from a deployed (non-localhost) frontend is mixed-content blocked.
function isUsableApiUrl(v: string | undefined): boolean {
  if (!v) return false;
  if (!/^https?:\/\//.test(v)) return false;
  const onLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (v.includes('localhost') && !onLocalhost) return false;
  return true;
}

export const isConfigured = Boolean(url && anonKey && isUsableApiUrl(apiBase));

export const missingEnv: string[] = [];
if (!url) missingEnv.push('VITE_SUPABASE_URL');
if (!anonKey) missingEnv.push('VITE_SUPABASE_ANON_KEY');
if (!isUsableApiUrl(apiBase)) missingEnv.push('VITE_API_BASE_URL');

function buildStub(): SupabaseClient {
  const err = (..._args: unknown[]) =>
    Promise.reject(new Error('Supabase not configured — set required VITE_* env vars'));
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
