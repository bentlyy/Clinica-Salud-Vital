import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { ClinicalRecord, CreateClinicalRecordInput, UpdateClinicalRecordInput } from '@/modules/clinical-records/types/clinical-record.types';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const i18nMock = vi.hoisted(() => ({
  t: vi.fn((key: string) => `[${key}]`),
}));

vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/i18n/i18n', () => ({ default: i18nMock }));

const clinicalRecordService = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  getByPatient: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/modules/clinical-records/services/clinical-record.service', () => ({ clinicalRecordService }));

import {
  useClinicalRecords,
  useClinicalRecordDetail,
  usePatientRecords,
  useCreateClinicalRecord,
  useUpdateClinicalRecord,
  useDeleteClinicalRecord,
} from '@/modules/clinical-records/hooks/useClinicalRecords';

const record: ClinicalRecord = {
  id: 1,
  tenant_id: 1,
  patient_id: 10,
  doctor_id: 5,
  chief_complaint: 'Dolor de cabeza',
  diagnosis: 'Migraña',
  treatment: 'Reposo',
  patient_name: 'Maria Garcia',
  doctor_name: 'Dr. Perez',
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
};

const paginated = { data: [record], total: 1, page: 1, limit: 10, totalPages: 1 };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useClinicalRecords hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useClinicalRecords: fetches the paginated list', async () => {
    clinicalRecordService.list.mockResolvedValue(paginated);
    const { result } = renderHook(() => useClinicalRecords({ page: 1, limit: 10 }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clinicalRecordService.list).toHaveBeenCalled();
    expect(result.current.data?.data).toEqual([record]);
  });

  it('useClinicalRecordDetail: stays disabled for null id', () => {
    const { result } = renderHook(() => useClinicalRecordDetail(null), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(clinicalRecordService.getById).not.toHaveBeenCalled();
  });

  it('useClinicalRecordDetail: fetches detail by id', async () => {
    clinicalRecordService.getById.mockResolvedValue(record);
    const { result } = renderHook(() => useClinicalRecordDetail(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clinicalRecordService.getById).toHaveBeenCalledWith(1, expect.any(Object));
    expect(result.current.data).toEqual(record);
  });

  it('usePatientRecords: stays disabled for null patientId', () => {
    const { result } = renderHook(() => usePatientRecords(null), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(clinicalRecordService.getByPatient).not.toHaveBeenCalled();
  });

  it('usePatientRecords: fetches by patient id', async () => {
    clinicalRecordService.getByPatient.mockResolvedValue([record]);
    const { result } = renderHook(() => usePatientRecords(10), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clinicalRecordService.getByPatient).toHaveBeenCalledWith(10, expect.any(Object));
    expect(result.current.data).toEqual([record]);
  });

  it('useCreateClinicalRecord: creates and toasts', async () => {
    clinicalRecordService.create.mockResolvedValue(record);
    const { result } = renderHook(() => useCreateClinicalRecord(), { wrapper: createWrapper() });

    const input: CreateClinicalRecordInput = {
      patient_id: 10,
      chief_complaint: 'Dolor de cabeza',
      diagnosis: 'Migraña',
      treatment: 'Reposo',
    };
    result.current.mutate(input);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(clinicalRecordService.create).toHaveBeenCalledWith(input);
    expect(toast.success).toHaveBeenCalledWith('[clinical_records:created]');
  });

  it('useUpdateClinicalRecord: updates and toasts', async () => {
    clinicalRecordService.update.mockResolvedValue(record);
    const { result } = renderHook(() => useUpdateClinicalRecord(), { wrapper: createWrapper() });

    const input: UpdateClinicalRecordInput = { diagnosis: 'Migraña crónica' };
    result.current.mutate({ id: 1, input });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(clinicalRecordService.update).toHaveBeenCalledWith(1, input);
    expect(toast.success).toHaveBeenCalledWith('[clinical_records:updated]');
  });

  it('useDeleteClinicalRecord: deletes and toasts', async () => {
    clinicalRecordService.remove.mockResolvedValue({});
    const { result } = renderHook(() => useDeleteClinicalRecord(), { wrapper: createWrapper() });

    result.current.mutate(1);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(clinicalRecordService.remove).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('[clinical_records:deleted]');
  });
});
