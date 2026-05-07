import { api } from '@/lib/api';

export type PlanCode = 'first_month' | 'monthly' | 'six_month' | 'yearly';

export interface SubscriptionState {
  plan: 'trial' | PlanCode;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  expires_at: string;
  days_left: number;
  is_active: boolean;
  has_used_intro: boolean;

  // Hybrid premium signal — true iff personal sub OR org sponsorship covers them.
  // Optional: older backend revisions may omit these fields. Callers should
  // fall back to `is_active` if these are undefined.
  premium_active?: boolean;
  premium_source?: 'personal' | 'sponsored' | 'none';
  sponsoring_org_id?: string | null;
  sponsoring_org_name?: string | null;
}

export interface SeatsState {
  used: number;
  total: number;
  base_limit: number;
  extra_purchased: number;
  price_per_seat_paise: number;
  sponsorship_enabled: boolean;
}

interface SeatCheckoutOrder {
  order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
  seats: number;
}

export type SponsorablePlan = 'monthly' | 'six_month' | 'yearly';

export interface SponsorMember {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  org_role: 'owner' | 'moderator' | 'member' | null;
  plan: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  expires_at: string;
  days_left: number;
  is_active: boolean;
  is_sponsored: boolean;
  sponsored_by_org_id: string | null;
}

export interface SponsorMembersResponse {
  members: SponsorMember[];
  org_id: string;
}

interface SponsorshipCheckoutOrder {
  order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
  plan: SponsorablePlan;
  members_count: number;
}

export interface Plan {
  code: PlanCode;
  label: string;
  description: string;
  amount_paise: number;
  amount_inr: number;
  duration_days: number;
}

export interface PlansResponse {
  plans: Plan[];
  subscription: SubscriptionState;
}

interface CheckoutOrder {
  order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
  plan: PlanCode;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string; name?: string; contact?: string };
  theme?: { color?: string };
  handler: (resp: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

export async function fetchSubscription(): Promise<SubscriptionState> {
  const res = await api.get<SubscriptionState>('/billing/me');
  return res.data;
}

export async function fetchPlans(): Promise<PlansResponse> {
  const res = await api.get<PlansResponse>('/billing/plans');
  return res.data;
}

export async function redeemIntro(): Promise<SubscriptionState> {
  const res = await api.post<SubscriptionState>('/billing/redeem-intro');
  return res.data;
}

// ---- Org seats / sponsorship ---------------------------------------------

export async function fetchSeats(): Promise<SeatsState> {
  const res = await api.get<SeatsState>('/orgs/me/seats');
  return res.data;
}

export async function setSponsorship(enabled: boolean): Promise<{ sponsorship_enabled: boolean }> {
  const res = await api.post<{ sponsorship_enabled: boolean }>('/orgs/me/sponsorship', {
    enabled,
  });
  return res.data;
}

/**
 * End-to-end seat purchase: ₹5 × N → Razorpay overlay → /verify on success.
 * Resolves with the new SeatsState (used + total now reflect the purchase).
 */
export async function fetchSponsorMembers(): Promise<SponsorMembersResponse> {
  const res = await api.get<SponsorMembersResponse>('/orgs/me/sponsorship/members');
  return res.data;
}

export const SPONSOR_PLAN_PRICE: Record<SponsorablePlan, { paise: number; days: number; label: string }> = {
  monthly: { paise: 4900, days: 30, label: 'Monthly' },
  six_month: { paise: 24900, days: 182, label: '6 months' },
  yearly: { paise: 44900, days: 365, label: '1 year' },
};

/**
 * End-to-end bulk sponsorship: ₹49/249/449 × N members → Razorpay overlay
 * → /verify on success. Resolves with members_sponsored count.
 */
export async function sponsorMembers(
  plan: SponsorablePlan,
  memberIds: string[],
  user: { email?: string; name?: string },
): Promise<{ members_sponsored: number }> {
  if (typeof window === 'undefined' || !window.Razorpay) {
    throw new Error('Payment gateway is still loading. Please retry in a moment.');
  }

  const order = (
    await api.post<SponsorshipCheckoutOrder>('/orgs/me/sponsorship/checkout', {
      plan,
      member_ids: memberIds,
    })
  ).data;

  return new Promise<{ members_sponsored: number }>((resolve, reject) => {
    const Razorpay = window.Razorpay!;
    const rzp = new Razorpay({
      key: order.key_id,
      amount: order.amount_paise,
      currency: order.currency,
      name: 'DisciplineX',
      description: `Sponsor ${order.members_count} member${order.members_count === 1 ? '' : 's'} — ${SPONSOR_PLAN_PRICE[plan].label}`,
      order_id: order.order_id,
      prefill: { email: user.email, name: user.name },
      theme: { color: '#7c3aed' },
      handler: async (resp) => {
        try {
          const verified = await api.post<{ ok: boolean; members_sponsored: number }>(
            '/orgs/me/sponsorship/verify',
            {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            },
          );
          resolve(verified.data);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    });
    rzp.open();
  });
}

export async function buySeats(
  seats: number,
  user: { email?: string; name?: string },
): Promise<SeatsState> {
  if (typeof window === 'undefined' || !window.Razorpay) {
    throw new Error('Payment gateway is still loading. Please retry in a moment.');
  }

  const order = (await api.post<SeatCheckoutOrder>('/orgs/me/seats/checkout', { seats })).data;

  return new Promise<SeatsState>((resolve, reject) => {
    const Razorpay = window.Razorpay!;
    const rzp = new Razorpay({
      key: order.key_id,
      amount: order.amount_paise,
      currency: order.currency,
      name: 'DisciplineX',
      description: `${seats} extra seat${seats === 1 ? '' : 's'}`,
      order_id: order.order_id,
      prefill: { email: user.email, name: user.name },
      theme: { color: '#7c3aed' },
      handler: async (resp) => {
        try {
          const verified = await api.post<SeatsState>('/orgs/me/seats/verify', {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          resolve(verified.data);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    });
    rzp.open();
  });
}

/**
 * End-to-end checkout: create order on backend, open Razorpay overlay,
 * verify signature on success. Resolves with the new SubscriptionState
 * or rejects on failure / dismissal.
 */
export async function startCheckout(
  plan: PlanCode,
  user: { email?: string; name?: string },
): Promise<SubscriptionState> {
  if (typeof window === 'undefined' || !window.Razorpay) {
    throw new Error('Payment gateway is still loading. Please retry in a moment.');
  }

  const order = (await api.post<CheckoutOrder>('/billing/checkout', { plan })).data;

  return new Promise<SubscriptionState>((resolve, reject) => {
    const Razorpay = window.Razorpay!;
    const rzp = new Razorpay({
      key: order.key_id,
      amount: order.amount_paise,
      currency: order.currency,
      name: 'DisciplineX',
      description: 'Subscription',
      order_id: order.order_id,
      prefill: {
        email: user.email,
        name: user.name,
      },
      theme: { color: '#7c3aed' },
      handler: async (resp) => {
        try {
          const verified = await api.post<SubscriptionState>('/billing/verify', {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
            plan,
          });
          resolve(verified.data);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    });
    rzp.open();
  });
}
