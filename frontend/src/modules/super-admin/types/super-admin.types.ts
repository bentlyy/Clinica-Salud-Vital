export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string;
  active: boolean;
  plan: string;
  total_bookings: number;
  total_users: number;
  total_doctors: number;
  created_at: string;
  logo_url?: string;
}

export interface TenantDetail extends Tenant {
  plan_name: string;
  locale: string;
  timezone: string;
  total_patients: number;
  confirmed_bookings: number;
  invoice_count: number;
  lab_request_count: number;
}

export interface CreateTenantInput {
  name: string;
  domain?: string;
  plan?: string;
}

export interface UpdateTenantInput {
  name?: string;
  domain?: string;
  active?: boolean;
}

export interface TenantStats {
  total_users: number;
  total_patients: number;
  total_doctors: number;
  total_appointments: number;
  monthly_revenue: number;
}

export interface TenantListParams {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  active?: boolean;
}

export interface SaasDashboard {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_revenue: number;
  tenants_by_plan: { plan: string; count: number }[];
  growth_by_month: { month: string; tenants: number; revenue: number }[];
}

export interface HealthScore {
  id: string;
  name: string;
  active: boolean;
  health_score: number;
  score_activity: number;
  score_trend: number;
  score_patients: number;
  score_cancellation: number;
  score_modules: number;
  last_booking: string | null;
  bookings_30d: number;
  bookings_prev_30d: number;
}

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SaasAlert {
  tenant_id: string;
  tenant_name: string;
  type: string;
  severity: AlertSeverity;
  message: string;
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

export const TENANT_PLAN_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  free: { label: 'Gratuito', color: '#6b7280', bgColor: '#f3f4f6' },
  basic: { label: 'Básico', color: '#2563eb', bgColor: '#eff6ff' },
  pro: { label: 'Pro', color: '#0d9488', bgColor: '#f0fdfa' },
  enterprise: { label: 'Enterprise', color: '#7c3aed', bgColor: '#f5f3ff' },
};
