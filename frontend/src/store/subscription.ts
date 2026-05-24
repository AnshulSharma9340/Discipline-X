import { create } from 'zustand';
import { fetchSubscription, type SubscriptionState } from '@/lib/billing';

interface SubscriptionStore {
  sub: SubscriptionState | null;
  loading: boolean;
  fetched: boolean;
  /** Fetch once if not already fetched. Safe to call from many components. */
  load: () => Promise<void>;
  /** Force a refresh regardless of cache. */
  refresh: () => Promise<void>;
  /** Replace state from a server response (e.g. after a successful payment). */
  setSub: (sub: SubscriptionState) => void;
  reset: () => void;
}

export const useSubscription = create<SubscriptionStore>((set, get) => ({
  sub: null,
  loading: false,
  fetched: false,

  load: async () => {
    if (get().fetched || get().loading) return;
    set({ loading: true });
    try {
      const sub = await fetchSubscription();
      set({ sub, loading: false, fetched: true });
    } catch {
      set({ loading: false, fetched: true });
    }
  },

  refresh: async () => {
    set({ loading: true });
    try {
      const sub = await fetchSubscription();
      set({ sub, loading: false, fetched: true });
    } catch {
      set({ loading: false });
    }
  },

  setSub: (sub) => set({ sub, fetched: true, loading: false }),

  reset: () => set({ sub: null, fetched: false, loading: false }),
}));
