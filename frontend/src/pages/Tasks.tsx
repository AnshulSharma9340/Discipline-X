import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { TaskCard } from '@/components/TaskCard';
import { SubmitProofModal } from '@/components/SubmitProofModal';
import { Card } from '@/components/ui/Card';
import type { Task, TaskWithSubmission } from '@/types';

export default function Tasks() {
  const [items, setItems] = useState<TaskWithSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Task | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<TaskWithSubmission[]>('/tasks/today/with-status');
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const required = items.filter((i) => i.task.is_required);
  const optional = items.filter((i) => !i.task.is_required);
  const approvedReq = required.filter((i) => i.submission?.status === 'approved').length;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-3xl font-display font-bold">Today's Mission</h1>
          <p className="text-white/60 mt-1">
            {required.length > 0
              ? `${approvedReq} of ${required.length} required tasks approved`
              : 'No tasks assigned for today'}
          </p>
        </div>
        {required.length > 0 && (
          <div className="glass px-4 py-2 text-sm inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neon-cyan" />
            Lock in everything required before midnight to keep your streak.
          </div>
        )}
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : items.length === 0 ? (
        <Card className="text-center py-16">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-white/5 border border-white/10 grid place-items-center mb-3">
            <ClipboardList className="w-6 h-6 text-white/50" />
          </div>
          <div className="font-display font-semibold text-lg">No tasks today</div>
          <p className="text-sm text-white/50 max-w-md mx-auto mt-1">
            Your admin hasn't published today's tasks yet. Check back soon — and use this time to
            prep your environment.
          </p>
        </Card>
      ) : (
        <>
          {required.length > 0 && (
            <section>
              <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3">Required</h2>
              <div className="grid lg:grid-cols-2 gap-4">
                {required.map((it) => (
                  <TaskCard
                    key={it.task.id}
                    task={it.task}
                    submission={it.submission}
                    onSubmit={() => setActive(it.task)}
                  />
                ))}
              </div>
            </section>
          )}

          {optional.length > 0 && (
            <section>
              <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3 mt-6">
                Optional
              </h2>
              <div className="grid lg:grid-cols-2 gap-4">
                {optional.map((it) => (
                  <TaskCard
                    key={it.task.id}
                    task={it.task}
                    submission={it.submission}
                    onSubmit={() => setActive(it.task)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <SubmitProofModal
        task={active}
        open={active !== null}
        onClose={() => setActive(null)}
        onSuccess={load}
      />
    </div>
  );
}
