import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Copy,
  RefreshCw,
  Crown,
  Shield,
  User as UserIcon,
  Trash2,
  Loader2,
  AlertTriangle,
  LogOut,
  Users,
  Sparkles,
  Settings as SettingsIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { OrgSeatsCard } from '@/components/OrgSeatsCard';
import { SponsorMembersCard } from '@/components/SponsorMembersCard';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/cn';
import type { Org, OrgMember, OrgRole } from '@/types';

const roleIcon = { owner: Crown, moderator: Shield, member: UserIcon } as const;
const roleTone = { owner: 'violet', moderator: 'cyan', member: 'neutral' } as const;

type OrgTab = 'overview' | 'members' | 'seats' | 'sponsorship' | 'settings';

export default function OrgSettings() {
  const me = useAuth((s) => s.user);
  const fetchProfile = useAuth((s) => s.fetchProfile);
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<OrgTab>('overview');

  const isOwner = me?.org_role === 'owner';

  async function load() {
    setLoading(true);
    try {
      const [o, m] = await Promise.all([
        api.get<Org>('/orgs/me'),
        api.get<OrgMember[]>('/orgs/me/members'),
      ]);
      setOrg(o.data);
      setMembers(m.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function copyInvite() {
    if (!org?.invite_code) return;
    await navigator.clipboard.writeText(org.invite_code);
    toast.success('Invite code copied');
  }

  async function regenerateInvite() {
    setBusy('regen');
    try {
      const r = await api.post<{ invite_code: string }>('/orgs/me/regenerate-invite');
      toast.success(`New invite code: ${r.data.invite_code}`);
      load();
    } finally {
      setBusy(null);
    }
  }

  async function changeRole(userId: string, role: OrgRole) {
    setBusy(userId);
    try {
      await api.patch(`/orgs/me/members/${userId}/role`, { role });
      toast.success('Role updated');
      load();
    } finally {
      setBusy(null);
    }
  }

  async function remove(m: OrgMember) {
    if (!confirm(`Remove ${m.name} from the organization?`)) return;
    setBusy(m.user_id);
    try {
      await api.delete(`/orgs/me/members/${m.user_id}`);
      toast.success('Removed');
      load();
    } finally {
      setBusy(null);
    }
  }

  async function transferOwnership(m: OrgMember) {
    if (!confirm(`Transfer ownership to ${m.name}? You'll become a moderator.`)) return;
    setBusy(m.user_id);
    try {
      await api.post('/orgs/me/transfer-ownership', { new_owner_id: m.user_id });
      toast.success('Ownership transferred');
      await fetchProfile();
      load();
    } finally {
      setBusy(null);
    }
  }

  async function leaveOrg() {
    if (!confirm('Leave this organization? You can rejoin later with the invite code.')) return;
    try {
      await api.post('/orgs/leave');
      await fetchProfile();
      toast.success('Left organization');
      window.location.href = '/onboarding';
    } catch {
      // toast handled by interceptor
    }
  }

  async function deleteOrg() {
    if (
      !confirm(
        `DELETE the entire organization? All tasks, squads will be removed. Members will be detached. This cannot be undone.`,
      )
    )
      return;
    try {
      await api.delete('/orgs/me');
      await fetchProfile();
      toast.success('Organization deleted');
      window.location.href = '/onboarding';
    } catch {
      // toast handled
    }
  }

  // Hooks MUST run before any conditional returns — keep useMemo above
  // the `if (loading)` guard or React throws "Rendered more hooks than
  // during the previous render."
  const tabs = useMemo(() => {
    const t: { id: OrgTab; label: string; icon: typeof Users }[] = [
      { id: 'overview', label: 'Overview', icon: Building2 },
      { id: 'members', label: `Members · ${members.length}`, icon: Users },
      { id: 'seats', label: 'Seats', icon: Users },
    ];
    if (isOwner) {
      t.push({ id: 'sponsorship', label: 'Sponsorship', icon: Sparkles });
    }
    t.push({ id: 'settings', label: 'Settings', icon: SettingsIcon });
    return t;
  }, [isOwner, members.length]);

  if (loading || !org) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-neon-violet/10 border border-neon-violet/30 text-[11px] uppercase tracking-[0.18em] text-neon-violet mb-3">
          <Building2 className="w-3 h-3" /> Organization
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-[-0.02em]">
          {org.name}
        </h1>
        {org.description && (
          <p className="text-white/55 mt-2 text-sm max-w-2xl">{org.description}</p>
        )}
        <div className="mt-2 text-xs text-white/40">
          {org.member_count} member{org.member_count === 1 ? '' : 's'} · created{' '}
          {new Date(org.created_at).toLocaleDateString()}
        </div>
      </motion.div>

      {/* Tab nav — sticky for desktop, horizontal scroll on mobile */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-2 bg-black/60 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm transition shrink-0',
                  isActive
                    ? 'bg-white text-black font-medium'
                    : 'text-white/55 hover:text-white hover:bg-white/[0.04]',
                )}
              >
                <t.icon className="w-3.5 h-3.5" strokeWidth={2} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="space-y-6"
        >
          {/* Overview tab */}
          {tab === 'overview' && (
            <>
              {(isOwner || me?.org_role === 'moderator') && org.invite_code && (
                <Card>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45 mb-1">
                        Invite code
                      </div>
                      <div className="font-mono text-2xl tracking-[0.2em] text-neon-violet font-semibold">
                        {org.invite_code}
                      </div>
                      <p className="text-xs text-white/45 mt-2">
                        Share this with new members. They'll need it to join.
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="ghost" onClick={copyInvite}>
                        <Copy className="w-4 h-4" /> Copy
                      </Button>
                      {isOwner && (
                        <Button variant="ghost" loading={busy === 'regen'} onClick={regenerateInvite}>
                          <RefreshCw className="w-4 h-4" /> Regenerate
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              <div className="grid sm:grid-cols-3 gap-3">
                <StatTile
                  label="Members"
                  value={members.length}
                  icon={Users}
                  accent="cyan"
                />
                <StatTile
                  label="Owners + mods"
                  value={
                    members.filter((m) => m.org_role === 'owner' || m.org_role === 'moderator').length
                  }
                  icon={Shield}
                  accent="violet"
                />
                <StatTile
                  label="Total XP"
                  value={members.reduce((s, m) => s + (m.xp || 0), 0).toLocaleString()}
                  icon={Crown}
                  accent="amber"
                />
              </div>
            </>
          )}

          {/* Seats tab */}
          {tab === 'seats' && <OrgSeatsCard isOwner={isOwner} />}

          {/* Sponsorship tab */}
          {tab === 'sponsorship' && isOwner && <SponsorMembersCard />}

          {/* Settings (danger zone) tab */}
          {tab === 'settings' && (
            <Card className="border-red-500/20 bg-red-500/[0.03]">
              <h2 className="font-display font-semibold text-lg mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Danger zone
              </h2>
              <div className="space-y-3 mt-3">
                {!isOwner && (
                  <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <div className="text-sm">
                      <div className="font-medium">Leave organization</div>
                      <div className="text-white/50 text-xs">
                        Your data stays. You can rejoin with an invite code.
                      </div>
                    </div>
                    <Button variant="danger" onClick={leaveOrg}>
                      <LogOut className="w-4 h-4" /> Leave
                    </Button>
                  </div>
                )}
                {isOwner && (
                  <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4">
                    <div className="text-sm">
                      <div className="font-medium">Delete entire organization</div>
                      <div className="text-white/50 text-xs">
                        Removes all tasks and squads, detaches every member. Cannot be undone.
                      </div>
                    </div>
                    <Button variant="danger" onClick={deleteOrg}>
                      <Trash2 className="w-4 h-4" /> Delete org
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Members tab */}
          {tab === 'members' && (
            <Card>
              <h2 className="font-display font-semibold text-lg mb-4">
                Members ({members.length})
              </h2>
        <div className="space-y-2">
          {members.map((m) => {
            const Icon = roleIcon[(m.org_role ?? 'member') as keyof typeof roleIcon];
            const isMe = m.user_id === me?.id;
            return (
              <div
                key={m.user_id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-white/10 transition',
                  isMe && 'bg-neon-violet/5 border-neon-violet/20',
                )}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan grid place-items-center font-semibold">
                  {m.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    <Link
                      to={`/u/${m.user_id}`}
                      className="hover:text-neon-cyan transition truncate"
                    >
                      {m.name}
                    </Link>
                    {isMe && <span className="text-neon-violet text-xs">(you)</span>}
                  </div>
                  <div className="text-xs text-white/50 truncate">{m.email}</div>
                </div>
                <div className="hidden sm:flex flex-col items-end text-xs">
                  <div className="font-mono text-neon-violet">{m.xp.toLocaleString()} XP</div>
                  <div className="text-white/50">Lv {m.level} · {m.streak}d</div>
                </div>
                <Badge tone={roleTone[(m.org_role ?? 'member') as keyof typeof roleTone]}>
                  <Icon className="w-3 h-3" /> {m.org_role}
                </Badge>
                {isOwner && !isMe && (
                  <div className="flex items-center gap-1">
                    {m.org_role === 'member' ? (
                      <button
                        title="Promote to moderator"
                        onClick={() => changeRole(m.user_id, 'moderator')}
                        disabled={busy === m.user_id}
                        className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/10 transition"
                      >
                        <Shield className="w-4 h-4 text-neon-cyan" />
                      </button>
                    ) : m.org_role === 'moderator' ? (
                      <button
                        title="Demote to member"
                        onClick={() => changeRole(m.user_id, 'member')}
                        disabled={busy === m.user_id}
                        className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/10 transition"
                      >
                        <UserIcon className="w-4 h-4 text-white/60" />
                      </button>
                    ) : null}
                    <button
                      title="Transfer ownership"
                      onClick={() => transferOwnership(m)}
                      disabled={busy === m.user_id}
                      className="w-8 h-8 grid place-items-center rounded-lg hover:bg-amber-500/20 transition"
                    >
                      <Crown className="w-4 h-4 text-amber-400" />
                    </button>
                    <button
                      title="Remove from org"
                      onClick={() => remove(m)}
                      disabled={busy === m.user_id}
                      className="w-8 h-8 grid place-items-center rounded-lg hover:bg-red-500/20 transition"
                    >
                      <Trash2 className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                )}
              </div>
            );
              })}
            </div>
          </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: typeof Building2;
  accent: 'cyan' | 'violet' | 'amber';
}) {
  const accents: Record<string, string> = {
    cyan: 'border-neon-cyan/25 bg-neon-cyan/[0.05] text-neon-cyan',
    violet: 'border-neon-violet/25 bg-neon-violet/[0.05] text-neon-violet',
    amber: 'border-amber-400/25 bg-amber-400/[0.05] text-amber-300',
  };
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className={cn('w-8 h-8 rounded-lg border grid place-items-center mb-3', accents[accent])}>
        <Icon className="w-4 h-4" strokeWidth={2} />
      </div>
      <div className="text-2xl font-display font-bold tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/45 mt-0.5">{label}</div>
    </div>
  );
}
