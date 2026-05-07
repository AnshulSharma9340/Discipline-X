import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Flame, Zap, Target, Trophy, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { UserAvatar, UserTitle } from '@/components/ui/UserChip';
import { cn } from '@/lib/cn';
import type { PublicProfile } from '@/types';

const tierStyle = {
  bronze: 'bg-amber-700/20 text-amber-400 border-amber-500/20',
  silver: 'bg-slate-300/15 text-slate-200 border-slate-300/20',
  gold: 'bg-yellow-400/20 text-yellow-300 border-yellow-300/30',
  mythic: 'bg-neon-pink/20 text-neon-pink border-neon-pink/40 shadow-glow',
} as const;

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    api
      .get<PublicProfile>(`/profile/${userId}`)
      .then((r) => setProfile(r.data))
      .catch((e) => setError(e.response?.data?.detail || 'User not found'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
      </div>
    );
  }

  if (error || !profile) {
    return <Card className="text-center py-12 text-white/50">{error}</Card>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-aurora opacity-30 animate-gradient-x [background-size:200%_200%] pointer-events-none" />
          <div className="relative flex items-start gap-5 flex-wrap">
            <UserAvatar
              name={profile.name}
              avatarUrl={null}
              frameCode={profile.active_frame}
              size="xl"
              brandFallback
              className="shadow-glow"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-display font-bold">{profile.name}</h1>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-mono"
                  style={{
                    background: 'rgb(var(--accent) / 0.18)',
                    borderColor: 'rgb(var(--accent) / 0.35)',
                    border: '1px solid',
                  }}
                >
                  Lv {profile.level}
                </span>
              </div>
              {profile.active_title ? (
                <div className="mt-1">
                  <UserTitle code={profile.active_title} inline />
                </div>
              ) : null}
              {profile.bio && (
                <p className="text-white/70 mt-2 max-w-xl">{profile.bio}</p>
              )}
              <div className="text-xs text-white/40 mt-2 inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Joined {format(new Date(profile.joined), 'MMM yyyy')}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Streak" value={`${profile.streak}d`} icon={Flame} accent="pink" />
        <StatCard label="XP" value={profile.xp.toLocaleString()} icon={Zap} accent="violet" />
        <StatCard
          label="Tasks"
          value={profile.tasks_approved}
          icon={Target}
          accent="cyan"
        />
        <StatCard
          label="Discipline"
          value={profile.discipline_score}
          icon={Trophy}
          accent="lime"
        />
      </div>

      {profile.badges.length > 0 && (
        <Card>
          <h2 className="font-display font-semibold mb-4">
            Badges ({profile.badges.length})
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {profile.badges.map((b) => (
              <div
                key={b.code}
                className={cn(
                  'p-3 rounded-xl border text-center',
                  tierStyle[b.tier],
                )}
                title={b.description}
              >
                <div className="text-3xl">{b.emoji}</div>
                <div className="text-xs font-medium mt-1 truncate">{b.name}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
