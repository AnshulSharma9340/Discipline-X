import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Loader2, Zap, ShieldCheck, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import type { ShopState } from '@/types';

export default function Shop() {
  const fetchProfile = useAuth((s) => s.fetchProfile);
  const [state, setState] = useState<ShopState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<ShopState>('/shop/');
      setState(r.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function buy(item: string) {
    setBusy(item);
    try {
      await api.post('/shop/buy', { item });
      toast.success('Purchased');
      await load();
      await fetchProfile();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <ShoppingBag className="w-7 h-7 text-neon-pink" /> XP Shop
        </h1>
        <p className="text-white/60 mt-1">Spend XP on themes and streak shields.</p>
      </motion.div>

      {loading || !state ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="text-center">
              <div className="text-xs uppercase tracking-wider text-white/50">Your XP</div>
              <div className="text-4xl font-display font-bold neon-text mt-1">
                {state.xp.toLocaleString()}
              </div>
              <Zap className="w-5 h-5 text-neon-violet mx-auto mt-1" />
            </Card>
            <Card className="text-center">
              <div className="text-xs uppercase tracking-wider text-white/50">Freeze tokens</div>
              <div className="text-4xl font-display font-bold mt-1">{state.freeze_tokens}</div>
              <div className="text-xs text-white/40 mt-1">🛡️ Each protects a streak day</div>
            </Card>
            <Card className="text-center bg-gradient-to-br from-neon-violet/10 to-neon-cyan/10">
              <div className="text-xs uppercase tracking-wider text-white/50">Buy a Shield</div>
              <div className="text-4xl font-display font-bold mt-1">
                {state.freeze_token.cost}
              </div>
              <Button
                onClick={() => buy('freeze_token')}
                loading={busy === 'freeze_token'}
                disabled={state.xp < state.freeze_token.cost}
                className="mt-3"
              >
                <ShieldCheck className="w-4 h-4" /> Buy Shield
              </Button>
            </Card>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3">Themes</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {state.themes.map((t) => {
                const isCurrent = state.current_theme === t.code;
                return (
                  <Card
                    key={t.code}
                    className="overflow-hidden p-0 group"
                  >
                    <div
                      className="h-28 relative"
                      style={{ background: t.preview }}
                    >
                      {t.owned && (
                        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider">
                          owned
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="font-display font-semibold">{t.name}</div>
                      <div className="text-xs text-white/50 mt-0.5">
                        {t.cost === 0 ? 'Free' : `${t.cost.toLocaleString()} XP`}
                      </div>
                      {isCurrent ? (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-300">
                          <Check className="w-3.5 h-3.5" /> Active
                        </div>
                      ) : t.owned ? (
                        <Button
                          variant="ghost"
                          className="w-full mt-3"
                          onClick={() => buy(t.code)}
                          loading={busy === t.code}
                        >
                          Apply
                        </Button>
                      ) : (
                        <Button
                          className="w-full mt-3"
                          onClick={() => buy(t.code)}
                          loading={busy === t.code}
                          disabled={state.xp < t.cost}
                        >
                          Unlock
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
