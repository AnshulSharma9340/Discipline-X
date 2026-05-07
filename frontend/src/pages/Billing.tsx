import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Crown,
  Loader2,
  Sparkles,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/store/auth';
import { fetchPlans, startCheckout, type Plan, type SubscriptionState } from '@/lib/billing';
import { cn } from '@/lib/cn';

export default function Billing() {
  const user = useAuth((s) => s.user);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchPlans();
      setPlans(data.plans);
      setSub(data.subscription);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function buy(plan: Plan) {
    if (paying) return;
    setPaying(plan.code);
    try {
      const newSub = await startCheckout(plan.code, {
        email: user?.email,
        name: user?.name,
      });
      setSub(newSub);
      toast.success(`Subscribed to ${plan.label} — see you tomorrow.`);
      // Refresh plan list (intro might now be hidden if we just used it).
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      if (msg !== 'Payment cancelled') toast.error(msg);
    } finally {
      setPaying(null);
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] uppercase tracking-[0.18em] text-white/60 mb-4">
          <Sparkles className="w-3 h-3 text-neon-violet" /> Pricing
        </div>
        <h1 className="font-display font-semibold text-3xl md:text-5xl tracking-[-0.03em] leading-[1.05]">
          Stay disciplined.
          <br />
          <span className="italic font-light text-white/65">Keep building.</span>
        </h1>
        <p className="text-white/55 mt-4 text-sm md:text-base max-w-md mx-auto">
          7-day free trial included. Cancel anytime — payments via Razorpay (UPI, cards, net banking).
        </p>
      </motion.div>

      {sub && <CurrentPlanCard sub={sub} />}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <PlanCard
            key={p.code}
            plan={p}
            paying={paying === p.code}
            onBuy={() => buy(p)}
          />
        ))}
      </div>

      <Card className="bg-white/[0.02] border-white/[0.06]">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1 text-sm text-white/65 space-y-2">
            <p>
              <strong className="text-white">Secure payments via Razorpay.</strong> We never see
              your card details. UPI, debit/credit cards, net banking, and wallets all supported.
            </p>
            <p>
              Subscription extends from your current expiry date — paying again before your plan
              ends just adds time on top, never resets it.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CurrentPlanCard({ sub }: { sub: SubscriptionState }) {
  const expiresAt = new Date(sub.expires_at);
  const tone = sub.status === 'expired' ? 'red' : sub.status === 'trial' ? 'amber' : 'green';
  const planLabel =
    sub.plan === 'trial'
      ? 'Free trial'
      : sub.plan === 'first_month'
      ? 'Intro month'
      : sub.plan === 'monthly'
      ? 'Monthly'
      : sub.plan === 'six_month'
      ? '6 months'
      : sub.plan === 'yearly'
      ? '1 year'
      : sub.plan;

  return (
    <Card className="bg-gradient-to-br from-neon-violet/10 to-neon-cyan/5 border-neon-violet/20">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-neon-violet/20 border border-neon-violet/30 grid place-items-center shrink-0">
          <Crown className="w-6 h-6 text-neon-violet" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-display font-semibold text-lg">Your plan: {planLabel}</span>
            <Badge tone={tone}>{sub.status}</Badge>
          </div>
          <div className="text-sm text-white/60">
            {sub.is_active ? (
              <>
                {sub.days_left > 0
                  ? `${sub.days_left} day${sub.days_left === 1 ? '' : 's'} left`
                  : 'Expires today'}
                {' · '}
                <span className="text-white/45">
                  Renews/expires on {format(expiresAt, 'MMM d, yyyy')}
                </span>
              </>
            ) : (
              <>Expired on {format(expiresAt, 'MMM d, yyyy')}</>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function PlanCard({
  plan,
  paying,
  onBuy,
}: {
  plan: Plan;
  paying: boolean;
  onBuy: () => void;
}) {
  const isIntro = plan.code === 'first_month';
  const isFeatured = plan.code === 'yearly';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative rounded-2xl border p-6 flex flex-col',
        isFeatured
          ? 'border-neon-violet/40 bg-gradient-to-br from-neon-violet/15 to-neon-cyan/10 shadow-glow'
          : isIntro
          ? 'border-emerald-500/35 bg-emerald-500/[0.06]'
          : 'border-white/10 bg-white/[0.02]',
      )}
    >
      {isFeatured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-neon-violet text-white text-[10px] uppercase tracking-[0.18em] font-semibold">
          Best value
        </div>
      )}
      {isIntro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-black text-[10px] uppercase tracking-[0.18em] font-semibold">
          Try it for ₹1
        </div>
      )}

      <div className="font-display font-semibold text-lg">{plan.label}</div>
      <div className="text-sm text-white/55 mt-1 min-h-[40px]">{plan.description}</div>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-display font-bold tracking-tight">
          ₹{plan.amount_inr}
        </span>
        <span className="text-sm text-white/45">
          / {plan.duration_days >= 365 ? 'year' : plan.duration_days >= 90 ? '6 mo' : 'month'}
        </span>
      </div>

      <ul className="mt-6 space-y-2 text-sm text-white/65 flex-1">
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-neon-cyan shrink-0 mt-0.5" />
          <span>All discipline features unlocked</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-neon-cyan shrink-0 mt-0.5" />
          <span>AI Coach + task generation</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-neon-cyan shrink-0 mt-0.5" />
          <span>Multi-org switching</span>
        </li>
        {plan.duration_days >= 90 && (
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-neon-cyan shrink-0 mt-0.5" />
            <span>Priority support</span>
          </li>
        )}
      </ul>

      <button
        onClick={onBuy}
        disabled={paying}
        className={cn(
          'mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-medium transition disabled:opacity-50',
          isFeatured
            ? 'bg-white text-black hover:bg-white/90'
            : 'bg-white/10 text-white border border-white/15 hover:bg-white/15',
        )}
      >
        {paying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Processing…
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" /> {isIntro ? 'Try for ₹1' : 'Subscribe'}
          </>
        )}
      </button>
    </motion.div>
  );
}
