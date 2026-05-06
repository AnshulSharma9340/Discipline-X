import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, Loader2, LogOut, Flame, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/cn';
import type { Squad, SquadDetail, SquadRanking } from '@/types';

export default function Squads() {
  const me = useAuth((s) => s.user);
  const [mySquad, setMySquad] = useState<SquadDetail | null>(null);
  const [allSquads, setAllSquads] = useState<Squad[]>([]);
  const [leaderboard, setLeaderboard] = useState<SquadRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [mine, all, lb] = await Promise.all([
        api.get<SquadDetail | null>('/squads/me'),
        api.get<Squad[]>('/squads/'),
        api.get<SquadRanking[]>('/squads/leaderboard'),
      ]);
      setMySquad(mine.data);
      setAllSquads(all.data);
      setLeaderboard(lb.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function join(squadId: string) {
    setBusy(squadId);
    try {
      await api.post(`/squads/${squadId}/join`);
      toast.success('Joined squad');
      load();
    } finally {
      setBusy(null);
    }
  }

  async function leave() {
    if (!confirm('Leave squad?')) return;
    setBusy('leave');
    try {
      await api.post('/squads/leave');
      toast.success('Left squad');
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Users className="w-7 h-7 text-neon-cyan" /> Squads
        </h1>
        <p className="text-white/60 mt-1">
          Sub-teams within the workspace. Compete by team. Lift each other up.
        </p>
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : (
        <>
          {mySquad ? (
            <Card className="relative overflow-hidden bg-gradient-to-br from-white/5 to-transparent">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-4">
                  <div className="text-5xl">{mySquad.emoji}</div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
                      Your squad
                    </div>
                    <h2 className="text-2xl font-display font-bold">{mySquad.name}</h2>
                    {mySquad.description && (
                      <p className="text-sm text-white/60 mt-1">{mySquad.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/50">
                      <span>{mySquad.member_count} members</span>
                      <span className="inline-flex items-center gap-1 text-orange-300">
                        <Flame className="w-3 h-3" /> {mySquad.streak}d
                      </span>
                      {mySquad.group_streak_mode && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          group streak mode
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" loading={busy === 'leave'} onClick={leave}>
                  <LogOut className="w-4 h-4" /> Leave
                </Button>
              </div>

              <div className="mt-6">
                <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">
                  Roster (sorted by XP)
                </h3>
                <div className="space-y-2">
                  {mySquad.members.map((m, i) => {
                    const isMe = m.user_id === me?.id;
                    return (
                      <div
                        key={m.user_id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border border-white/5',
                          isMe && 'bg-neon-violet/5 border-neon-violet/20',
                        )}
                      >
                        <div className="w-7 text-center text-white/40 font-mono text-sm">
                          #{i + 1}
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan grid place-items-center text-sm font-semibold">
                          {m.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {m.name}{' '}
                            {isMe && <span className="text-neon-violet text-xs">(you)</span>}
                            {m.role === 'captain' && (
                              <Crown className="inline w-3.5 h-3.5 ml-1 text-amber-400" />
                            )}
                          </div>
                          <div className="text-xs text-white/50">Lv {m.level}</div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="font-mono text-neon-violet">
                            {m.xp.toLocaleString()} XP
                          </div>
                          <div className="text-orange-300 inline-flex items-center gap-1">
                            <Flame className="w-3 h-3" /> {m.streak}d
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="text-center py-12">
              <div className="text-5xl mb-3">⚔️</div>
              <div className="font-display font-semibold text-lg">You're not in a squad yet</div>
              <p className="text-sm text-white/50 max-w-md mx-auto mt-1">
                Pick a squad below. You can switch later.
              </p>
            </Card>
          )}

          <div>
            <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3 mt-6">
              Squad leaderboard
            </h2>
            {leaderboard.length === 0 ? (
              <Card className="text-center py-8 text-white/50">
                No squads exist yet. Ask your admin to create one.
              </Card>
            ) : (
              <Card className="p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-white/50 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left p-3 font-medium w-16">#</th>
                      <th className="text-left p-3 font-medium">Squad</th>
                      <th className="text-right p-3 font-medium">Members</th>
                      <th className="text-right p-3 font-medium">Total XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((s) => (
                      <tr key={s.squad_id} className="border-t border-white/5">
                        <td className="p-3 font-mono text-white/60">#{s.rank}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{s.emoji}</span>
                            <span className="font-medium">{s.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right text-white/70">{s.member_count}</td>
                        <td className="p-3 text-right font-mono text-neon-violet">
                          {s.total_xp.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>

          {!mySquad && allSquads.length > 0 && (
            <div>
              <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3 mt-6">
                Available squads
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {allSquads.map((s) => (
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
                        </div>
                      </div>
                      <Button
                        loading={busy === s.id}
                        onClick={() => join(s.id)}
                      >
                        Join
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {me?.role === 'admin' && (
        <Card className="bg-neon-violet/5 border-neon-violet/20">
          <div className="text-xs uppercase tracking-wider text-neon-violet mb-1">Admin</div>
          <div className="font-display font-semibold mb-1">Manage squads</div>
          <p className="text-sm text-white/60 mb-3">
            Create, rename, and delete squads from the admin panel.
          </p>
          <a href="/admin/squads" className="btn-primary inline-flex">
            <Zap className="w-4 h-4" /> Open admin
          </a>
        </Card>
      )}
    </div>
  );
}
