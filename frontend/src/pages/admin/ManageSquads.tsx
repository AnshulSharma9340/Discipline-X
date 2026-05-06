import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { Squad } from '@/types';

const EMOJI_CHOICES = ['⚔️', '🦁', '🔥', '⚡', '🚀', '💎', '🌊', '🦅', '🐺', '🛡️'];

export default function ManageSquads() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('⚔️');
  const [groupMode, setGroupMode] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<Squad[]>('/squads/');
      setSquads(r.data);
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
      await api.post('/squads/', {
        name,
        description,
        emoji,
        color: 'violet',
        group_streak_mode: groupMode,
      });
      toast.success('Squad created');
      setName('');
      setDescription('');
      setEmoji('⚔️');
      setGroupMode(false);
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Squad) {
    if (!confirm(`Delete squad "${s.name}"? Members will be removed.`)) return;
    await api.delete(`/squads/${s.id}`);
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
            <Users className="w-7 h-7 text-neon-cyan" /> Manage Squads
          </h1>
          <p className="text-white/60 mt-1">Create teams. Users pick one to join.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> New squad
        </Button>
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : squads.length === 0 ? (
        <Card className="text-center py-12">
          <div className="font-display font-semibold text-lg">No squads yet</div>
          <p className="text-sm text-white/50 max-w-md mx-auto mt-1 mb-4">
            Create your first squad to enable team competition.
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Create first squad
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {squads.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start gap-3">
                <div className="text-4xl">{s.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold">{s.name}</div>
                  {s.description && (
                    <p className="text-sm text-white/60 mt-0.5">{s.description}</p>
                  )}
                  <div className="text-xs text-white/40 mt-1">
                    {s.member_count} members
                    {s.group_streak_mode && ' · group streak mode'}
                  </div>
                </div>
                <button
                  onClick={() => remove(s)}
                  className="w-8 h-8 grid place-items-center rounded-lg hover:bg-red-500/20 transition"
                >
                  <Trash2 className="w-4 h-4 text-white/50" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New squad">
        <form onSubmit={create} className="space-y-4">
          <Input
            label="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The Iron Wolves"
          />
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[60px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this squad about?"
            />
          </div>
          <div>
            <label className="label">Emoji</label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-xl border text-2xl transition ${
                    emoji === e
                      ? 'bg-neon-violet/20 border-neon-violet/40 shadow-glow'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={groupMode}
              onChange={(e) => setGroupMode(e.target.checked)}
              className="w-4 h-4 accent-neon-violet"
            />
            Group streak mode (whole squad's streak breaks if any member fails)
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <Plus className="w-4 h-4" /> Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
