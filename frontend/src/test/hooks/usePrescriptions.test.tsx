import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { Prescription, CreatePrescriptionInput, UpdatePrescriptionInput } from '@/modules/prescriptions/types/prescription.types';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const i18nMock = vi.hoisted(() => ({
  t: vi.fn((key: string) => `[${key}]`),
}));

vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/i18n/i18n', () => ({ default: i18nMock }));

const prescriptionService = vi.hoisted(() => ({
  listAll: vi.fn(),
  listByRecord: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  downloadPdf: vi.fn(),
}));

vi.mock('@/modules/prescriptions/services/prescription.service', () => ({ prescriptionService }));

import {
  usePrescriptionsByRecord,
  useAllPrescriptions,
  useCreatePrescription,
  useUpdatePrescription,
  useDeletePrescription,
  useDownloadPrescriptionPdf,
} from '@/modules/prescriptions/hooks/usePrescriptions';

const prescription: Prescription = {
  id: 1,
  tenant_id: 1,
  patient_id: 10,
  doctor_id: 5,
  medications: [{ name: 'Paracetamol', dosage: '500mg', frequency: 'cada 8h', duration: '7 dias' }],
  notes: 'Tomar con alimentos',
  doctor_name: 'Dr. Perez',
  patient_name: 'Maria Garcia',
  created_at: '2026-08-01T10:00:00Z',
};

const paginated = { data: [prescription], total: 1, page: 1, limit: 10, totalPages: 1 };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('usePrescriptions hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usePrescriptionsByRecord: stays disabled for recordId <= 0', () => {
    const { result } = renderHook(() => usePrescriptionsByRecord(0), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(prescriptionService.listByRecord).not.toHaveBeenCalled();
  });

  it('usePrescriptionsByRecord: fetches prescriptions for a record', async () => {
    prescriptionService.listByRecord.mockResolvedValue(paginated);
    const { result } = renderHook(() => usePrescriptionsByRecord(42), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(prescriptionService.listByRecord).toHaveBeenCalledWith(42, expect.any(Object));
    expect(result.current.data?.data).toEqual([prescription]);
  });

  it('useAllPrescriptions: fetches all prescriptions', async () => {
    prescriptionService.listAll.mockResolvedValue(paginated);
    const { result } = renderHook(() => useAllPrescriptions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(1);
  });

  it('useCreatePrescription: creates and toasts', async () => {
    prescriptionService.create.mockResolvedValue(prescription);
    const { result } = renderHook(() => useCreatePrescription(), { wrapper: createWrapper() });

    const input: CreatePrescriptionInput = { patient_id: 10, medications: prescription.medications };
    result.current.mutate(input);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(prescriptionService.create).toHaveBeenCalledWith(input);
    expect(toast.success).toHaveBeenCalledWith('[prescriptions:created]');
  });

  it('useUpdatePrescription: updates and toasts', async () => {
    prescriptionService.update.mockResolvedValue(prescription);
    const { result } = renderHook(() => useUpdatePrescription(), { wrapper: createWrapper() });

    const input: UpdatePrescriptionInput = { notes: 'Actualizada' };
    result.current.mutate({ id: 1, input });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(prescriptionService.update).toHaveBeenCalledWith(1, input);
    expect(toast.success).toHaveBeenCalledWith('[prescriptions:updated]');
  });

  it('useDeletePrescription: deletes and toasts', async () => {
    prescriptionService.remove.mockResolvedValue({});
    const { result } = renderHook(() => useDeletePrescription(), { wrapper: createWrapper() });

    result.current.mutate(1);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(prescriptionService.remove).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('[prescriptions:deleted]');
  });

  it('useDownloadPrescriptionPdf: downloads and does not toast on success', async () => {
    prescriptionService.downloadPdf.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDownloadPrescriptionPdf(), { wrapper: createWrapper() });

    result.current.mutate(7);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(prescriptionService.downloadPdf).toHaveBeenCalledWith(7);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('useDownloadPrescriptionPdf: toasts error on failure', async () => {
    prescriptionService.downloadPdf.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDownloadPrescriptionPdf(), { wrapper: createWrapper() });

    result.current.mutate(7);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('[prescriptions:downloadError]');
  });
});
