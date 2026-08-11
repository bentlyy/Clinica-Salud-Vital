import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useSuperAdminStats,
  useSuperAdminDashboard,
  useHealthScores,
  useAlerts,
  useTenantList,
  useTenantDetail,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
  superAdminKeys,
} from '@/modules/super-admin/hooks/useSuperAdmin';
import { superAdminService } from '@/modules/super-admin/services/super-admin.service';
import toast from 'react-hot-toast';

vi.mock('@/modules/super-admin/services/super-admin.service', () => ({
  superAdminService: {
    getStats: vi.fn(),
    getDashboardData: vi.fn(),
    getHealthScores: vi.fn(),
    getAlerts: vi.fn(),
    listTenants: vi.fn(),
    getTenantById: vi.fn(),
    createTenant: vi.fn(),
    updateTenant: vi.fn(),
    deleteTenant: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn(), t: (key: string) => key },
}));

const mockedService = vi.mocked(superAdminService);
const mockedToast = vi.mocked(toast);

let queryClient: QueryClient;

function createWrapper() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  vi.spyOn(queryClient, 'invalidateQueries');
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const tenant = {
  id: 't1',
  name: 'Clínica Norte',
  slug: 'clinica-norte',
  domain: 'norte.clinic.com',
  active: true,
  plan: 'pro',
  total_bookings: 12,
  total_users: 5,
  total_doctors: 2,
  created_at: '2026-01-01T00:00:00Z',
};

describe('super-admin query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useSuperAdminStats fetches the stats endpoint', async () => {
    mockedService.getStats.mockResolvedValue({ tenants: 4 });
    const { result } = renderHook(() => useSuperAdminStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.getStats).toHaveBeenCalledWith({ signal: expect.anything() });
    expect(result.current.data).toEqual({ tenants: 4 });
  });

  it('useSuperAdminDashboard fetches and maps the dashboard data', async () => {
    mockedService.getDashboardData.mockResolvedValue({ total_tenants: 2, tenants_by_plan: [] });
    const { result } = renderHook(() => useSuperAdminDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.getDashboardData).toHaveBeenCalledWith({ signal: expect.anything() });
    expect(result.current.data?.total_tenants).toBe(2);
  });

  it('useHealthScores fetches the health scores', async () => {
    mockedService.getHealthScores.mockResolvedValue([{ id: 't1', name: 'X', active: true, health_score: 80 }]);
    const { result } = renderHook(() => useHealthScores(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.getHealthScores).toHaveBeenCalledWith({ signal: expect.anything() });
    expect(result.current.data?.[0].health_score).toBe(80);
  });

  it('useAlerts fetches the alerts', async () => {
    mockedService.getAlerts.mockResolvedValue([{ tenant_id: 't1', tenant_name: 'X', type: 'churn', severity: 'high', message: 'm' }]);
    const { result } = renderHook(() => useAlerts(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.getAlerts).toHaveBeenCalledWith({ signal: expect.anything() });
    expect(result.current.data).toHaveLength(1);
  });

  it('useTenantList fetches tenants with params and forwards the signal', async () => {
    mockedService.listTenants.mockResolvedValue({ data: [tenant], total: 1, page: 1, limit: 10, totalPages: 1 });
    const { result } = renderHook(() => useTenantList({ page: 1, limit: 10 }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.listTenants).toHaveBeenCalledWith({ page: 1, limit: 10 }, { signal: expect.anything() });
    expect(result.current.data?.data).toEqual([tenant]);
  });

  it('useTenantDetail fetches the tenant by id', async () => {
    mockedService.getTenantById.mockResolvedValue({ ...tenant, plan_name: 'Pro' });
    const { result } = renderHook(() => useTenantDetail('t1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.getTenantById).toHaveBeenCalledWith('t1', { signal: expect.anything() });
    expect(result.current.data?.plan_name).toBe('Pro');
  });

  it('useTenantDetail does not fetch when the id is empty', async () => {
    const { result } = renderHook(() => useTenantDetail(''), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(mockedService.getTenantById).not.toHaveBeenCalled();
  });
});

describe('super-admin mutation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useCreateTenant creates, invalidates the list and shows a toast', async () => {
    mockedService.createTenant.mockResolvedValue(tenant);
    const { result } = renderHook(() => useCreateTenant(), { wrapper: createWrapper() });

    result.current.mutate({ name: 'Clínica Norte' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.createTenant).toHaveBeenCalledWith({ name: 'Clínica Norte' });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: superAdminKeys.tenants });
    expect(mockedToast.success).toHaveBeenCalledWith('super_admin_tenants:clinicCreated');
  });

  it('useUpdateTenant updates, invalidates list+detail and shows a toast', async () => {
    mockedService.updateTenant.mockResolvedValue(tenant);
    const { result } = renderHook(() => useUpdateTenant(), { wrapper: createWrapper() });

    result.current.mutate({ id: 't1', input: { name: 'Clínica Norte 2' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.updateTenant).toHaveBeenCalledWith('t1', { name: 'Clínica Norte 2' });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: superAdminKeys.tenants });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: superAdminKeys.tenantDetail('t1') });
    expect(mockedToast.success).toHaveBeenCalledWith('super_admin_tenants:clinicUpdated');
  });

  it('useDeleteTenant deletes, invalidates the list and shows a toast', async () => {
    mockedService.deleteTenant.mockResolvedValue({ message: 'ok' });
    const { result } = renderHook(() => useDeleteTenant(), { wrapper: createWrapper() });

    result.current.mutate('t1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.deleteTenant).toHaveBeenCalledWith('t1');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: superAdminKeys.tenants });
    expect(mockedToast.success).toHaveBeenCalledWith('super_admin_tenants:clinicDeleted');
  });
});
