import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Sparkles, AlertTriangle } from 'lucide-react';
import { fetchSubscription, type SubscriptionState } from '@/lib/billing';
import { cn } from '@/lib/cn';

/**
 * Compact plan indicator for the topbar.
 *
 *   Trial:    amber Sparkles  "Trial · 5d"
 *   Active:   violet Crown    "Pro · 28d"
 *   Expired:  red    Warning  "Expired"
 *
 * Clickable — navigates to /billing for upgrade / management.
 */
export function PlanBadge() {
  const [sub, setSub] = useState<SubscriptionState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSubscription()
      .then((s) => {
        if (!cancelled) setSub(s);
      })
      .catch(() => {
        // Silent — billing config issues shouldn't crash the topbar.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!sub) return null;

  const isExpired = !sub.is_active;
  const isTrial = sub.status === 'trial';
  const isActive = sub.status === 'active';

  let label: string;
  if (isExpired) label = 'Expired';
  else if (isTrial) label = `Trial · ${sub.days_left}d`;
  else if (isActive) label = `Pro · ${sub.days_left}d`;
  else label = sub.status;

  const Icon = isExpired ? AlertTriangle : isActive ? Crown : Sparkles;

  const tone = isExpired
    ? 'border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/15'
    : isTrial
    ? 'border-amber-500/35 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15'
    : 'border-neon-violet/35 bg-neon-violet/10 text-neon-violet hover:bg-neon-violet/15';

  const title = isExpired
    ? 'Subscription expired — click to renew'
    : isTrial
    ? `${sub.days_left} day${sub.days_left === 1 ? '' : 's'} left in trial — click to upgrade`
    : `${sub.days_left} day${sub.days_left === 1 ? '' : 's'} left on your plan`;

  return (
    <Link
      to="/billing"
      title={title}
      className={cn(
        'hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition shrink-0',
        tone,
      )}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      <span className="font-medium tabular-nums">{label}</span>
    </Link>
  );
}
