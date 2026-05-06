import { useEffect, useState } from 'react';
import { Shield, Users, ClipboardCheck, AlertTriangle, Loader2, Activity, Database, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Overview {
  total_users: number;
  locked_users: number;
  pending_submissions: number;
  avg_discipline: number;
  submissions_today: number;
}

export default function AdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [seeding, setSeeding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<Overview>('/analytics/admin/overview');
      setData(r.data);
    } finally {
      setLoading(false);
    }
  }

  async function runCheck() {
    setRunning(true);
    try {
      const r = await api.post('/emergency/trigger-discipline-check');
      toast.success(
        `Checked ${r.data.checked} users — ${r.data.locked} locked, ${r.data.passed} passed`,
      );
      load();
    } finally {
      setRunning(false);
    }
  }

  async function seedData() {
    if (!confirm('Backfill 30 days of realistic analytics for all non-admin users? Skips existing rows.')) return;
    setSeeding(true);
    try {
      const r = await api.post('/dev/seed-analytics', null, { params: { days: 30 } });
      toast.success(`Seeded ${r.data.seeded_users} users with ${r.data.days} days of data`);
      load();
    } finally {
      setSeeding(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan grid place-items-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Admin Console</h1>
            <p className="text-white/60 text-sm">Run the room. Verify proof. Set the bar.</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/admin/ai-tasks" className="btn-ghost">
            <Sparkles className="w-4 h-4" /> AI Task Gen
          </Link>
          <Button variant="ghost" loading={seeding} onClick={seedData}>
            <Database className="w-4 h-4" /> Seed sample data
          </Button>
          <Button variant="ghost" loading={running} onClick={runCheck}>
            <Activity className="w-4 h-4" /> Discipline check
          </Button>
        </div>
      </motion.div>

      {loading || !data ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Active Users" value={data.total_users} icon={Users} accent="violet" />
            <StatCard
              label="Pending Reviews"
              value={data.pending_submissions}
              icon={ClipboardCheck}
              accent="cyan"
            />
            <StatCard
              label="Locked Today"
              value={data.locked_users}
              icon={AlertTriangle}
              accent="pink"
            />
            <StatCard
              label="Avg Discipline"
              value={data.avg_discipline.toFixed(0)}
              icon={Shield}
              accent="lime"
            />
            <StatCard
              label="Submissions Today"
              value={data.submissions_today}
              icon={Activity}
              accent="violet"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-lg font-display font-semibold mb-1">Submission Queue</h2>
              <p className="text-sm text-white/50">
                {data.pending_submissions} awaiting your review.
              </p>
              <a
                href="/admin/submissions"
                className="inline-flex items-center gap-1 mt-4 text-neon-violet hover:text-neon-cyan text-sm"
              >
                Open queue →
              </a>
            </Card>
            <Card>
              <h2 className="text-lg font-display font-semibold mb-1">Locked Users</h2>
              <p className="text-sm text-white/50">
                {data.locked_users} users currently locked. Review emergency requests to restore
                access.
              </p>
              <a
                href="/admin/emergency"
                className="inline-flex items-center gap-1 mt-4 text-neon-violet hover:text-neon-cyan text-sm"
              >
                Emergency queue →
              </a>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
