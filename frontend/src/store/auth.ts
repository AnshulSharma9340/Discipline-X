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
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
