import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer as TimerIcon,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Zap,
  Trash2,
  Upload,
  Bell,
  BellOff,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Task } from '@/types';

type Mode = 'pomodoro' | 'short_break' | 'long_break' | 'custom';

interface Preset {
  mode: Mode;
  label: string;
  minutes: number;
  icon: typeof Brain;
  color: string;
}

const presets: Preset[] = [
  { mode: 'pomodoro', label: 'Focus', minutes: 25, icon: Brain, color: 'text-neon-violet' },
  { mode: 'short_break', label: 'Short break', minutes: 5, icon: Coffee, color: 'text-neon-cyan' },
  { mode: 'long_break', label: 'Long break', minutes: 15, icon: Coffee, color: 'text-neon-lime' },
];

interface Session {
  id: string;
  mode: Mode;
  label: string;
  durationSeconds: number;
  completedAt: string;
}

const STORAGE_KEY = 'disciplinex.focus.sessions';
const ACTIVE_KEY = 'disciplinex.focus.active';

interface ActiveTimer {
  mode: Mode;
  customMinutes: number;
  label: string;
  durationSeconds: number;
  endsAtMs: number; // wall-clock ms when timer hits 00:00
}

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

function saveSessions(s: Session[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s.slice(-200)));
}

function loadActive(): ActiveTimer | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as ActiveTimer) : null;
  } catch {
    return null;
  }
}

function saveActive(t: ActiveTimer | null) {
  if (t) localStorage.setItem(ACTIVE_KEY, JSON.stringify(t));
  else localStorage.removeItem(ACTIVE_KEY);
}

export default function Focus() {
  // Bootstrap state from localStorage if there's an active timer
  const initialActive = typeof window !== 'undefined' ? loadActive() : null;
  const initialRemaining = initialActive
    ? Math.max(0, Math.round((initialActive.endsAtMs - Date.now()) / 1000))
    : 25 * 60;

  const [mode, setMode] = useState<Mode>(initialActive?.mode ?? 'pomodoro');
  const [customMinutes, setCustomMinutes] = useState(initialActive?.customMinutes ?? 50);
  const [label, setLabel] = useState(initialActive?.label ?? 'Deep work');
  const [duration, setDuration] = useState(initialActive?.durationSeconds ?? 25 * 60);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [running, setRunning] = useState(initialActive !== null && initialRemaining > 0);
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [notifyOn, setNotifyOn] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const intervalRef = useRef<number | null>(null);
  // Track if user manually changed mode (to avoid wiping a restored timer)
  const restoredRef = useRef(initialActive !== null);

  // If we restored a timer that already finished while tab was closed, complete it now.
  useEffect(() => {
    if (initialActive && initialRemaining <= 0) {
      // Synthesize a completion record for the missed session
      const s: Session = {
        id: crypto.randomUUID(),
        mode: initialActive.mode,
        label: initialActive.label || 'Focus',
        durationSeconds: initialActive.durationSeconds,
        completedAt: new Date(initialActive.endsAtMs).toISOString(),
      };
      const next = [...loadSessions(), s];
      setSessions(next);
      saveSessions(next);
      saveActive(null);
      toast.success(
        `Welcome back — your ${Math.round(initialActive.durationSeconds / 60)}m session completed while you were away.`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESC exits fullscreen
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && fullscreen) setFullscreen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  // Pick duration whenever mode/customMinutes changes — but skip if we just restored an active timer
  useEffect(() => {
    if (restoredRef.current) {
      restoredRef.current = false;
      return;
    }
    let mins: number;
    if (mode === 'custom') mins = Math.max(1, Math.min(180, customMinutes));
    else mins = presets.find((p) => p.mode === mode)!.minutes;
    setDuration(mins * 60);
    setRemaining(mins * 60);
    setRunning(false);
    saveActive(null);
  }, [mode, customMinutes]);

  // Tick — uses wall-clock so paused tabs catch up correctly when refocused
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      const active = loadActive();
      if (!active) {
        setRunning(false);
        return;
      }
      const left = Math.max(0, Math.round((active.endsAtMs - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        completeSession();
      }
    }, 500);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Re-sync immediately when tab regains focus (handles long sleeps)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      const active = loadActive();
      if (!active) return;
      const left = Math.max(0, Math.round((active.endsAtMs - Date.now()) / 1000));
      setRemaining(left);
      setRunning(left > 0);
      if (left <= 0) completeSession();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page title shows countdown
  useEffect(() => {
    if (running) {
      document.title = `${formatTime(remaining)} — DisciplineX`;
    } else {
      document.title = 'Focus — DisciplineX';
    }
    return () => {
      document.title = 'DisciplineX';
    };
  }, [remaining, running]);

  function completeSession() {
    setRunning(false);
    saveActive(null);
    const s: Session = {
      id: crypto.randomUUID(),
      mode,
      label: label || presets.find((p) => p.mode === mode)?.label || 'Focus',
      durationSeconds: duration,
      completedAt: new Date().toISOString(),
    };
    const next = [...sessions, s];
    setSessions(next);
    saveSessions(next);

    // Sound beep
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.setValueAtTime(880, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      o.start();
      o.stop(ctx.currentTime + 0.65);
    } catch {
      /* sound is best-effort */
    }

    // Browser notification
    if (notifyOn && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Focus session complete', {
          body: `${Math.round(duration / 60)} min · ${s.label}`,
        });
      } catch {
        /* notifications best-effort */
      }
    }

    toast.success(`Session complete · +${Math.round(duration / 60)} min focus`);
  }

  async function toggleNotify() {
    if (!('Notification' in window)) {
      toast.error('Browser notifications not supported');
      return;
    }
    if (Notification.permission === 'granted') {
      setNotifyOn((v) => !v);
      return;
    }
    const p = await Notification.requestPermission();
    if (p === 'granted') {
      setNotifyOn(true);
      toast.success('Notifications enabled');
    } else {
      toast.error('Notifications denied');
    }
  }

  function reset() {
    setRunning(false);
    setRemaining(duration);
    saveActive(null);
  }

  function start() {
    const endsAtMs = Date.now() + remaining * 1000;
    saveActive({ mode, customMinutes, label, durationSeconds: duration, endsAtMs });
    setRunning(true);
  }

  function pause() {
    setRunning(false);
    // Snapshot the remaining time as a fresh duration so resume continues correctly
    saveActive(null);
    setDuration(remaining);
  }

  function toggleRun() {
    if (running) pause();
    else start();
  }

  function clearHistory() {
    if (!confirm('Clear all focus session history?')) return;
    setSessions([]);
    saveSessions([]);
  }

  // Today's stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => s.completedAt.slice(0, 10) === todayStr);
  const todayMinutes = Math.round(todaySessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60);

  const progress = ((duration - remaining) / duration) * 100;

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-ink-950 grid place-items-center">
        <div className="absolute inset-0 bg-aurora opacity-40 animate-gradient-x [background-size:200%_200%] pointer-events-none" />
        <button
          onClick={() => setFullscreen(false)}
          className="absolute top-6 right-6 w-11 h-11 grid place-items-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition z-10"
          title="Exit fullscreen (Esc)"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
        <div className="relative text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-6">
            {label || presets.find((p) => p.mode === mode)?.label}
          </div>
          <div className="relative grid place-items-center mb-8">
            <div className="scale-[2] origin-center">
              <RingProgress percent={progress} />
            </div>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-9xl md:text-[12rem] font-display font-bold tabular-nums leading-none neon-text">
                {formatTime(remaining)}
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-32">
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>
            <Button onClick={() => toggleRun()} className="px-12">
              {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {running ? 'Pause' : 'Start'}
            </Button>
          </div>
          <div className="mt-8 text-xs text-white/30">
            Press <kbd className="px-2 py-0.5 bg-white/10 rounded">Esc</kbd> to exit
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <TimerIcon className="w-7 h-7 text-neon-violet" /> Focus Timer
          </h1>
          <p className="text-white/60 mt-1">
            Pomodoro · custom durations · sessions auto-logged · submit as proof.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="glass px-4 py-2">
            <span className="text-white/50">Today: </span>
            <span className="font-mono font-semibold">{todayMinutes}</span>
            <span className="text-white/50"> min</span>
            <span className="text-white/30 mx-2">·</span>
            <span className="font-mono font-semibold">{todaySessions.length}</span>
            <span className="text-white/50"> sessions</span>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Big timer */}
        <Card className="lg:col-span-2 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-neon-violet/20 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-4 gap-2 mb-6">
            {presets.map((p) => (
              <ModeButton
                key={p.mode}
                active={mode === p.mode}
                onClick={() => setMode(p.mode)}
                icon={p.icon}
                label={p.label}
                sub={`${p.minutes} min`}
              />
            ))}
            <ModeButton
              active={mode === 'custom'}
              onClick={() => setMode('custom')}
              icon={Zap}
              label="Custom"
              sub={`${customMinutes} min`}
            />
          </div>

          {mode === 'custom' && (
            <div className="mb-6 flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={180}
                step={5}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Number(e.target.value))}
                className="flex-1 accent-neon-violet"
              />
              <input
                type="number"
                min={1}
                max={180}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Number(e.target.value) || 1)}
                className="input w-24 text-center"
              />
              <span className="text-sm text-white/50">min</span>
            </div>
          )}

          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What are you working on?"
            className="input mb-6"
          />

          <div className="relative grid place-items-center py-8">
            <RingProgress percent={progress} />
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-7xl md:text-8xl font-display font-bold tabular-nums leading-none">
                  {formatTime(remaining)}
                </div>
                <div className="mt-2 text-xs uppercase tracking-widest text-white/40">
                  {running ? 'in session' : 'paused'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3 mt-2 flex-wrap">
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>
            <Button onClick={() => toggleRun()} className="px-8">
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {running ? 'Pause' : 'Start'}
            </Button>
            <Button variant="ghost" onClick={toggleNotify}>
              {notifyOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {notifyOn ? 'Notify on' : 'Notify off'}
            </Button>
            <Button variant="ghost" onClick={() => setFullscreen(true)}>
              <Maximize2 className="w-4 h-4" /> Distraction blocker
            </Button>
          </div>
        </Card>

        {/* Sessions log */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Today's sessions</h2>
            {sessions.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-white/50 hover:text-red-300 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          {todaySessions.length === 0 ? (
            <div className="text-center py-10 text-white/40 text-sm">
              No sessions yet today.
              <br />
              Start one and ship something.
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-auto">
              <AnimatePresence>
                {[...todaySessions].reverse().map((s) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="w-8 h-8 rounded-lg bg-neon-violet/20 grid place-items-center shrink-0">
                      <Brain className="w-4 h-4 text-neon-violet" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{s.label}</div>
                      <div className="text-xs text-white/40">
                        {format(new Date(s.completedAt), 'p')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {Math.round(s.durationSeconds / 60)}m
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {todaySessions.length > 0 && (
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setSubmitOpen(true)}
            >
              <Upload className="w-4 h-4" /> Submit as task proof
            </Button>
          )}
        </Card>
      </div>

      <SubmitFocusModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        sessions={todaySessions}
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Brain;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-3 rounded-xl border text-left transition',
        active
          ? 'bg-neon-violet/15 border-neon-violet/40 shadow-glow'
          : 'bg-white/5 border-white/10 hover:bg-white/10',
      )}
    >
      <Icon className="w-4 h-4 mb-1" />
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-white/50">{sub}</div>
    </button>
  );
}

function RingProgress({ percent }: { percent: number }) {
  const r = 130;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c;
  return (
    <svg width={300} height={300} viewBox="0 0 300 300" className="block">
      <defs>
        <linearGradient id="ringg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle
        cx="150"
        cy="150"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="14"
      />
      <circle
        cx="150"
        cy="150"
        r={r}
        fill="none"
        stroke="url(#ringg)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 150 150)"
        style={{ transition: 'stroke-dashoffset 0.4s ease-out' }}
      />
    </svg>
  );
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function SubmitFocusModal({
  open,
  onClose,
  sessions,
}: {
  open: boolean;
  onClose: () => void;
  sessions: Session[];
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    api
      .get<{ task: Task; submission: unknown }[]>('/tasks/today/with-status')
      .then((r) => {
        const ts = r.data.map((x) => x.task);
        setTasks(ts);
        if (ts.length && !taskId) setTaskId(ts[0].id);
      })
      .catch(() => setTasks([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totalMin = useMemo(
    () => Math.round(sessions.reduce((s, x) => s + x.durationSeconds, 0) / 60),
    [sessions],
  );

  const summary = useMemo(() => {
    const lines = [
      `Focus log — ${totalMin} min across ${sessions.length} session(s):`,
      ...sessions.map(
        (s) =>
          `  • ${format(new Date(s.completedAt), 'p')} — ${Math.round(s.durationSeconds / 60)}m — ${s.label}`,
      ),
    ];
    return lines.join('\n');
  }, [sessions, totalMin]);

  async function submit() {
    if (!taskId) {
      toast.error('Pick a task');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('task_id', taskId);
      fd.append('proof_type', 'stopwatch');
      fd.append('notes', summary);
      await api.post('/submissions/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Focus log submitted as proof');
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Submit focus log as proof" size="lg">
      <div className="space-y-4">
        <div>
          <label className="label">Pick today's task</label>
          {tasks.length === 0 ? (
            <div className="text-sm text-white/50 p-3 rounded-lg bg-white/5 border border-white/10">
              No tasks for today. Ask your admin to publish one.
            </div>
          ) : (
            <select
              className="input"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="label">Proof summary (auto-generated from sessions)</label>
          <pre className="input min-h-[150px] whitespace-pre-wrap font-mono text-xs leading-relaxed">
            {summary}
          </pre>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting} disabled={tasks.length === 0}>
            <Upload className="w-4 h-4" /> Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
}
