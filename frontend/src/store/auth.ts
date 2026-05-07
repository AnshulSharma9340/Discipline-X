import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import type { AppUser } from '@/types';

interface AuthState {
  session: Session | null;
  user: AppUser | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: false,
  initialized: false,

  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) {
        get().fetchProfile();
      } else {
        set({ user: null });
      }
    });

    if (data.session) {
      await get().fetchProfile();
    }
    set({ initialized: true });
  },

  fetchProfile: async () => {
    set({ loading: true });
    try {
      const res = await api.get<{ user: AppUser }>('/auth/me');
      set({ user: res.data.user });
    } catch {
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    // Belt-and-suspenders: clear Supabase's persisted session from
    // localStorage directly. This guarantees the next page load sees no
    // session even if the API call below fails or is slow, and prevents
    // the brief flash of /login that happens when ProtectedRoute reacts
    // to the cleared session before our redirect runs.
    if (typeof window !== 'undefined') {
      try {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
          .forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // localStorage may be unavailable in sandboxed contexts; ignore.
      }
    }

    // Best-effort server-side invalidation — fire-and-forget so the redirect
    // happens immediately. The localStorage purge above already logged the
    // user out client-side regardless of network outcome.
    void supabase.auth.signOut().catch(() => {});

    // Hard redirect to landing using replace() so the back button doesn't
    // return them to the protected page they just signed out of.
    if (typeof window !== 'undefined') {
      window.location.replace('/');
    }
  },
}));
