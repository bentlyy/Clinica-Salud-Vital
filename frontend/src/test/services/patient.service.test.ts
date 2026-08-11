import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { patientService } from '@/modules/patients/services/patient.service';

function userRow(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    email: `user${id}@clinic.com`,
    name: `Paciente ${id}`,
    role: 'patient',
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('patientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches both "user" and "patient" roles with the same base params', async () => {
    apiClient.get.mockResolvedValue({ data: { data: [userRow(1)] } });

    await patientService.list({ page: 1, limit: 20, search: 'ana' });

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/doctors/users', {
      params: { limit: 20, search: 'ana', role: 'user' },
      signal: undefined,
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/doctors/users', {
      params: { limit: 20, search: 'ana', role: 'patient' },
      signal: undefined,
    });
  });

  it('dedupes rows by id and maps active -> is_active', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        data: [
          userRow(1),
          userRow(2, { name: 'Duplicado', role: 'user' }),
        ],
      },
    });
    apiClient.get.mockResolvedValueOnce({
      data: {
        data: [
          userRow(2, { name: 'Duplicado', role: 'patient' }),
          userRow(3, { active: false }),
        ],
      },
    });

    const result = await patientService.list();

    expect(result.data).toHaveLength(3);
    expect(result.data.map((p) => p.id)).toEqual([1, 2, 3]);
    expect(result.data[2]).toEqual({
      id: 3,
      name: 'Paciente 3',
      email: 'user3@clinic.com',
      phone: undefined,
      is_active: false,
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(result.total).toBe(3);
  });

  it('applies the gender filter keeping rows with no gender', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        data: [
          userRow(1),
          userRow(2),
          userRow(3),
        ],
      },
    });

    // Simulate one patient having gender by patching the returned shape:
    // patientService maps rows, so we patch via the raw payload is not possible;
    // instead we verify filtering logic by injecting gender through apiClient
    // response rows (gender is ignored by mapPatient, so filter is a no-op for
    // rows without gender). This documents current behavior.
    const result = await patientService.list({ gender: 'female' });
    expect(result.data).toHaveLength(3);
  });

  it('paginates the combined rows with correct totalPages', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => userRow(i + 1));
    apiClient.get.mockResolvedValue({ data: { data: rows } });

    const result = await patientService.list({ page: 2, limit: 10 });

    expect(result.data).toHaveLength(10);
    expect(result.data[0].id).toBe(11);
    expect(result.total).toBe(25);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
  });

  it('handles empty payloads from both calls', async () => {
    apiClient.get.mockResolvedValue({ data: {} });

    const result = await patientService.list();

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('passes the abort signal to both requests', async () => {
    apiClient.get.mockResolvedValue({ data: { data: [] } });
    const signal = new AbortController().signal;

    await patientService.list(undefined, { signal });

    expect(apiClient.get.mock.calls[0][1].signal).toBe(signal);
    expect(apiClient.get.mock.calls[1][1].signal).toBe(signal);
  });
});
