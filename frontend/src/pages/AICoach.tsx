import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Loader2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

interface Burnout {
  score: number;
  signal: string;
  factors: Record<string, number>;
}
interface Procrastination {
  score: number;
  signal: string;
  factors: Record<string, number>;
}
interface Forecast {
  projection: { day_offset: number; projected_productivity: number }[];
  trend: string;
  ewma_now?: number;
}
interface Recommendation {
  id: string;
  title: string;
  body: string;
  tone: 'positive' | 'warning' | 'neutral';
}

export default function AICoach() {
  const [burn, setBurn] = useState<Burnout | null>(null);
  const [proc, setProc] = useState<Procrastination | null>(null);
  const [fc, setFc] = useState<Forecast | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Burnout>('/ai/me/burnout').then((r) => setBurn(r.data)),
      api.get<Procrastination>('/ai/me/procrastination').then((r) => setProc(r.data)),
      api.get<Forecast>('/ai/me/forecast').then((r) => setFc(r.data)),
      api.get<Recommendation[]>('/ai/me/recommendations').then((r) => setRecs(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-pink grid place-items-center">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">AI Productivity Coach</h1>
          <p className="text-white/60 text-sm">
            Behavioral analytics. No fluff — just signal from your patterns.
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <ScoreGauge
              title="Burnout risk"
              icon={AlertTriangle}
              accent="pink"
              score={burn?.score ?? 0}
              signal={burn?.signal ?? '—'}
            />
            <ScoreGauge
              title="Procrastination"
              icon={Clock}
              accent="amber"
              score={proc?.score ?? 0}
              signal={proc?.signal ?? '—'}
            />
            <Card>
              <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider mb-2">
                {fc?.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-emerald-300" />
                ) : fc?.trend === 'down' ? (
                  <TrendingDown className="w-4 h-4 text-red-300" />
                ) : (
                  <Sparkles className="w-4 h-4 text-neon-cyan" />
                )}
                7-day forecast
              </div>
              <div className="text-3xl font-display font-bold neon-text">
                {fc?.ewma_now?.toFixed(0) ?? '—'}
              </div>
              <div className="text-xs text-white/50 mt-1">
                Trend: <span className="capitalize text-white/70">{fc?.trend ?? '—'}</span>
              </div>
              <div className="flex gap-1 mt-3">
                {fc?.projection.map((p) => (
                  <div
                    key={p.day_offset}
                    className="flex-1 rounded-sm bg-gradient-to-t from-neon-violet/40 to-neon-cyan/40"
                    style={{ height: Math.max(6, Math.min(48, p.projected_productivity / 2)) }}
                    title={`Day +${p.day_offset}: ${p.projected_productivity}`}
                  />
                ))}
              </div>
            </Card>
          </div>

          <div>
            <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3">
              Recommendations
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {recs.length === 0 ? (
                <Card className="md:col-span-2 text-center py-10 text-white/50">
                  No recommendations yet.
                </Card>
              ) : (
                recs.map((r) => <Recommendation key={r.id} rec={r} />)
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ScoreGauge({
  title,
  icon: Icon,
  accent,
  score,
  signal,
}: {
  title: string;
  icon: typeof AlertTriangle;
  accent: 'pink' | 'amber' | 'cyan';
  score: number;
  signal: string;
}) {
  const colors = {
    pink: 'from-neon-pink to-neon-violet text-neon-pink',
    amber: 'from-amber-500 to-orange-400 text-amber-300',
    cyan: 'from-neon-cyan to-neon-violet text-neon-cyan',
  };
  return (
    <Card>
      <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider mb-2">
        <Icon className={cn('w-4 h-4', colors[accent].split(' ').slice(-1))} /> {title}
      </div>
      <div className="text-4xl font-display font-bold">{score}</div>
      <div className="text-xs text-white/50 mt-1 capitalize">Signal: {signal.replace('_', ' ')}</div>
      <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn('h-full bg-gradient-to-r', colors[accent].split(' ').slice(0, 2).join(' '))}
          style={{ width: `${score}%` }}
        />
      </div>
    </Card>
  );
}

function Recommendation({ rec }: { rec: Recommendation }) {
  const tones = {
    positive: { tone: 'green' as const, icon: CheckCircle2, color: 'text-emerald-300' },
    warning: { tone: 'amber' as const, icon: AlertTriangle, color: 'text-amber-300' },
    neutral: { tone: 'neutral' as const, icon: Sparkles, color: 'text-neon-cyan' },
  };
  const t = tones[rec.tone];
  const Icon = t.icon;
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/5 grid place-items-center shrink-0">
          <Icon className={cn('w-4 h-4', t.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge tone={t.tone}>{rec.tone}</Badge>
          </div>
          <div className="font-display font-semibold">{rec.title}</div>
          <p className="text-sm text-white/70 mt-1">{rec.body}</p>
        </div>
      </div>
    </Card>
  );
}
