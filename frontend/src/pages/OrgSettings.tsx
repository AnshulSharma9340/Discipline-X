import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Copy,
  RefreshCw,
  Crown,
  Shield,
  User as UserIcon,
  Trash2,
  Loader2,
  Check,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { OrgSeatsCard } from '@/components/OrgSeatsCard';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/cn';
import type { Org, OrgMember, OrgRole } from '@/types';

const roleIcon = { owner: Crown, moderator: Shield, member: UserIcon } as const;
const roleTone = { owner: 'violet', moderator: 'cyan', member: 'neutral' } as const;

export default function OrgSettings() {
  const me = useAuth((s) => s.user);
  const fetchProfile = useAuth((s) => s.fetchProfile);
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

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

  if (loading || !org) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Building2 className="w-7 h-7 text-neon-violet" />
          Organization
        </h1>
        <p className="text-white/60 mt-1">
          {isOwner ? 'Manage members, invite code, and permissions.' : 'Your organization details.'}
        </p>
      </motion.div>

      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-aurora opacity-20 animate-gradient-x [background-size:200%_200%] pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wider text-white/50">Workspace</div>
              <h2 className="text-2xl font-display font-bold mt-1">{org.name}</h2>
              {org.description && (
                <p className="text-sm text-white/60 mt-2 max-w-xl">{org.description}</p>
              )}
              <div className="mt-3 text-xs text-white/50">
                {org.member_count} member{org.member_count === 1 ? '' : 's'} · created{' '}
                {new Date(org.created_at).toLocaleDateString()}
              </div>
            </div>

            {(isOwner || me?.org_role === 'moderator') && org.invite_code && (
              <div className="glass p-4 min-w-[220px]">
                <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
                  Invite code
                </div>
                <div className="font-mono text-xl tracking-wider text-neon-violet font-semibold">
                  {org.invite_code}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="ghost" onClick={copyInvite}>
                    <Copy className="w-4 h-4" /> Copy
                  </Button>
                  {isOwner && (
                    <Button variant="ghost" loading={busy === 'regen'} onClick={regenerateInvite}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <OrgSeatsCard isOwner={isOwner} />

      <Card>
        <h2 className="font-display font-semibold text-lg mb-4">Members ({members.length})</h2>
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

      <Card className="border-red-500/20 bg-red-500/5">
        <h2 className="font-display font-semibold text-lg mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" /> Danger zone
        </h2>
        <div className="space-y-3 mt-3">
          {!isOwner && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
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
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm">
                <div className="font-medium">Delete entire organization</div>
                <div className="text-white/50 text-xs">
                  Removes all tasks, squads, and detaches all members. Cannot be undone.
                </div>
              </div>
              <Button variant="danger" onClick={deleteOrg}>
                <Trash2 className="w-4 h-4" /> Delete org
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Suppress unused import warning
const _check = Check;
void _check;
