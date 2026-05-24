import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSubscription } from '@/store/subscription';

// Routes a user with an expired sub can still reach: pay, manage account,
// finish onboarding, view their org. Everything else bounces to /billing.
const ALLOWED_WHEN_EXPIRED = ['/billing', '/settings', '/onboarding', '/org'];

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const sub = useSubscription((s) => s.sub);
  const fetched = useSubscription((s) => s.fetched);
  const load = useSubscription((s) => s.load);
  const loc = useLocation();

  useEffect(() => {
    load();
  }, [load]);

  if (!fetched) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
      </div>
    );
  }

  // If the call failed (sub == null), be lenient — don't lock the user out
  // of their app over a transient network error.
  const premiumActive = sub ? (sub.premium_active ?? sub.is_active) : true;
  const allowedHere = ALLOWED_WHEN_EXPIRED.some((p) => loc.pathname.startsWith(p));

  if (!premiumActive && !allowedHere) {
    return <Navigate to="/billing" replace />;
  }

  return <>{children}</>;
}
