import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { EmergencyRequest, EmergencyStatus } from '@/types';

interface Row {
  request: EmergencyRequest;
  user_name: string | null;
  user_email: string | null;
  user_locked: boolean;
}

const filters: { value: EmergencyStatus | ''; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
];

export default function EmergencyQueue() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EmergencyStatus | ''>('pending');
  const [active, setActive] = useState<Row | null>(null);
  const [response, setResponse] = useState('');
  const [hours, setHours] = useState(24);
  const [reviewing, setReviewing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Row[]>('/emergency/', {
        params: filter ? { status: filter } : {},
      });
      setRows(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function review(approve: boolean) {
    if (!active) return;
    setReviewing(true);
    try {
      await api.post(`/emergency/${active.request.id}/review`, {
        approve,
        response,
        unlock_hours: hours,
      });
      toast.success(approve ? 'Approved — user unlocked' : 'Rejected');
      setActive(null);
      setResponse('');
      load();
    } finally {
      setReviewing(false);
    }
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
            <AlertTriangle className="w-7 h-7 text-amber-400" />
            Emergency Queue
          </h1>
          <p className="text-white/60 mt-1">
            Review override requests. Approving temporarily restores access.
          </p>
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                filter === f.value
                  ? 'bg-neon-violet/20 border border-neon-violet/40'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="text-center py-12 text-white/50">No requests in this view.</Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <Card key={r.request.id}>
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    tone={
                      r.request.status === 'approved'
                        ? 'green'
                        : r.request.status === 'rejected'
                        ? 'red'
                        : 'amber'
                    }
                  >
                    {r.request.status}
                  </Badge>
                  {r.user_locked && (
                    <Badge tone="red">
                      <Lock className="w-3 h-3" /> locked
                    </Badge>
                  )}
                  <span className="text-sm text-white/70">
                    {r.user_name || r.user_email}
                  </span>
                </div>
                <span className="text-xs text-white/50">
                  {format(new Date(r.request.created_at), 'MMM d, p')}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.request.reason}</p>
              {r.request.admin_response && (
                <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                  <div className="text-xs uppercase tracking-wider text-white/40 mb-1">
                    Admin response
                  </div>
                  {r.request.admin_response}
                </div>
              )}
              {r.request.status === 'pending' && (
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      setActive(r);
                      setResponse('');
                      setHours(24);
                    }}
                  >
                    Review
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={active !== null} onClose={() => setActive(null)} title="Review request" size="lg">
        {active && (
          <div className="space-y-4">
            <div className="text-sm text-white/70">
              From <span className="text-white">{active.user_name || active.user_email}</span>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm whitespace-pre-wrap">
              {active.request.reason}
            </div>
            <div>
              <label className="label">Your response</label>
              <textarea
                className="input min-h-[100px] resize-y"
                placeholder="Optional message back to the user"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Unlock duration (hours)</label>
              <input
                type="number"
                min={1}
                max={168}
                className="input"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
              <p className="text-xs text-white/40 mt-1">
                Approving restores access for this many hours, then re-evaluates at the next cutoff.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="danger" loading={reviewing} onClick={() => review(false)}>
                <XCircle className="w-4 h-4" /> Reject
              </Button>
              <Button loading={reviewing} onClick={() => review(true)}>
                <CheckCircle2 className="w-4 h-4" /> Approve & unlock
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
