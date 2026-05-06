import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ExternalLink, Loader2, FileImage } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { AdminSubmissionRow, SubmissionStatus } from '@/types';

const statusOptions: { value: SubmissionStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'submitted', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function Submissions() {
  const [rows, setRows] = useState<AdminSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SubmissionStatus | ''>('submitted');
  const [active, setActive] = useState<AdminSubmissionRow | null>(null);
  const [feedback, setFeedback] = useState('');
  const [reviewing, setReviewing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<AdminSubmissionRow[]>('/submissions/', {
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
      await api.post(`/submissions/${active.submission.id}/review`, { approve, feedback });
      toast.success(approve ? 'Approved — XP awarded' : 'Rejected');
      setActive(null);
      setFeedback('');
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
          <h1 className="text-3xl font-display font-bold">Submission Queue</h1>
          <p className="text-white/60 mt-1">Verify proof. Approve fast. Reject with feedback.</p>
        </div>
        <div className="flex gap-2">
          {statusOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => setFilter(o.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                filter === o.value
                  ? 'bg-neon-violet/20 border border-neon-violet/40'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="text-center py-12 text-white/50">No submissions in this view.</Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <Card key={r.submission.id} className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge tone={r.submission.status === 'approved' ? 'green' : r.submission.status === 'rejected' ? 'red' : 'amber'}>
                      {r.submission.status}
                    </Badge>
                    <span className="text-xs text-white/50">
                      {r.submission.submitted_at &&
                        format(new Date(r.submission.submitted_at), 'MMM d, p')}
                    </span>
                  </div>
                  <div className="font-display font-semibold">{r.task_title}</div>
                  <div className="text-sm text-white/60 mt-0.5">
                    by <span className="text-white/80">{r.user_name || r.user_email}</span>
                  </div>
                  {r.submission.notes && (
                    <p className="text-sm text-white/70 mt-2">{r.submission.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.proof_signed_url && (
                    <a
                      href={r.proof_signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost"
                    >
                      <FileImage className="w-4 h-4" /> View proof
                    </a>
                  )}
                  {r.external_url && (
                    <a href={r.external_url} target="_blank" rel="noreferrer" className="btn-ghost">
                      <ExternalLink className="w-4 h-4" /> Link
                    </a>
                  )}
                  {r.submission.status !== 'approved' && (
                    <Button
                      onClick={() => {
                        setActive(r);
                        setFeedback('');
                      }}
                    >
                      Review
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={active !== null}
        onClose={() => setActive(null)}
        title={`Review: ${active?.task_title ?? ''}`}
        size="lg"
      >
        {active && (
          <div className="space-y-4">
            <div className="text-sm text-white/70">
              Submitted by{' '}
              <span className="text-white">{active.user_name || active.user_email}</span>
            </div>

            {active.proof_signed_url && (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
                <img
                  src={active.proof_signed_url}
                  alt="proof"
                  className="w-full max-h-[60vh] object-contain"
                />
              </div>
            )}

            {active.external_url && (
              <a
                href={active.external_url}
                target="_blank"
                rel="noreferrer"
                className="text-neon-cyan inline-flex items-center gap-2 text-sm"
              >
                <ExternalLink className="w-4 h-4" /> {active.external_url}
              </a>
            )}

            {active.submission.notes && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                <div className="text-xs uppercase tracking-wider text-white/40 mb-1">
                  User notes
                </div>
                {active.submission.notes}
              </div>
            )}

            <div>
              <label className="label">Feedback (shown to user)</label>
              <textarea
                className="input min-h-[80px] resize-y"
                placeholder="Optional. Required if rejecting."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="danger" loading={reviewing} onClick={() => review(false)}>
                <XCircle className="w-4 h-4" /> Reject
              </Button>
              <Button loading={reviewing} onClick={() => review(true)}>
                <CheckCircle2 className="w-4 h-4" /> Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
