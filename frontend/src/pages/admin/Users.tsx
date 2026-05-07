import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users as UsersIcon, Loader2, Flame, Zap, Crown, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

type Member = {
  user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  org_role: 'owner' | 'moderator' | 'member' | null;
  xp: number;
  level: number;
  streak: number;
  access_status: 'active' | 'locked' | 'emergency_unlocked';
  joined: string;
};

type RoleFilter = '' | 'owner' | 'moderator' | 'member';

const roleOptions: { value: RoleFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'owner', label: 'Owner' },
  { value: 'moderator', label: 'Moderators' },
  { value: 'member', label: 'Members' },
];

function statusTone(status: Member['access_status']) {
  if (status === 'active') return 'green';
  if (status === 'locked') return 'red';
  return 'amber';
}

function roleIcon(role: Member['org_role']) {
  if (role === 'owner') return <Crown className="w-3.5 h-3.5" />;
  if (role === 'moderator') return <Shield className="w-3.5 h-3.5" />;
  return null;
}

export default function Users() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RoleFilter>('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await api.get<Member[]>('/orgs/me/members');
        if (!cancelled) setMembers(res.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = members.filter((m) => {
    if (filter && m.org_role !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <UsersIcon className="w-7 h-7 text-neon-cyan" /> Users
          </h1>
          <p className="text-white/60 mt-1">
            Everyone in your organization — {members.length} {members.length === 1 ? 'person' : 'people'}.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {roleOptions.map((o) => (
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

      <input
        type="text"
        placeholder="Search by name or email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input"
      />

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="text-center py-12 text-white/50">No users match this view.</Card>
      ) : (
        <div className="grid gap-3">
          {visible.map((m) => (
            <Card key={m.user_id} className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="shrink-0">
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={m.name}
                      className="w-12 h-12 rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-neon-violet/20 border border-neon-violet/30 grid place-items-center font-display font-bold text-neon-violet">
                      {(m.name || m.email)[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold truncate">{m.name || m.email.split('@')[0]}</span>
                    {m.org_role && (
                      <Badge tone={m.org_role === 'owner' ? 'violet' : m.org_role === 'moderator' ? 'cyan' : 'neutral'}>
                        {roleIcon(m.org_role)}
                        {m.org_role}
                      </Badge>
                    )}
                    <Badge tone={statusTone(m.access_status)}>{m.access_status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="text-sm text-white/60 truncate">{m.email}</div>
                  <div className="text-xs text-white/40 mt-0.5">
                    Joined {format(new Date(m.joined), 'MMM d, yyyy')}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-amber-300" title="Streak">
                    <Flame className="w-4 h-4" />
                    <span className="font-semibold">{m.streak}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neon-violet" title="XP">
                    <Zap className="w-4 h-4" />
                    <span className="font-semibold">{m.xp}</span>
                  </div>
                  <div className="text-xs text-white/50" title="Level">
                    Lv {m.level}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
