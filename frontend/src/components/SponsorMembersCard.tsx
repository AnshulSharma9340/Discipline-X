import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Crown,
  CreditCard,
  Loader2,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import {
  fetchSponsorMembers,
  sponsorMembers,
  SPONSOR_PLAN_PRICE,
  type SponsorMember,
  type SponsorablePlan,
} from '@/lib/billing';
import { cn } from '@/lib/cn';

const PLAN_ORDER: SponsorablePlan[] = ['monthly', 'six_month', 'yearly'];

function statusBadge(m: SponsorMember) {
  if (!m.is_active) return <Badge tone="red">expired</Badge>;
  if (m.is_sponsored) return <Badge tone="green">sponsored</Badge>;
  if (m.status === 'active') return <Badge tone="violet">paid</Badge>;
  if (m.status === 'trial') return <Badge tone="amber">trial</Badge>;
  return <Badge>{m.status}</Badge>;
}

export function SponsorMembersCard() {
  const me = useAuth((s) => s.user);
  const [members, setMembers] = useState<SponsorMember[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [plan, setPlan] = useState<SponsorablePlan>('monthly');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchSponsorMembers();
      setMembers(res.members);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function selectAllUnsubscribed() {
    setSelected(
      new Set(
        members
          .filter((m) => !m.is_active || m.status === 'trial')
          .map((m) => m.user_id),
      ),
    );
  }

  function selectAll() {
    setSelected(new Set(members.map((m) => m.user_id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  const planInfo = SPONSOR_PLAN_PRICE[plan];
  const totalPaise = planInfo.paise * selected.size;
  const totalInr = totalPaise / 100;

  const unsubscribedCount = useMemo(
    () => members.filter((m) => !m.is_active || m.status === 'trial').length,
    [members],
  );

  async function pay() {
    if (selected.size === 0 || paying) return;
    setPaying(true);
    try {
      const res = await sponsorMembers(plan, Array.from(selected), {
        email: me?.email,
        name: me?.name,
      });
      toast.success(`Sponsored ${res.members_sponsored} member${res.members_sponsored === 1 ? '' : 's'}.`);
      setSelected(new Set());
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      if (msg !== 'Payment cancelled') toast.error(msg);
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <Card className="grid place-items-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-neon-violet" />
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-display font-semibold flex items-center gap-2">
            <Crown className="w-5 h-5 text-neon-violet" /> Sponsor members
          </h2>
          <p className="text-sm text-white/55 mt-1">
            Pay for any subset of your members. Each selected member gets a real subscription
            for the duration you choose. They keep premium even if you later stop sponsoring.
          </p>
        </div>
      </div>

      {/* Plan picker */}
      <div className="grid sm:grid-cols-3 gap-2">
        {PLAN_ORDER.map((code) => {
          const p = SPONSOR_PLAN_PRICE[code];
          const isActive = plan === code;
          return (
            <button
              key={code}
              onClick={() => setPlan(code)}
              className={cn(
                'rounded-xl border p-4 text-left transition',
                isActive
                  ? 'border-neon-violet/50 bg-neon-violet/10'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]',
              )}
            >
              <div className="font-display font-semibold text-sm flex items-center gap-2">
                {isActive && <Check className="w-4 h-4 text-neon-violet" strokeWidth={2.5} />}
                {p.label}
              </div>
              <div className="text-2xl font-display font-bold mt-1">
                ₹{p.paise / 100}
                <span className="text-xs text-white/45 font-normal"> / member</span>
              </div>
              <div className="text-[11px] text-white/45 mt-0.5">{p.days} days each</div>
            </button>
          );
        })}
      </div>

      {/* Quick selection */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" onClick={selectAllUnsubscribed} disabled={unsubscribedCount === 0}>
          <Sparkles className="w-3.5 h-3.5" />
          All unsubscribed ({unsubscribedCount})
        </Button>
        <Button variant="ghost" onClick={selectAll}>
          <Users className="w-3.5 h-3.5" />
          All ({members.length})
        </Button>
        {selected.size > 0 && (
          <Button variant="ghost" onClick={clearAll}>
            <X className="w-3.5 h-3.5" />
            Clear
          </Button>
        )}
        <span className="text-xs text-white/40 ml-auto">
          {selected.size} selected
        </span>
      </div>

      {/* Member list */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.06]">
        {members.length === 0 ? (
          <div className="p-6 text-center text-sm text-white/45">
            No members yet — share your invite code to bring people in.
          </div>
        ) : (
          members.map((m) => {
            const isSelected = selected.has(m.user_id);
            const isMe = m.user_id === me?.id;
            return (
              <button
                key={m.user_id}
                onClick={() => toggle(m.user_id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 text-left transition',
                  isSelected ? 'bg-neon-violet/10' : 'hover:bg-white/[0.03]',
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded border-2 grid place-items-center shrink-0 transition',
                    isSelected
                      ? 'border-neon-violet bg-neon-violet'
                      : 'border-white/25',
                  )}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </div>

                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    alt={m.name}
                    className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-neon-violet/15 border border-neon-violet/25 grid place-items-center text-xs font-display font-semibold text-neon-violet shrink-0">
                    {(m.name || m.email)[0]?.toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {m.name || m.email.split('@')[0]} {isMe && <span className="text-white/40">(you)</span>}
                    </span>
                    {statusBadge(m)}
                  </div>
                  <div className="text-xs text-white/45 truncate">{m.email}</div>
                </div>

                <div className="text-xs text-white/45 shrink-0 text-right">
                  {m.is_active ? `${m.days_left}d left` : 'no plan'}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Total + Pay */}
      <div
        className={cn(
          'rounded-xl border p-4 flex items-center gap-4 flex-wrap',
          selected.size > 0
            ? 'border-neon-violet/35 bg-neon-violet/[0.06]'
            : 'border-white/10 bg-white/[0.02]',
        )}
      >
        <div className="min-w-0 flex-1">
          {selected.size === 0 ? (
            <div className="text-sm text-white/55">
              Pick at least one member to enable checkout.
            </div>
          ) : (
            <>
              <div className="text-xs text-white/55">
                {planInfo.label} × {selected.size} member{selected.size === 1 ? '' : 's'}
              </div>
              <div className="font-display font-bold text-2xl">
                ₹{totalInr}
                <span className="text-sm text-white/45 font-normal ml-2">
                  ({planInfo.days} days each)
                </span>
              </div>
            </>
          )}
        </div>
        <Button
          onClick={pay}
          loading={paying}
          disabled={selected.size === 0}
        >
          {paying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Processing…
            </>
          ) : selected.size === 0 ? (
            'Select members'
          ) : (
            <>
              <CreditCard className="w-4 h-4" /> Pay ₹{totalInr}
            </>
          )}
        </Button>
      </div>

      <div className="text-[11px] text-white/40 inline-flex items-start gap-1.5 leading-relaxed">
        <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-400 shrink-0" />
        <span>
          Stacks on top of any current period — paying for an active member just adds time, never
          resets it. Sponsored periods stay valid even if you later stop sponsoring; only when
          they expire would the member need a new plan.
        </span>
      </div>
    </Card>
  );
}
