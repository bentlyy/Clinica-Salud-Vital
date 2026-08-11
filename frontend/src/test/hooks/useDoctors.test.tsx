import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const doctorService = vi.hoisted(() => ({
  list: vi.fn(),
  listPublic: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  invite: vi.fn(),
  getStats: vi.fn(),
  getSchedule: vi.fn(),
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('@/modules/doctors/services/doctor.service', () => ({ doctorService }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/i18n/i18n', () => ({ default: { t: (key: string) => key, language: 'es' } }));

import {
  useDoctorList,
  usePublicDoctorList,
  useDoctorDetail,
  useDoctorStats,
  useDoctorSchedule,
  useCreateDoctor,
  useUpdateDoctor,
  useInviteDoctor,
} from '@/modules/doctors/hooks/useDoctors';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const doctor = {
  id: 1,
  user_id: 100,
  name: 'Juan Perez',
  email: 'juan@clinic.com',
  specialty: 'Cardiología',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

describe('useDoctors hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    doctorService.list.mockResolvedValue({ data: [doctor], total: 1, page: 1, limit: 10, totalPages: 1 });
    doctorService.listPublic.mockResolvedValue([doctor]);
    doctorService.getById.mockResolvedValue(doctor);
    doctorService.create.mockResolvedValue(doctor);
    doctorService.update.mockResolvedValue(doctor);
    doctorService.invite.mockResolvedValue({ message: 'ok' });
    doctorService.getStats.mockResolvedValue({ total_patients: 1 });
    doctorService.getSchedule.mockResolvedValue([]);
  });

  it('useDoctorList queries the doctor list with params', async () => {
    const { result } = renderHook(() => useDoctorList({ search: 'juan' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(doctorService.list).toHaveBeenCalledWith(
      { search: 'juan' },
      { signal: expect.any(AbortSignal) },
    );
    expect(result.current.data?.total).toBe(1);
  });

  it('usePublicDoctorList queries the public doctor list', async () => {
    const { result } = renderHook(() => usePublicDoctorList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(doctorService.listPublic).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(result.current.data).toHaveLength(1);
  });

  it('useDoctorDetail is disabled for id <= 0', async () => {
    const { result } = renderHook(() => useDoctorDetail(0), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(doctorService.getById).not.toHaveBeenCalled();
  });

  it('useDoctorDetail fetches the doctor for a positive id', async () => {
    const { result } = renderHook(() => useDoctorDetail(3), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(doctorService.getById).toHaveBeenCalledWith(3, { signal: expect.any(AbortSignal) });
  });

  it('useDoctorStats fetches the doctor stats', async () => {
    const { result } = renderHook(() => useDoctorStats(3), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(doctorService.getStats).toHaveBeenCalledWith(3, { signal: expect.any(AbortSignal) });
  });

  it('useDoctorSchedule fetches the doctor schedule', async () => {
    const { result } = renderHook(() => useDoctorSchedule(3), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(doctorService.getSchedule).toHaveBeenCalledWith(3, { signal: expect.any(AbortSignal) });
  });

  it('useCreateDoctor creates a doctor and shows a success toast', async () => {
    const { result } = renderHook(() => useCreateDoctor(), { wrapper: createWrapper() });

    result.current.mutate({ name: 'Ana', email: 'ana@clinic.com' });

    await waitFor(() =>
      expect(doctorService.create).toHaveBeenCalledWith({ name: 'Ana', email: 'ana@clinic.com' }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('doctors:doctorCreated'));
  });

  it('useUpdateDoctor updates a doctor and shows a success toast', async () => {
    const { result } = renderHook(() => useUpdateDoctor(), { wrapper: createWrapper() });

    result.current.mutate({ id: 4, input: { name: 'Nuevo' } });

    await waitFor(() => expect(doctorService.update).toHaveBeenCalledWith(4, { name: 'Nuevo' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('doctors:doctorUpdated'));
  });

  it('useInviteDoctor invites a doctor and shows a success toast', async () => {
    const { result } = renderHook(() => useInviteDoctor(), { wrapper: createWrapper() });

    result.current.mutate({ id: 4, email: 'doc@clinic.com' });

    await waitFor(() =>
      expect(doctorService.invite).toHaveBeenCalledWith(4, 'doc@clinic.com'),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('doctors:inviteSent'));
  });
});
