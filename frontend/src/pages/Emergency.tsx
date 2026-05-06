import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import type { EmergencyRequest } from '@/types';

const statusTone = { pending: 'amber', approved: 'green', rejected: 'red' } as const;

export default function Emergency() {
  const user = useAuth((s) => s.user);
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<EmergencyRequest[]>('/emergency/mine');
      setHistory(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (reason.length < 10) {
      toast.error('Please write at least 10 characters explaining the situation');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/emergency/', { reason });
      toast.success('Request sent. Admin will review.');
      setReason('');
      load();
    } finally {
      setSubmitting(false);
    }
  }

  const isLocked = user?.access_status === 'locked';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
          Emergency Override
        </h1>
        <p className="text-white/60 mt-1">
          Stuff happens. Submit an honest reason and your admin can temporarily restore access.
        </p>
      </motion.div>

      {isLocked && (
        <Card className="border-red-500/30 shadow-[0_0_30px_-12px_rgba(239,68,68,0.4)]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 grid place-items-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-300" />
            </div>
            <div>
              <div className="font-display font-semibold text-red-300">
                Your account is locked
              </div>
              <p className="text-sm text-white/70 mt-1">
                You missed required tasks. Submit an emergency request below to regain access.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-display font-semibold text-lg mb-3">New request</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <textarea
            className="input min-h-[140px] resize-y"
            placeholder="Be honest. What happened? When can you catch up?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={2000}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">{reason.length} / 2000</span>
            <Button type="submit" loading={submitting}>
              <Send className="w-4 h-4" /> Send request
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3">History</h2>
        {loading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-neon-violet" />
          </div>
        ) : history.length === 0 ? (
          <Card className="text-center py-8 text-white/50">No previous requests.</Card>
        ) : (
          <div className="space-y-3">
            {history.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                  <span className="text-xs text-white/50 inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(r.created_at), 'MMM d, p')}
                  </span>
                </div>
                <p className="text-sm">{r.reason}</p>
                {r.admin_response && (
                  <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                    <div className="text-xs uppercase tracking-wider text-white/40 mb-1">
                      Admin response
                    </div>
                    {r.admin_response}
                  </div>
                )}
                {r.unlock_until && new Date(r.unlock_until) > new Date() && (
                  <div className="mt-2 text-xs text-emerald-300">
                    Access restored until {format(new Date(r.unlock_until), 'MMM d, p')}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
