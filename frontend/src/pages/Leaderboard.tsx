import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Flame, Crown, Medal, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { UserAvatar, UserTitle } from '@/components/ui/UserChip';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/cn';
import type { LeaderboardEntry } from '@/types';

type Period = 'all' | 'daily' | 'weekly' | 'monthly' | 'streak';

const periods: { value: Period; label: string }[] = [
  { value: 'all', label: 'All-time' },
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This week' },
  { value: 'monthly', label: 'This month' },
  { value: 'streak', label: 'Streak' },
];

export default function Leaderboard() {
  const me = useAuth((s) => s.user);
  const [period, setPeriod] = useState<Period>('all');
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<LeaderboardEntry[]>('/leaderboard/', { params: { period } })
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false));
  }, [period]);

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Trophy className="w-7 h-7 text-amber-400" /> Leaderboard
          </h1>
          <p className="text-white/60 mt-1">Compete daily. Win the room.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition',
                period === p.value
                  ? 'bg-neon-violet/20 border border-neon-violet/40'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="text-center py-12 text-white/50">
          No data yet — invite people, ship some tasks, and watch the board come alive.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[1, 0, 2].map((i) => {
              const e = podium[i];
              if (!e) return <div key={i} />;
              const heights = [1, 2, 0]; // tallest in middle
              return (
                <motion.div
                  key={e.user_id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    'glass p-5 text-center relative overflow-hidden',
                    i === 0 && 'shadow-glow border-amber-500/30',
                    heights[i] === 2 && 'lg:scale-105 lg:-translate-y-2',
                  )}
                >
                  {i === 0 ? (
                    <Crown className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                  ) : (
                    <Medal className="w-6 h-6 text-white/60 mx-auto mb-1" />
                  )}
                  <div className="text-xs text-white/50 uppercase tracking-wider">#{e.rank}</div>
                  <Link to={`/u/${e.user_id}`} className="mt-3 inline-flex flex-col items-center gap-1.5 group">
                    <UserAvatar
                      name={e.name}
                      avatarUrl={e.avatar_url}
                      frameCode={e.active_frame}
                      size="lg"
                      brandFallback
                      className="group-hover:scale-105 transition"
                    />
                    <div className="font-display font-semibold mt-1 truncate max-w-full">{e.name}</div>
                    {e.active_title ? <UserTitle code={e.active_title} inline /> : null}
                  </Link>
                  <div className="text-2xl font-display font-bold neon-text mt-2">
                    {period === 'streak' ? `${e.streak}d` : e.xp.toLocaleString()}
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    {period === 'streak' ? 'streak' : 'XP'}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {rest.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/5 border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left p-3 font-medium w-16">Rank</th>
                    <th className="text-left p-3 font-medium">Operator</th>
                    <th className="text-right p-3 font-medium">XP</th>
                    <th className="text-right p-3 font-medium">Discipline</th>
                    <th className="text-right p-3 font-medium">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((e) => {
                    const isMe = e.user_id === me?.id;
                    return (
                      <tr
                        key={e.user_id}
                        className={cn(
                          'border-b border-white/5 hover:bg-white/[0.03]',
                          isMe && 'bg-white/[0.04]',
                        )}
                        style={
                          isMe
                            ? { boxShadow: 'inset 3px 0 0 0 rgb(var(--accent))' }
                            : undefined
                        }
                      >
                        <td className="p-3 font-mono text-white/60">#{e.rank}</td>
                        <td className="p-3">
                          <Link
                            to={`/u/${e.user_id}`}
                            className="flex items-center gap-3 group"
                          >
                            <UserAvatar
                              name={e.name}
                              avatarUrl={e.avatar_url}
                              frameCode={e.active_frame}
                              size="md"
                              brandFallback
                              className="group-hover:scale-105 transition"
                            />
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {e.name}
                                {isMe && (
                                  <span
                                    className="text-xs ml-1"
                                    style={{ color: 'rgb(var(--accent))' }}
                                  >
                                    (you)
                                  </span>
                                )}
                              </div>
                              {e.active_title ? (
                                <UserTitle code={e.active_title} inline />
                              ) : null}
                            </div>
                          </Link>
                        </td>
                        <td className="p-3 text-right font-mono">{e.xp.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-cyan-300">
                          {e.discipline_score}
                        </td>
                        <td className="p-3 text-right font-mono">
                          <span className="inline-flex items-center gap-1 text-orange-300">
                            <Flame className="w-3.5 h-3.5" /> {e.streak}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
