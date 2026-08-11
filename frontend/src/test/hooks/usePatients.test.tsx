import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const patientService = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock('@/modules/patients/services/patient.service', () => ({ patientService }));

import { usePatientList, patientKeys } from '@/modules/patients/hooks/usePatients';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('usePatientList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patientService.list.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it('fetches the patient list with the given params', async () => {
    const { result } = renderHook(() => usePatientList({ page: 1, limit: 20, search: 'ana' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(patientService.list).toHaveBeenCalledWith(
      { page: 1, limit: 20, search: 'ana' },
      { signal: expect.any(AbortSignal) },
    );
  });

  it('exposes the patient list keys factory', () => {
    expect(patientKeys.all).toEqual(['patients']);
    expect(patientKeys.list({ page: 1 })).toEqual(['patients', 'list', { page: 1 }]);
  });

  it('exposes the error state when the request fails', async () => {
    patientService.list.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => usePatientList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
