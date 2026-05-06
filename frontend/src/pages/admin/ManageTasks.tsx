import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import type { Task, TaskDifficulty } from '@/types';

interface FormState {
  title: string;
  description: string;
  difficulty: TaskDifficulty;
  points: number;
  is_required: boolean;
  proof_required: boolean;
  proof_instructions: string;
  task_date: string;
  deadline: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const todayDeadline = () => {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d.toISOString().slice(0, 16);
};

const empty: FormState = {
  title: '',
  description: '',
  difficulty: 'medium',
  points: 10,
  is_required: true,
  proof_required: true,
  proof_instructions: '',
  task_date: today(),
  deadline: todayDeadline(),
};

export default function ManageTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Task[]>('/tasks/');
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(t: Task) {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description,
      difficulty: t.difficulty,
      points: t.points,
      is_required: t.is_required,
      proof_required: t.proof_required,
      proof_instructions: t.proof_instructions,
      task_date: t.task_date.slice(0, 10),
      deadline: t.deadline.slice(0, 16),
    });
    setOpen(true);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        task_date: new Date(form.task_date).toISOString(),
        deadline: new Date(form.deadline).toISOString(),
      };
      if (editing) {
        await api.patch(`/tasks/${editing.id}`, payload);
        toast.success('Task updated');
      } else {
        await api.post('/tasks/', payload);
        toast.success('Task published to all users');
      }
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(t: Task) {
    if (!confirm(`Delete "${t.title}"? This removes all submissions for this task.`)) return;
    await api.delete(`/tasks/${t.id}`);
    toast.success('Task deleted');
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
          <h1 className="text-3xl font-display font-bold">Manage Tasks</h1>
          <p className="text-white/60 mt-1">Tasks ship globally to every active user.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> New task
        </Button>
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : tasks.length === 0 ? (
        <Card className="text-center py-12">
          <div className="font-display font-semibold text-lg">No tasks yet</div>
          <p className="text-sm text-white/50 max-w-md mx-auto mt-1 mb-4">
            Publish your first daily task. It'll appear on every user's dashboard immediately.
          </p>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Create first task
          </Button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left p-3 font-medium">Task</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Diff</th>
                <th className="text-left p-3 font-medium">Pts</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="p-3">
                    <div className="font-medium">{t.title}</div>
                    {t.description && (
                      <div className="text-white/50 text-xs line-clamp-1 mt-0.5">
                        {t.description}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-white/70 whitespace-nowrap">
                    {format(new Date(t.task_date), 'MMM d')}
                  </td>
                  <td className="p-3 capitalize text-white/70">{t.difficulty}</td>
                  <td className="p-3 font-mono">{t.points}</td>
                  <td className="p-3">
                    {t.is_required ? <Badge tone="violet">required</Badge> : <Badge>optional</Badge>}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(t)}
                        className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/10 transition"
                      >
                        <Pencil className="w-4 h-4 text-white/70" />
                      </button>
                      <button
                        onClick={() => onDelete(t)}
                        className="w-8 h-8 grid place-items-center rounded-lg hover:bg-red-500/20 hover:text-red-300 transition"
                      >
                        <Trash2 className="w-4 h-4 text-white/70" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit task' : 'New task'}
        size="lg"
      >
        <form onSubmit={onSave} className="space-y-4">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Solve 5 DSA problems"
          />
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does success look like?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Difficulty</label>
              <select
                className="input"
                value={form.difficulty}
                onChange={(e) =>
                  setForm({ ...form, difficulty: e.target.value as TaskDifficulty })
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="insane">Insane</option>
              </select>
            </div>
            <Input
              label="Points (XP)"
              type="number"
              min={0}
              max={1000}
              value={form.points}
              onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Task date"
              type="date"
              value={form.task_date}
              onChange={(e) => setForm({ ...form, task_date: e.target.value })}
            />
            <Input
              label="Deadline"
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Proof instructions</label>
            <textarea
              className="input min-h-[60px] resize-y"
              value={form.proof_instructions}
              onChange={(e) => setForm({ ...form, proof_instructions: e.target.value })}
              placeholder="e.g. Upload a screenshot of LeetCode submissions page"
            />
          </div>
          <div className="flex gap-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
              />
              Required (counts toward streak/lockout)
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.proof_required}
                onChange={(e) => setForm({ ...form, proof_required: e.target.checked })}
              />
              Proof required
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Publish task'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
