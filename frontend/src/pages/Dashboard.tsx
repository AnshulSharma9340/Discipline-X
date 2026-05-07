import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Target,
  Trophy,
  Zap,
  ClipboardList,
  ArrowUpRight,
  CheckCircle2,
  Timer,
  Play,
  Brain,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ProductivityLine } from '@/components/charts/ProductivityLine';
import { Tutorial, shouldShowTutorial } from '@/components/Tutorial';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/cn';
import type { TaskWithSubmission, NudgeResponse, DailyQuote } from '@/types';

interface HistoryPoint {
  date: string;
  productivity: number;
  discipline: number;
  approved: number;
  submitted: number;
  rejected: number;
}

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const [today, setToday] = useState<TaskWithSubmission[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [nudge, setNudge] = useState<NudgeResponse | null>(null);
  const [quote, setQuote] = useState<DailyQuote | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    api.get<TaskWithSubmission[]>('/tasks/today/with-status').then((r) => setToday(r.data)).catch(() => {});
    api
      .get<HistoryPoint[]>('/analytics/me/history', { params: { days: 14 } })
      .then((r) => setHistory(r.data))
      .catch(() => {});
    api.get<NudgeResponse>('/ai/me/nudge').then((r) => setNudge(r.data)).catch(() => {});
    api.get<DailyQuote>('/ai/quote').then((r) => setQuote(r.data)).catch(() => {});

    // Auto-show the tutorial on the user's first dashboard visit. The flag in
    // localStorage prevents it from re-showing on later visits.
    if (shouldShowTutorial()) {
      const t = setTimeout(() => setTutorialOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const required = today.filter((i) => i.task.is_required);
  const approved = today.filter((i) => i.submission?.status === 'approved').length;
  const pending = today.filter(
    (i) => i.submission?.status === 'submitted' || i.submission?.status === 'under_review',
  ).length;

  const nudgeColor = {
    positive: 'from-emerald-500/15 to-neon-cyan/10 border-emerald-500/20',
    warning: 'from-amber-500/15 to-orange-500/10 border-amber-500/20',
    neutral: 'from-neon-violet/15 to-neon-cyan/10 border-neon-violet/20',
  };

  return (
    <div className="space-y-6">
      <Tutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-display font-bold">Discipline is a daily decision.</h1>
        <p className="text-white/60 mt-1">
          {today.length === 0
            ? 'No tasks yet. Stay ready.'
            : `${approved}/${required.length} required tasks approved · ${pending} awaiting review`}
        </p>
      </motion.div>

      {quote && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="glass p-5 relative overflow-hidden border-l-4 border-l-neon-violet"
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-neon-violet/10 blur-2xl" />
          <div className="relative">
            <div className="text-xs uppercase tracking-wider text-white/40 mb-2 inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-neon-violet" /> Today's quote
              {quote.source === 'groq' && <span className="text-neon-cyan">· AI</span>}
            </div>
            <blockquote className="text-lg md:text-xl font-display italic text-white/90">
              "{quote.text}"
            </blockquote>
            <div className="mt-2 text-sm text-white/50">— {quote.author}</div>
          </div>
        </motion.div>
      )}

      {nudge && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'glass p-5 border bg-gradient-to-br relative overflow-hidden',
            nudgeColor[nudge.tone],
          )}
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-neon-violet/10 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-pink grid place-items-center shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60 mb-1">
                <Sparkles className="w-3 h-3 text-neon-cyan" /> Coach says
              </div>
              <div className="font-display font-semibold text-lg">{nudge.headline}</div>
              <p className="text-sm text-white/70 mt-1">{nudge.body}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-white/60">
                  <AlertTriangle className="w-3 h-3" />
                  Burnout: <span className="text-white">{nudge.burnout.score}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-white/60">
                  <ShieldCheck className="w-3 h-3" />
                  Procrastination: <span className="text-white">{nudge.procrastination.score}</span>
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Streak" value={`${user?.streak ?? 0}d`} icon={Flame} accent="pink" />
        <StatCard label="XP" value={(user?.xp ?? 0).toLocaleString()} icon={Zap} accent="violet" />
        <StatCard
          label="Discipline"
          value={user?.discipline_score ?? 0}
          icon={Target}
          accent="cyan"
        />
        <StatCard
          label={`Lv ${user?.level ?? 1}`}
          value={user?.productivity_score ?? 0}
          icon={Trophy}
          accent="lime"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-display font-semibold">Today's Mission</h2>
              <p className="text-sm text-white/50">Tasks assigned by your admin</p>
            </div>
            <Link
              to="/tasks"
              className="text-xs text-neon-violet hover:text-neon-cyan inline-flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {today.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No tasks yet"
              body="Once your admin assigns daily tasks, they'll show up here in real time."
            />
          ) : (
            <div className="space-y-2">
              {today.slice(0, 4).map((it) => (
                <div
                  key={it.task.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-white/5 hover:border-white/15 transition"
                >
                  <div
                    className={`w-8 h-8 rounded-lg grid place-items-center ${
                      it.submission?.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-white/5 text-white/40'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{it.task.title}</div>
                    <div className="text-xs text-white/50 capitalize">
                      {it.submission?.status ?? 'not started'} · +{it.task.points} XP
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-display font-semibold mb-1">Trajectory</h2>
            <p className="text-sm text-white/50 mb-4">
              Longest streak {user?.longest_streak ?? 0}d · {user?.freeze_tokens ?? 0} 🛡️
            </p>
            <div className="text-6xl font-display font-bold neon-text">
              {user?.streak ?? 0}
              <span className="text-2xl text-white/40">d</span>
            </div>
            <div className="text-xs text-white/40 mt-2 uppercase tracking-wider">
              current streak
            </div>
          </Card>

          <Card glow className="bg-gradient-to-br from-neon-violet/15 to-neon-cyan/10">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60 mb-2">
              <Timer className="w-4 h-4 text-neon-violet" /> Focus session
            </div>
            <div className="font-display font-semibold text-lg mb-1">Lock in for 25 minutes</div>
            <p className="text-sm text-white/60 mb-4">
              Pomodoro, custom focus, auto-logged. Submit as proof.
            </p>
            <Link to="/focus" className="btn-primary w-full">
              <Play className="w-4 h-4" /> Start a session
            </Link>
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold">Productivity (last 14 days)</h2>
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
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ClipboardList;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center py-10">
      <div className="inline-flex w-12 h-12 rounded-2xl bg-white/5 border border-white/10 grid place-items-center mb-3">
        <Icon className="w-5 h-5 text-white/50" />
      </div>
      <div className="font-medium">{title}</div>
      <p className="text-sm text-white/50 max-w-sm mx-auto mt-1">{body}</p>
    </div>
  );
}
