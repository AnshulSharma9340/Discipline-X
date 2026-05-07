import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Check,
  RefreshCw,
  Code2,
  GraduationCap,
  Briefcase,
  Dumbbell,
  PenLine,
  Brain,
  Heart,
  Leaf,
  Music,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

interface GeneratedTask {
  title: string;
  description: string;
  difficulty: string;
  points: number;
  is_required: boolean;
  proof_required: boolean;
  proof_instructions: string;
  task_date: string;
  deadline: string;
}

interface Profile {
  code: string;
  label: string;
  task_count: number;
}

// Visual association for known profile codes — falls back to Sparkles otherwise.
const PROFILE_ICON: Record<string, typeof Sparkles> = {
  general: Sparkles,
  coding: Code2,
  developer: Code2,
  student: GraduationCap,
  study: GraduationCap,
  work: Briefcase,
  professional: Briefcase,
  fitness: Dumbbell,
  gym: Dumbbell,
  writing: PenLine,
  research: Brain,
  wellness: Heart,
  meditation: Leaf,
  creative: Music,
};

function iconFor(code: string) {
  const k = code.toLowerCase();
  return PROFILE_ICON[k] ?? Sparkles;
}

const DIFFICULTY_TONE: Record<string, 'cyan' | 'amber' | 'red' | 'violet' | 'green'> = {
  easy: 'green',
  medium: 'cyan',
  hard: 'amber',
  insane: 'red',
};

export default function AITaskGen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profile, setProfile] = useState('general');
  const [count, setCount] = useState(5);
  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState<number | null>(null);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [source, setSource] = useState<'groq' | 'local' | null>(null);

  useEffect(() => {
    api.get<Profile[]>('/ai/admin/profiles').then((r) => setProfiles(r.data));
  }, []);

  async function generate() {
    setGenerating(true);
    try {
      const r = await api.post<{ tasks: GeneratedTask[]; source: 'groq' | 'local' }>(
        '/ai/admin/generate-tasks',
        { profile, count, use_ai: true },
      );
      setTasks(r.data.tasks);
      setSource(r.data.source);
      setSelected(new Set(r.data.tasks.map((_, i) => i)));
    } finally {
      setGenerating(false);
    }
  }

  async function publishOne(idx: number) {
    setPublishing(idx);
    try {
      await api.post('/tasks/', tasks[idx]);
      toast.success('Published');
      const next = new Set(selected);
      next.delete(idx);
      setSelected(next);
    } finally {
      setPublishing(null);
    }
  }

  async function publishSelected() {
    setBulkPublishing(true);
    try {
      const indices = Array.from(selected);
      for (const idx of indices) {
        await api.post('/tasks/', tasks[idx]);
      }
      toast.success(`Published ${indices.length} task${indices.length > 1 ? 's' : ''}`);
      setSelected(new Set());
    } finally {
      setBulkPublishing(false);
    }
  }

  function toggle(idx: number) {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  }

  function selectAll() {
    setSelected(new Set(tasks.map((_, i) => i)));
  }
  function clearAll() {
    setSelected(new Set());
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-[11px] uppercase tracking-[0.18em] text-neon-cyan mb-3">
            <Sparkles className="w-3 h-3" /> Admin · AI
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-[-0.02em]">
            AI Task Generator
          </h1>
          <p className="text-white/55 mt-2 text-sm max-w-xl">
            Pick a profile, generate a fresh pack of daily tasks, review them, then publish
            to everyone in your org with one click.
          </p>
        </div>
      </motion.div>

      {/* Step 1 — pick a profile */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
          <span className="w-5 h-5 rounded-full bg-neon-cyan/15 border border-neon-cyan/30 grid place-items-center text-[10px] font-semibold text-neon-cyan">
            1
          </span>
          Pick a profile
        </div>

        {profiles.length === 0 ? (
          <div className="grid place-items-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-white/40" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {profiles.map((p) => {
              const Icon = iconFor(p.code);
              const isActive = profile === p.code;
              return (
                <button
                  key={p.code}
                  onClick={() => setProfile(p.code)}
                  className={cn(
                    // High-contrast selection: solid violet ring + filled tint when active.
                    'relative rounded-xl border-2 p-3 text-left transition group',
                    isActive
                      ? 'border-neon-violet bg-neon-violet/15 ring-2 ring-neon-violet/30'
                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20',
                  )}
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg grid place-items-center mb-2 transition',
                      isActive
                        ? 'bg-neon-violet/30 text-white'
                        : 'bg-white/[0.04] text-white/60 group-hover:text-white',
                    )}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div
                    className={cn(
                      'font-display font-medium text-sm leading-tight',
                      isActive ? 'text-white' : 'text-white/85',
                    )}
                  >
                    {p.label}
                  </div>
                  <div className={cn('text-[11px] mt-1', isActive ? 'text-white/70' : 'text-white/40')}>
                    {p.task_count} preset tasks
                  </div>
                  {isActive && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-neon-violet grid place-items-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Step 2 — generate */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
          <span className="w-5 h-5 rounded-full bg-neon-violet/15 border border-neon-violet/30 grid place-items-center text-[10px] font-semibold text-neon-violet">
            2
          </span>
          Generate
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="label">How many tasks?</label>
            <div className="inline-flex rounded-full bg-white/5 border border-white/10 p-1">
              {[3, 5, 7, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-semibold transition',
                    count === n
                      ? 'bg-neon-violet text-white shadow-[0_0_18px_-4px_rgba(139,92,246,0.6)]'
                      : 'text-white/55 hover:text-white hover:bg-white/[0.05]',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={generate} loading={generating}>
            <Sparkles className="w-4 h-4" />
            {tasks.length > 0 ? 'Regenerate' : 'Generate tasks'}
          </Button>
          {tasks.length > 0 && (
            <Button variant="ghost" onClick={generate}>
              <RefreshCw className="w-4 h-4" /> Reroll
            </Button>
          )}
        </div>

        {source && (
          <div
            className={cn(
              'flex items-start gap-2 text-xs px-3 py-2 rounded-lg border',
              source === 'groq'
                ? 'border-neon-cyan/30 bg-neon-cyan/[0.06] text-neon-cyan/90'
                : 'border-amber-500/30 bg-amber-500/[0.06] text-amber-200',
            )}
          >
            {source === 'groq' ? (
              <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            )}
            <span>
              {source === 'groq'
                ? 'Generated by Groq AI — fresh, contextual tasks every reroll.'
                : 'Generated from local templates. Add GROQ_API_KEY to .env for AI-generated tasks.'}
            </span>
          </div>
        )}
      </Card>

      {/* Step 3 — review & publish */}
      {tasks.length > 0 && (
        <Card className="space-y-4">
          <div className="flex items-end justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
              <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 grid place-items-center text-[10px] font-semibold text-emerald-400">
                3
              </span>
              Review & publish
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-white/50 mr-1">
                {selected.size} of {tasks.length} selected
              </span>
              <Button variant="ghost" onClick={selectAll} disabled={selected.size === tasks.length}>
                Select all
              </Button>
              <Button variant="ghost" onClick={clearAll} disabled={selected.size === 0}>
                Clear
              </Button>
              <Button
                onClick={publishSelected}
                loading={bulkPublishing}
                disabled={selected.size === 0}
              >
                <Check className="w-4 h-4" /> Publish ({selected.size})
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {tasks.map((t, idx) => {
              const isSelected = selected.has(idx);
              return (
                <button
                  key={idx}
                  onClick={() => toggle(idx)}
                  className={cn(
                    'rounded-xl border p-4 text-left transition flex items-start gap-3',
                    isSelected
                      ? 'border-neon-violet/40 bg-neon-violet/[0.06]'
                      : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]',
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 w-5 h-5 rounded border-2 grid place-items-center shrink-0 transition',
                      isSelected ? 'border-neon-violet bg-neon-violet' : 'border-white/25',
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge tone={DIFFICULTY_TONE[t.difficulty] ?? 'cyan'}>
                        {t.difficulty}
                      </Badge>
                      {t.is_required && <Badge tone="violet">required</Badge>}
                      <span className="text-xs text-white/55">+{t.points} XP</span>
                    </div>
                    <div className="font-display font-semibold leading-tight">{t.title}</div>
                    <p className="text-sm text-white/65 mt-1 leading-relaxed">{t.description}</p>
                    {t.proof_instructions && (
                      <p className="text-xs text-white/40 mt-2">
                        <span className="text-white/50">Proof: </span>
                        {t.proof_instructions}
                      </p>
                    )}
                  </div>

                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <Button
                      variant="ghost"
                      onClick={() => publishOne(idx)}
                      loading={publishing === idx}
                    >
                      Publish
                    </Button>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {tasks.length === 0 && !generating && (
        <Card className="text-center py-14 border-dashed">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 grid place-items-center mb-3">
            <Sparkles className="w-5 h-5 text-white/45" />
          </div>
          <div className="font-display font-medium">No tasks generated yet</div>
          <p className="text-sm text-white/50 mt-1 max-w-sm mx-auto">
            Pick a profile above and hit Generate. You'll get a draft pack you can review,
            edit selection, then publish in one shot.
          </p>
        </Card>
      )}
    </div>
  );
}
