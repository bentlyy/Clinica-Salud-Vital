import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useSpecialtyList,
  useSpecialtyDetail,
  useCreateSpecialty,
  useUpdateSpecialty,
  useDeleteSpecialty,
  specialtyKeys,
} from '@/modules/specialties/hooks/useSpecialties';
import { specialtyService } from '@/modules/specialties/services/specialty.service';
import toast from 'react-hot-toast';

vi.mock('@/modules/specialties/services/specialty.service', () => ({
  specialtyService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn(), t: (key: string) => key },
}));

const mockedService = vi.mocked(specialtyService);
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

const specialty = {
  id: 1,
  tenant_id: 't1',
  name: 'Cardiología',
  icon: '🫀',
  description: 'Cuidado del corazón',
  department: 'Cardiología',
  procedures: ['Consulta'],
  color: '#1976D2',
  created_at: '2026-01-01T00:00:00Z',
};

describe('specialty query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useSpecialtyList fetches the list and forwards params and signal', async () => {
    mockedService.list.mockResolvedValue({ data: [specialty], total: 1, page: 1, limit: 1, totalPages: 1 });
    const { result } = renderHook(() => useSpecialtyList({ search: 'cardio' }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.list).toHaveBeenCalledWith({ search: 'cardio' }, { signal: expect.anything() });
    expect(result.current.data?.data).toEqual([specialty]);
  });

  it('useSpecialtyDetail fetches a specialty by id', async () => {
    mockedService.getById.mockResolvedValue(specialty);
    const { result } = renderHook(() => useSpecialtyDetail(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.getById).toHaveBeenCalledWith(1, { signal: expect.anything() });
    expect(result.current.data?.name).toBe('Cardiología');
  });

  it('useSpecialtyDetail does not fetch when the id is not positive', async () => {
    const { result } = renderHook(() => useSpecialtyDetail(0), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(mockedService.getById).not.toHaveBeenCalled();
  });
});

describe('specialty mutation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useCreateSpecialty creates, invalidates the list and shows a toast', async () => {
    mockedService.create.mockResolvedValue(specialty);
    const { result } = renderHook(() => useCreateSpecialty(), { wrapper: createWrapper() });

    result.current.mutate({ name: 'Cardiología' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.create).toHaveBeenCalledWith({ name: 'Cardiología' });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: specialtyKeys.all });
    expect(mockedToast.success).toHaveBeenCalledWith('specialties:specialtyCreated');
  });

  it('useUpdateSpecialty updates, invalidates list and detail and shows a toast', async () => {
    mockedService.update.mockResolvedValue(specialty);
    const { result } = renderHook(() => useUpdateSpecialty(), { wrapper: createWrapper() });

    result.current.mutate({ id: 1, input: { name: 'Cardio 2' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.update).toHaveBeenCalledWith(1, { name: 'Cardio 2' });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: specialtyKeys.all });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: specialtyKeys.detail(1) });
    expect(mockedToast.success).toHaveBeenCalledWith('specialties:specialtyUpdated');
  });

  it('useDeleteSpecialty removes, invalidates the list and shows a toast', async () => {
    mockedService.remove.mockResolvedValue({ message: 'ok' });
    const { result } = renderHook(() => useDeleteSpecialty(), { wrapper: createWrapper() });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.remove).toHaveBeenCalledWith(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: specialtyKeys.all });
    expect(mockedToast.success).toHaveBeenCalledWith('specialties:specialtyDeleted');
  });
});
