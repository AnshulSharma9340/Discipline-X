import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2, UserPlus, Check, X, Heart, LogOut, Flame, Zap } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import type { Buddy, BuddyCandidate, IncomingBuddyRequest } from '@/types';

export default function BuddyPage() {
  const [buddy, setBuddy] = useState<Buddy | null>(null);
  const [incoming, setIncoming] = useState<IncomingBuddyRequest[]>([]);
  const [candidates, setCandidates] = useState<BuddyCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [b, inc, cand] = await Promise.all([
        api.get<Buddy | null>('/buddy/me'),
        api.get<IncomingBuddyRequest[]>('/buddy/incoming'),
        api.get<BuddyCandidate[]>('/buddy/candidates'),
      ]);
      setBuddy(b.data);
      setIncoming(inc.data);
      setCandidates(cand.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function request(targetId: string) {
    setBusy(targetId);
    try {
      await api.post('/buddy/request', { target_user_id: targetId });
      toast.success('Buddy request sent');
      load();
    } finally {
      setBusy(null);
    }
  }

  async function accept(pairId: string) {
    setBusy(pairId);
    try {
      await api.post(`/buddy/${pairId}/accept`);
      toast.success('Buddy paired');
      load();
    } finally {
      setBusy(null);
    }
  }

  async function reject(pairId: string) {
    setBusy(pairId);
    try {
      await api.post(`/buddy/${pairId}/reject`);
      toast.success('Rejected');
      load();
    } finally {
      setBusy(null);
    }
  }

  async function end() {
    if (!confirm('End the buddy pairing?')) return;
    setBusy('end');
    try {
      await api.post('/buddy/end');
      toast.success('Pairing ended');
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Heart className="w-7 h-7 text-neon-pink" /> Accountability Buddy
        </h1>
        <p className="text-white/60 mt-1">
          Pair with one person. See their daily. They see yours. No excuses.
        </p>
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : buddy ? (
        <Card className="relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-neon-pink/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-5 flex-wrap">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-pink to-neon-violet grid place-items-center text-3xl font-display font-bold shadow-glow">
              {buddy.buddy.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-white/50 mb-1">Your buddy</div>
              <h2 className="text-2xl font-display font-bold">{buddy.buddy.name}</h2>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <span className="inline-flex items-center gap-1 text-orange-300">
                  <Flame className="w-4 h-4" /> {buddy.buddy.streak}d
                </span>
                <span className="inline-flex items-center gap-1 text-neon-violet">
                  <Zap className="w-4 h-4" /> {buddy.buddy.xp.toLocaleString()} XP
                </span>
                <span className="text-white/50">Lv {buddy.buddy.level}</span>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs uppercase tracking-wider text-white/40">Today</div>
                <div className="text-2xl font-display font-bold mt-0.5">
                  {buddy.buddy.approved_today}{' '}
                  <span className="text-sm text-white/50 font-normal">approved task(s)</span>
                </div>
              </div>
              <div className="text-xs text-white/40 mt-3">
                Paired since {format(new Date(buddy.since), 'MMM d, yyyy')}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link to={`/u/${buddy.buddy.user_id}`} className="btn-ghost">
                View profile
              </Link>
              <Button variant="danger" loading={busy === 'end'} onClick={end}>
                <LogOut className="w-4 h-4" /> End pairing
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {incoming.length > 0 && (
            <div>
              <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3">
                Incoming requests
              </h2>
              <div className="space-y-2">
                {incoming.map((r) => (
                  <Card key={r.pair_id}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink to-neon-violet grid place-items-center font-semibold">
                          {r.from.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{r.from.name}</div>
                          <div className="text-xs text-white/50">
                            Lv {r.from.level} · {r.from.xp.toLocaleString()} XP
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="danger" loading={busy === r.pair_id} onClick={() => reject(r.pair_id)}>
                          <X className="w-4 h-4" /> Reject
                        </Button>
                        <Button loading={busy === r.pair_id} onClick={() => accept(r.pair_id)}>
                          <Check className="w-4 h-4" /> Accept
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Card className="text-center py-10">
            <div className="text-5xl mb-3">🤝</div>
            <div className="font-display font-semibold text-lg">No buddy yet</div>
            <p className="text-sm text-white/50 max-w-md mx-auto mt-1">
              Pick someone below to send a buddy request. They'll get pinged.
            </p>
          </Card>

          <div>
            <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3">
              Available users
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {candidates.map((c) => (
                <Card key={c.user_id}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan grid place-items-center font-semibold">
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-xs text-white/50">
                        Lv {c.level} · {c.streak}d streak
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      loading={busy === c.user_id}
                      onClick={() => request(c.user_id)}
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      <Card className="bg-white/5">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-neon-cyan mt-0.5 shrink-0" />
          <div className="text-sm text-white/70">
            <strong className="text-white">How it works:</strong> Pair with one person. You see
            their daily approved tasks; they see yours. When one of you skips, the other notices —
            that quiet pressure is the whole point.
          </div>
        </div>
      </Card>
    </div>
  );
}
