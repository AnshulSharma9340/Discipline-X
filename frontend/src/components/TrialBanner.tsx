import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { fetchSubscription, type SubscriptionState } from '@/lib/billing';
import { cn } from '@/lib/cn';

const DISMISS_KEY = 'dx-trial-banner-dismissed';

function dismissedToday(): boolean {
  if (typeof window === 'undefined') return false;
  const v = window.localStorage.getItem(DISMISS_KEY);
  if (!v) return false;
  return v === new Date().toDateString();
}

function markDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, new Date().toDateString());
  } catch {
    /* ignore */
  }
}

export function TrialBanner() {
  const [sub, setSub] = useState<SubscriptionState | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    fetchSubscription().then(setSub).catch(() => {});
  }, []);

  if (!sub || hidden) return null;

  // Sponsored users don't need any nag — their org is paying.
  if (sub.premium_source === 'sponsored') return null;

  // Hide entirely for healthy paid subscribers (mid-period).
  if (sub.status === 'active' && sub.days_left > 5) return null;

  // Trial users: only nag in the last 3 days, and only once per day.
  if (sub.status === 'trial' && sub.days_left > 3) return null;
  if (sub.status === 'trial' && dismissedToday()) return null;

  const isExpired = !sub.is_active;
  const isTrial = sub.status === 'trial';

  const tone = isExpired
    ? 'bg-red-500/[0.08] border-red-500/30 text-red-100'
    : isTrial
    ? 'bg-amber-500/[0.08] border-amber-500/30 text-amber-100'
    : 'bg-neon-violet/[0.08] border-neon-violet/30 text-white/85';

  const Icon = isExpired ? AlertTriangle : Sparkles;

  const message = isExpired
    ? 'Your subscription expired. Pick a plan to keep your streak going.'
    : isTrial
    ? `${sub.days_left} day${sub.days_left === 1 ? '' : 's'} left in your free trial — upgrade for ₹1 to keep going.`
    : `Renewal due in ${sub.days_left} day${sub.days_left === 1 ? '' : 's'}.`;

  function dismiss() {
    if (!isExpired) markDismissed();
    setHidden(true);
  }

  return (
    <div className={cn('border-b backdrop-blur-md', tone)}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 flex items-center gap-3 text-sm">
        <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
        <span className="flex-1 min-w-0 truncate">{message}</span>
        <Link
          to="/billing"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-black text-xs font-medium hover:bg-white/90 transition shrink-0"
        >
          {isExpired ? 'Upgrade' : 'See plans'} <ArrowRight className="w-3 h-3" />
        </Link>
        {!isExpired && (
          <button
            onClick={dismiss}
            className="opacity-70 hover:opacity-100 transition shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
