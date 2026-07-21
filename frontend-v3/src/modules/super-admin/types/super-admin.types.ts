export interface Tenant {
  id: number;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  is_active: boolean;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  created_at: string;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  domain?: string;
  plan?: Tenant['plan'];
}

export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  domain?: string;
  plan?: Tenant['plan'];
  is_active?: boolean;
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
  plan?: Tenant['plan'];
  is_active?: boolean;
}

export interface SaasDashboard {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_revenue: number;
  tenants_by_plan: { plan: string; count: number }[];
  growth_by_month: { month: string; tenants: number; revenue: number }[];
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

export const TENANT_PLAN_CONFIG: Record<
  Tenant['plan'],
  { label: string; color: string; bgColor: string }
> = {
  free: { label: 'Gratuito', color: '#6b7280', bgColor: '#f3f4f6' },
  basic: { label: 'Básico', color: '#2563eb', bgColor: '#eff6ff' },
  pro: { label: 'Pro', color: '#0d9488', bgColor: '#f0fdfa' },
  enterprise: { label: 'Enterprise', color: '#7c3aed', bgColor: '#f5f3ff' },
};
