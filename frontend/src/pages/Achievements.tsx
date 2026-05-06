import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { Badge } from '@/types';

const tierStyle = {
  bronze: 'from-amber-700/30 to-amber-900/10 text-amber-400 border-amber-500/20',
  silver: 'from-slate-300/20 to-slate-400/10 text-slate-200 border-slate-300/20',
  gold: 'from-yellow-400/30 to-amber-500/10 text-yellow-300 border-yellow-300/30',
  mythic: 'from-neon-pink/30 to-neon-violet/30 text-neon-pink border-neon-pink/40',
} as const;

export default function Achievements() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<Badge[]>('/badges/me');
      setBadges(r.data);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      const r = await api.post<{ newly_earned: Badge[] }>('/badges/me/refresh');
      if (r.data.newly_earned.length > 0) {
        toast.success(
          `Unlocked ${r.data.newly_earned.length} new badge${
            r.data.newly_earned.length > 1 ? 's' : ''
          }: ${r.data.newly_earned.map((b) => b.emoji + ' ' + b.name).join(', ')}`,
        );
      } else {
        toast('No new badges yet — keep grinding.', { icon: '⚡' });
      }
      load();
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Trophy className="w-7 h-7 text-amber-400" /> Achievements
          </h1>
          <p className="text-white/60 mt-1">
            <span className="text-white">{earned.length}</span> of {badges.length} unlocked
          </p>
        </div>
        <Button variant="ghost" loading={refreshing} onClick={refresh}>
          <RefreshCw className="w-4 h-4" /> Re-evaluate
        </Button>
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : badges.length === 0 ? (
        <div className="glass p-12 text-center text-white/50">No badges in catalog yet.</div>
      ) : (
        <>
          {earned.length > 0 && (
            <section>
              <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3">Earned</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {earned.map((b) => (
                  <BadgeCard key={b.code} b={b} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3 mt-6">
              Locked ({locked.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {locked.map((b) => (
                <BadgeCard key={b.code} b={b} locked />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function BadgeCard({ b, locked }: { b: Badge; locked?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'glass p-5 text-center relative overflow-hidden border',
        locked ? 'opacity-50' : 'shadow-glow',
        !locked && `bg-gradient-to-br ${tierStyle[b.tier]}`,
      )}
    >
      <div className={cn('text-5xl mb-2', locked && 'grayscale')}>{b.emoji}</div>
      <div className="font-display font-semibold text-sm">{b.name}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/50 mt-0.5">{b.tier}</div>
      <p className="text-xs text-white/60 mt-2">{b.description}</p>
    </motion.div>
  );
}
