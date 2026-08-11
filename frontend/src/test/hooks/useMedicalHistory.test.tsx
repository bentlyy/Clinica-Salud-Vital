import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { MedicalHistoryEntry, CreateMedicalHistoryInput, UpdateMedicalHistoryInput } from '@/modules/medical-history/types/medical-history.types';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const i18nMock = vi.hoisted(() => ({
  t: vi.fn((key: string) => `[${key}]`),
}));

vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/i18n/i18n', () => ({ default: i18nMock }));

const medicalHistoryService = vi.hoisted(() => ({
  list: vi.fn(),
  getByPatient: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/modules/medical-history/services/medical-history.service', () => ({ medicalHistoryService }));

import {
  useMedicalHistory,
  usePatientMedicalHistory,
  useCreateMedicalHistory,
  useUpdateMedicalHistory,
} from '@/modules/medical-history/hooks/useMedicalHistory';

const entry: MedicalHistoryEntry = {
  id: 1,
  tenant_id: 't1',
  patient_id: 10,
  patient_name: 'Maria Garcia',
  condition: 'Hipertensión',
  onset_date: '2025-01-01',
  status: 'active',
  notes: 'Control mensual',
  created_at: '2026-08-01T10:00:00Z',
};

const paginated = { data: [entry], total: 1, page: 1, limit: 10, totalPages: 1 };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useMedicalHistory hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useMedicalHistory: fetches the paginated list', async () => {
    medicalHistoryService.list.mockResolvedValue(paginated);
    const { result } = renderHook(() => useMedicalHistory({ page: 1, limit: 10 }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(medicalHistoryService.list).toHaveBeenCalled();
    expect(result.current.data?.data).toEqual([entry]);
  });

  it('usePatientMedicalHistory: stays disabled for null patientId', () => {
    const { result } = renderHook(() => usePatientMedicalHistory(null), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(medicalHistoryService.getByPatient).not.toHaveBeenCalled();
  });

  it('usePatientMedicalHistory: fetches by patient id', async () => {
    medicalHistoryService.getByPatient.mockResolvedValue([entry]);
    const { result } = renderHook(() => usePatientMedicalHistory(10), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(medicalHistoryService.getByPatient).toHaveBeenCalledWith(10, expect.any(Object));
    expect(result.current.data).toEqual([entry]);
  });

  it('useCreateMedicalHistory: creates and toasts', async () => {
    medicalHistoryService.create.mockResolvedValue(entry);
    const { result } = renderHook(() => useCreateMedicalHistory(), { wrapper: createWrapper() });

    const input: CreateMedicalHistoryInput = { patient_id: 10, condition: 'Hipertensión', status: 'active' };
    result.current.mutate(input);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(medicalHistoryService.create).toHaveBeenCalledWith(input);
    expect(toast.success).toHaveBeenCalledWith('[medical_history:entryCreated]');
  });

  it('useUpdateMedicalHistory: updates and toasts', async () => {
    medicalHistoryService.update.mockResolvedValue(entry);
    const { result } = renderHook(() => useUpdateMedicalHistory(), { wrapper: createWrapper() });

    const input: UpdateMedicalHistoryInput = { notes: 'Nueva nota' };
    result.current.mutate({ id: 1, input });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(medicalHistoryService.update).toHaveBeenCalledWith(1, input);
    expect(toast.success).toHaveBeenCalledWith('[medical_history:entryUpdated]');
  });
});
