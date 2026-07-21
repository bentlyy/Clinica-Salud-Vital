import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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
  tenantDetail: (id: number) => ['super-admin', 'tenants', id] as const,
};

export function useSuperAdminStats() {
  return useQuery({
    queryKey: superAdminKeys.stats,
    queryFn: () => superAdminService.getStats(),
  });
}

export function useSuperAdminDashboard() {
  return useQuery({
    queryKey: superAdminKeys.stats,
    queryFn: () => superAdminService.getDashboardData(),
  });
}

export function useTenantList(params?: TenantListParams) {
  return useQuery({
    queryKey: superAdminKeys.tenantList(params),
    queryFn: () => superAdminService.listTenants(params),
    placeholderData: (prev) => prev,
  });
}

export function useTenantDetail(id: number) {
  return useQuery({
    queryKey: superAdminKeys.tenantDetail(id),
    queryFn: () => superAdminService.getTenantById(id),
    enabled: id > 0,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTenantInput) => superAdminService.createTenant(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminKeys.tenants });
      toast.success('Clínica creada exitosamente');
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTenantInput }) =>
      superAdminService.updateTenant(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: superAdminKeys.tenants });
      queryClient.invalidateQueries({ queryKey: superAdminKeys.tenantDetail(variables.id) });
      toast.success('Clínica actualizada exitosamente');
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => superAdminService.deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminKeys.tenants });
      toast.success('Clínica eliminada exitosamente');
    },
  });
}
