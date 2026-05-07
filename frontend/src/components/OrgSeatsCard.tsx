import { useEffect, useState } from 'react';
import {
  CreditCard,
  Crown,
  Loader2,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import {
  buySeats,
  fetchSeats,
  setSponsorship,
  type SeatsState,
} from '@/lib/billing';
import { cn } from '@/lib/cn';

interface Props {
  isOwner: boolean;
}

export function OrgSeatsCard({ isOwner }: Props) {
  const me = useAuth((s) => s.user);
  const [seats, setSeats] = useState<SeatsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [extra, setExtra] = useState(5);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setSeats(await fetchSeats());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function buy() {
    if (!seats || extra < 1 || busy) return;
    setBusy(true);
    try {
      const fresh = await buySeats(extra, { email: me?.email, name: me?.name });
      setSeats(fresh);
      toast.success(`+${extra} seats added.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Purchase failed';
      if (msg !== 'Payment cancelled') toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function toggleSponsorship() {
    if (!seats || busy) return;
    setBusy(true);
    try {
      const res = await setSponsorship(!seats.sponsorship_enabled);
      setSeats({ ...seats, sponsorship_enabled: res.sponsorship_enabled });
      toast.success(
        res.sponsorship_enabled
          ? 'Sponsorship enabled — members get premium while you have an active plan.'
          : 'Sponsorship disabled.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading || !seats) {
    return (
      <Card className="grid place-items-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-neon-violet" />
      </Card>
    );
  }

  const pct = seats.total === 0 ? 0 : Math.min(100, (seats.used / seats.total) * 100);
  const nearCap = pct >= 80;
  const pricePerSeat = seats.price_per_seat_paise / 100;

  return (
    <Card className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-display font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-neon-cyan" /> Seats & sponsorship
          </h2>
          <p className="text-sm text-white/55 mt-1">
            Members allowed in this org and whether you cover their premium access.
          </p>
        </div>
        <Badge tone={seats.sponsorship_enabled ? 'violet' : 'neutral'}>
          {seats.sponsorship_enabled ? (
            <>
              <Crown className="w-3 h-3" /> Sponsoring
            </>
          ) : (
            'Not sponsoring'
          )}
        </Badge>
      </div>

      {/* Seat usage bar */}
      <div>
        <div className="flex items-baseline justify-between mb-2 text-sm">
          <span>
            <strong className="text-white">{seats.used}</strong>
            <span className="text-white/45"> / {seats.total} seats used</span>
          </span>
          <span className="text-xs text-white/50">
            {seats.base_limit} base + {seats.extra_purchased} extra
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              nearCap ? 'bg-amber-400' : 'bg-neon-cyan',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {nearCap && (
          <p className="text-xs text-amber-300 mt-2">
            You're near capacity. Add more seats to keep onboarding members.
          </p>
        )}
      </div>

      {/* Buy seats — owner only */}
      {isOwner && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-neon-violet" />
            <span className="font-display font-semibold">Add more seats</span>
            <span className="text-xs text-white/45">· ₹{pricePerSeat} each, one-time</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="number"
              min={1}
              max={500}
              value={extra}
              onChange={(e) => setExtra(Math.max(1, Math.min(500, parseInt(e.target.value || '0', 10))))}
              className="input w-24"
            />
            <span className="text-sm text-white/55">extra seat{extra === 1 ? '' : 's'}</span>
            <span className="text-sm font-mono text-white/80">
              = ₹{extra * pricePerSeat}
            </span>
            <Button onClick={buy} loading={busy}>
              <CreditCard className="w-4 h-4" /> Pay ₹{extra * pricePerSeat}
            </Button>
          </div>
          <p className="text-[11px] text-white/40 mt-2">
            Seats are permanent — you only pay once. They never expire.
          </p>
        </div>
      )}

      {/* Sponsorship toggle — owner only */}
      {isOwner && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-neon-violet/15 border border-neon-violet/30 grid place-items-center shrink-0">
              <Sparkles className="w-5 h-5 text-neon-violet" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display font-semibold">Sponsor members</div>
              <p className="text-sm text-white/55 mt-1 leading-relaxed">
                When enabled, every member of this org gets premium access without their own
                subscription — as long as <strong className="text-white">you</strong> have an
                active personal plan. Toggle off anytime.
              </p>
              {seats.sponsorship_enabled && (
                <p className="text-[11px] text-amber-300/80 mt-2">
                  Your members are currently relying on your subscription. If yours lapses, they'll
                  lose premium access.
                </p>
              )}
            </div>
            <Button
              variant={seats.sponsorship_enabled ? 'danger' : undefined}
              onClick={toggleSponsorship}
              loading={busy}
            >
              {seats.sponsorship_enabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
