import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProductivityLine } from '@/components/charts/ProductivityLine';
import { CompletionBar } from '@/components/charts/CompletionBar';
import { Heatmap } from '@/components/charts/Heatmap';
import { useAuth } from '@/store/auth';

interface HistoryPoint {
  date: string;
  productivity: number;
  discipline: number;
  focus: number;
  approved: number;
  submitted: number;
  rejected: number;
}

interface HeatPoint {
  date: string;
  value: number;
}

export default function Streak() {
  const user = useAuth((s) => s.user);
  const fetchProfile = useAuth((s) => s.fetchProfile);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [heat, setHeat] = useState<HeatPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [h, hm] = await Promise.all([
        api.get<HistoryPoint[]>('/analytics/me/history', { params: { days: 30 } }),
        api.get<HeatPoint[]>('/analytics/me/heatmap', { params: { days: 84 } }),
      ]);
      setHistory(h.data);
      setHeat(hm.data);
    } finally {
      setLoading(false);
    }
  }

  async function recompute() {
    setRefreshing(true);
    try {
      await api.post('/analytics/me/refresh-today');
      toast.success('Today recomputed');
      await load();
      await fetchProfile();
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Flame className="w-7 h-7 text-orange-400" /> Streak & Stats
          </h1>
          <p className="text-white/60 mt-1">
            Current streak: <span className="text-white font-medium">{user?.streak ?? 0} days</span>{' '}
            · Longest:{' '}
            <span className="text-white font-medium">{user?.longest_streak ?? 0}</span>
          </p>
        </div>
        <Button variant="ghost" loading={refreshing} onClick={recompute}>
          <RefreshCw className="w-4 h-4" /> Recompute today
        </Button>
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">Productivity (last 30 days)</h2>
              <div className="flex items-center gap-3 text-xs text-white/50">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-neon-violet" /> Productivity
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-neon-cyan" /> Discipline
                </span>
              </div>
            </div>
            <ProductivityLine data={history} />
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="font-display font-semibold mb-4">Completion by day</h2>
              <CompletionBar data={history} />
            </Card>
            <Card>
              <h2 className="font-display font-semibold mb-4">Discipline heatmap (12 weeks)</h2>
              <Heatmap data={heat} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
