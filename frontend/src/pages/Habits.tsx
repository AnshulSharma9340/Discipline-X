import { useEffect, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Flame, Loader2, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import type { Habit } from '@/types';

const COLORS = [
  { code: 'violet', class: 'from-neon-violet to-neon-indigo' },
  { code: 'cyan', class: 'from-neon-cyan to-neon-violet' },
  { code: 'pink', class: 'from-neon-pink to-neon-violet' },
  { code: 'lime', class: 'from-neon-lime to-neon-cyan' },
  { code: 'amber', class: 'from-amber-400 to-orange-500' },
];

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('violet');
  const [target, setTarget] = useState(7);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<Habit[]>('/habits/');
      setHabits(r.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/habits/', { name, color, target_per_week: target });
      toast.success('Habit added');
      setName('');
      setColor('violet');
      setTarget(7);
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(h: Habit, dateIso: string) {
    // Optimistic
    setHabits((prev) =>
      prev.map((x) =>
        x.id === h.id
          ? {
              ...x,
              week: x.week.map((d) =>
                d.date === dateIso ? { ...d, done: !d.done } : d,
              ),
            }
          : x,
      ),
    );
    try {
      await api.post(`/habits/${h.id}/toggle`, null, { params: { on: dateIso } });
      load();
    } catch {
      load();
    }
  }

  async function remove(h: Habit) {
    if (!confirm(`Delete habit "${h.name}"?`)) return;
    await api.delete(`/habits/${h.id}`);
    toast.success('Deleted');
    load();
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
            <Check className="w-7 h-7 text-neon-violet" /> Daily Habits
          </h1>
          <p className="text-white/60 mt-1">
            Identity is built one rep at a time. Tap each day's box.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" /> New habit
        </Button>
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : habits.length === 0 ? (
        <Card className="text-center py-12">
          <div className="font-display font-semibold text-lg">No habits tracked yet</div>
          <p className="text-sm text-white/50 max-w-md mx-auto mt-1 mb-4">
            Add a daily habit — sleep 8h, no scroll until noon, gym, water, whatever you're
            building.
          </p>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> Add first habit
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {habits.map((h) => {
              const done = h.week.filter((d) => d.done).length;
              const onTrack = done >= h.target_per_week - 1;
              const colorCls = COLORS.find((c) => c.code === h.color)?.class ?? COLORS[0].class;

              return (
                <motion.div
                  key={h.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="glass p-5"
                >
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl bg-gradient-to-br grid place-items-center text-white shadow-glow',
                          colorCls,
                        )}
                      >
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-display font-semibold">{h.name}</div>
                        <div className="text-xs text-white/50 inline-flex items-center gap-2">
                          <span>
                            {done} / {h.target_per_week} this week
                          </span>
                          {h.current_streak > 0 && (
                            <span className="inline-flex items-center gap-1 text-orange-300">
                              <Flame className="w-3 h-3" /> {h.current_streak}d
                            </span>
                          )}
                          {onTrack && (
                            <span className="text-emerald-300">on track</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => remove(h)}
                      className="w-8 h-8 grid place-items-center rounded-lg hover:bg-red-500/20 transition"
                    >
                      <Trash2 className="w-4 h-4 text-white/50" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {h.week.map((d) => {
                      const date = new Date(d.date);
                      const isToday = d.date === new Date().toISOString().slice(0, 10);
                      return (
                        <button
                          key={d.date}
                          onClick={() => toggle(h, d.date)}
                          className={cn(
                            'aspect-square rounded-xl border transition relative grid place-items-center',
                            d.done
                              ? `bg-gradient-to-br ${colorCls} border-white/20 shadow-glow`
                              : 'bg-white/5 border-white/10 hover:bg-white/10',
                            isToday && !d.done && 'ring-1 ring-neon-violet/40',
                          )}
                        >
                          <div className="text-[10px] uppercase text-white/60 absolute top-1 left-1.5">
                            {format(date, 'EEE')[0]}
                          </div>
                          <div className="text-sm font-semibold">{format(date, 'd')}</div>
                          {d.done && (
                            <Check className="w-4 h-4 absolute bottom-1 right-1 text-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New habit">
        <form onSubmit={create} className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Sleep 8h, No scroll till noon, Gym"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setColor(c.code)}
                  className={cn(
                    'w-9 h-9 rounded-xl bg-gradient-to-br border transition',
                    c.class,
                    color === c.code ? 'border-white shadow-glow scale-110' : 'border-white/10',
                  )}
                />
              ))}
            </div>
          </div>
          <Input
            label="Target days per week"
            type="number"
            min={1}
            max={7}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <Plus className="w-4 h-4" /> Add habit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
