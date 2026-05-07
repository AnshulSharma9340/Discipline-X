import { api } from '@/lib/api';

export type PlanCode = 'first_month' | 'monthly' | 'six_month' | 'yearly';

export interface SubscriptionState {
  plan: 'trial' | PlanCode;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  expires_at: string;
  days_left: number;
  is_active: boolean;
  has_used_intro: boolean;
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
