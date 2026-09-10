export interface Plan {
  id: number;
  name: string;
  code: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_doctors: number;
  max_patients: number;
  storage_gb: number;
  features: Record<string, unknown>;
  active: boolean;
  sort_order: number;
}

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export interface Subscription {
  id: number;
  tenant_id: string;
  plan_id: number;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  plan: Plan;
}

export interface GetMySubscriptionResponse {
  subscription: Subscription | null;
  plan: Plan;
}

export interface CheckoutResponse {
  url: string;
  preferenceId?: string;
  mode?: string;
  subscription?: Subscription;
  message?: string;
}