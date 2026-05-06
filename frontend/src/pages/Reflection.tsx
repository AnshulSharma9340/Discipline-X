import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Sun, Moon, Loader2, Save, Bed, Heart, Battery } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { Reflection as R } from '@/types';

const moodEmoji = ['', '😞', '😐', '🙂', '😊', '🤩'];
const energyEmoji = ['', '🪫', '🔋', '🔋', '⚡', '⚡⚡'];

export default function Reflection() {
  const [, setToday] = useState<R | null>(null);
  const [history, setHistory] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [sleep, setSleep] = useState<number | ''>('');
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [shipped, setShipped] = useState('');
  const [blocked, setBlocked] = useState('');
  const [tomorrow, setTomorrow] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [savingMorning, setSavingMorning] = useState(false);
  const [savingEvening, setSavingEvening] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [t, h] = await Promise.all([
        api.get<R>('/reflections/today'),
        api.get<R[]>('/reflections/history', { params: { days: 14 } }),
      ]);
      setToday(t.data);
      setHistory(h.data);
      setSleep(t.data.sleep_hours ?? '');
      setMood(t.data.mood);
      setEnergy(t.data.energy);
      setShipped(t.data.shipped);
      setBlocked(t.data.blocked);
      setTomorrow(t.data.tomorrow);
      setRating(t.data.rating);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveMorning() {
    setSavingMorning(true);
    try {
      await api.post('/reflections/morning', {
        sleep_hours: sleep === '' ? null : Number(sleep),
        mood,
        energy,
      });
      toast.success('Morning check-in saved');
      load();
    } finally {
      setSavingMorning(false);
    }
  }

  async function saveEvening() {
    setSavingEvening(true);
    try {
      await api.post('/reflections/evening', { shipped, blocked, tomorrow, rating });
      toast.success('Reflection saved');
      load();
    } finally {
      setSavingEvening(false);
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-neon-violet" /> Daily Reflection
        </h1>
        <p className="text-white/60 mt-1">
          Two minutes of honesty compounds into self-knowledge.
        </p>
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Morning check-in */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Sun className="w-5 h-5 text-amber-400" />
                <h2 className="font-display font-semibold text-lg">Morning check-in</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">
                    <Bed className="inline w-3.5 h-3.5 mr-1" /> Sleep last night (hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={16}
                    className="input"
                    value={sleep}
                    onChange={(e) =>
                      setSleep(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="7.5"
                  />
                </div>

                <div>
                  <label className="label">
                    <Heart className="inline w-3.5 h-3.5 mr-1" /> Mood
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMood(m)}
                        className={cn(
                          'flex-1 aspect-square text-2xl rounded-xl border transition',
                          mood === m
                            ? 'bg-neon-violet/20 border-neon-violet/40 shadow-glow'
                            : 'bg-white/5 border-white/10 hover:bg-white/10',
                        )}
                      >
                        {moodEmoji[m]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">
                    <Battery className="inline w-3.5 h-3.5 mr-1" /> Energy
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEnergy(m)}
                        className={cn(
                          'flex-1 aspect-square text-xl rounded-xl border transition',
                          energy === m
                            ? 'bg-neon-cyan/20 border-neon-cyan/40 shadow-glow-cyan'
                            : 'bg-white/5 border-white/10 hover:bg-white/10',
                        )}
                      >
                        {energyEmoji[m]}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={saveMorning} loading={savingMorning} className="w-full">
                  <Save className="w-4 h-4" /> Save morning check-in
                </Button>
              </div>
            </Card>

            {/* Evening reflection */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Moon className="w-5 h-5 text-neon-violet" />
                <h2 className="font-display font-semibold text-lg">Evening reflection</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">What did you ship today?</label>
                  <textarea
                    className="input min-h-[70px] resize-y"
                    value={shipped}
                    onChange={(e) => setShipped(e.target.value)}
                    placeholder="The wins, the deliverables..."
                  />
                </div>
                <div>
                  <label className="label">What blocked you?</label>
                  <textarea
                    className="input min-h-[60px] resize-y"
                    value={blocked}
                    onChange={(e) => setBlocked(e.target.value)}
                    placeholder="Be specific. Patterns matter."
                  />
                </div>
                <div>
                  <label className="label">Tomorrow's #1 priority</label>
                  <textarea
                    className="input min-h-[60px] resize-y"
                    value={tomorrow}
                    onChange={(e) => setTomorrow(e.target.value)}
                    placeholder="The one thing that, if done, makes tomorrow a win."
                  />
                </div>
                <div>
                  <label className="label">Rate your day (1–10)</label>
                  <div className="grid grid-cols-10 gap-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className={cn(
                          'aspect-square text-sm font-mono rounded-lg border transition',
                          rating === n
                            ? 'bg-gradient-to-br from-neon-violet to-neon-cyan border-white/20 shadow-glow'
                            : 'bg-white/5 border-white/10 hover:bg-white/10',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={saveEvening} loading={savingEvening} className="w-full">
                  <Save className="w-4 h-4" /> Save reflection
                </Button>
              </div>
            </Card>
          </div>

          {history.length > 1 && (
            <div>
              <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3">
                Last 14 days
              </h2>
              <div className="space-y-2">
                {history
                  .filter((r) => r.shipped || r.rating)
                  .slice(0, 14)
                  .map((r) => (
                    <Card key={r.date} className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium">
                          {format(new Date(r.date), 'EEE, MMM d')}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/50">
                          {r.mood && <span>Mood: {moodEmoji[r.mood]}</span>}
                          {r.sleep_hours && <span>Sleep: {r.sleep_hours}h</span>}
                          {r.rating && (
                            <span className="font-mono text-neon-violet">{r.rating}/10</span>
                          )}
                        </div>
                      </div>
                      {r.shipped && <p className="text-sm text-white/70">{r.shipped}</p>}
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
