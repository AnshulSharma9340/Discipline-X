import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, Flame, Upload, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { Task, Submission } from '@/types';

const diffTone = {
  easy: 'green',
  medium: 'cyan',
  hard: 'amber',
  insane: 'red',
} as const;

const statusTone = {
  assigned: 'neutral',
  submitted: 'violet',
  under_review: 'amber',
  approved: 'green',
  rejected: 'red',
} as const;

const statusLabel = {
  assigned: 'Not started',
  submitted: 'Submitted',
  under_review: 'Reviewing',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

interface Props {
  task: Task;
  submission: Submission | null;
  onSubmit: () => void;
}

export function TaskCard({ task, submission, onSubmit }: Props) {
  const status = submission?.status ?? 'assigned';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const overdue = !isApproved && new Date(task.deadline) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={cn(
        'glass p-5 relative overflow-hidden group transition-all',
        isApproved && 'border-emerald-500/30 shadow-[0_0_30px_-12px_rgba(16,185,129,0.4)]',
        isRejected && 'border-red-500/30',
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Badge tone={diffTone[task.difficulty]}>{task.difficulty}</Badge>
            <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>
            {task.is_required && <Badge tone="violet">required</Badge>}
            {overdue && <Badge tone="red">overdue</Badge>}
          </div>
          <h3 className="text-lg font-display font-semibold leading-tight">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-white/60 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-display font-bold neon-text">+{task.points}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">XP</div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-white/50 mt-4">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {format(new Date(task.task_date), 'MMM d')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          due {format(new Date(task.deadline), 'p')}
        </span>
      </div>

      {submission?.admin_feedback && (
        <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
          <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Admin feedback</div>
          {submission.admin_feedback}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        {isApproved ? (
          <div className="inline-flex items-center gap-2 text-sm text-emerald-300">
            <CheckCircle2 className="w-4 h-4" /> Locked in. +{submission?.points_awarded} XP earned
          </div>
        ) : isRejected ? (
          <div className="inline-flex items-center gap-2 text-sm text-red-300">
            <XCircle className="w-4 h-4" /> Resubmit with corrected proof
          </div>
        ) : status === 'submitted' || status === 'under_review' ? (
          <div className="inline-flex items-center gap-2 text-sm text-amber-300">
            <Flame className="w-4 h-4" /> Awaiting admin review
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-sm text-white/50">
            <AlertCircle className="w-4 h-4" />
            {task.proof_required ? 'Proof required' : 'Self-report'}
          </div>
        )}

        {!isApproved && (
          <Button onClick={onSubmit} variant={isRejected ? 'primary' : 'ghost'}>
            <Upload className="w-4 h-4" />
            {status === 'assigned' ? 'Submit proof' : 'Update proof'}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
