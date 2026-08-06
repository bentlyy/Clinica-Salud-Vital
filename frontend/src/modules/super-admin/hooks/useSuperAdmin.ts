import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';
import { superAdminService } from '../services/super-admin.service';
import type {
  TenantListParams,
  CreateTenantInput,
  UpdateTenantInput,
} from '../types/super-admin.types';

export const superAdminKeys = {
  stats: ['super-admin', 'stats'] as const,
  tenants: ['super-admin', 'tenants'] as const,
  tenantList: (params?: TenantListParams) => ['super-admin', 'tenants', params] as const,
  tenantDetail: (id: string) => ['super-admin', 'tenants', id] as const,
  health: ['super-admin', 'health'] as const,
  alerts: ['super-admin', 'alerts'] as const,
};

export function useSuperAdminStats() {
  return useQuery({
    queryKey: superAdminKeys.stats,
    queryFn: ({ signal }) => superAdminService.getStats({ signal }),
  });
}

export function useSuperAdminDashboard() {
  return useQuery({
    queryKey: superAdminKeys.stats,
    queryFn: ({ signal }) => superAdminService.getDashboardData({ signal }),
  });
}

export function useHealthScores() {
  return useQuery({
    queryKey: superAdminKeys.health,
    queryFn: ({ signal }) => superAdminService.getHealthScores({ signal }),
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: superAdminKeys.alerts,
    queryFn: ({ signal }) => superAdminService.getAlerts({ signal }),
  });
}

export function useTenantList(params?: TenantListParams) {
  return useQuery({
    queryKey: superAdminKeys.tenantList(params),
    queryFn: ({ signal }) => superAdminService.listTenants(params, { signal }),
    placeholderData: (prev) => prev,
  });
}

export function useTenantDetail(id: string) {
  return useQuery({
    queryKey: superAdminKeys.tenantDetail(id),
    queryFn: ({ signal }) => superAdminService.getTenantById(id, { signal }),
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTenantInput) => superAdminService.createTenant(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminKeys.tenants });
      toast.success(i18n.t('super_admin_tenants:clinicCreated'));
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTenantInput }) =>
      superAdminService.updateTenant(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: superAdminKeys.tenants });
      queryClient.invalidateQueries({ queryKey: superAdminKeys.tenantDetail(variables.id) });
      toast.success(i18n.t('super_admin_tenants:clinicUpdated'));
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => superAdminService.deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminKeys.tenants });
      toast.success(i18n.t('super_admin_tenants:clinicDeleted'));
    },
  });
}
