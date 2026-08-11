import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AvailabilityRule, AvailabilityException } from '@/modules/availability/types/availability.types';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { availabilityService } from '@/modules/availability/services/availability.service';

const rule: AvailabilityRule = {
  id: 1,
  doctor_id: 2,
  day_of_week: 1,
  start_time: '08:00',
  end_time: '12:00',
  created_at: '2026-08-01T10:00:00Z',
};

const exception: AvailabilityException = {
  id: 3,
  doctor_id: 2,
  date: '2026-09-01',
  start_time: null,
  end_time: null,
  reason: 'Vacaciones',
  created_at: '2026-08-01T10:00:00Z',
};

describe('availabilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getRules: GETs /availability/me and unwraps data', async () => {
    apiClient.get.mockResolvedValue({ data: [rule] });
    const result = await availabilityService.getRules();
    expect(apiClient.get).toHaveBeenCalledWith('/availability/me', { signal: undefined });
    expect(result).toEqual([rule]);
  });

  it('createRule: POSTs /availability with input', async () => {
    apiClient.post.mockResolvedValue({ data: rule });
    const input = { day_of_week: 1, start_time: '08:00', end_time: '12:00' };
    const result = await availabilityService.createRule(input);
    expect(apiClient.post).toHaveBeenCalledWith('/availability', input, { signal: undefined });
    expect(result.id).toBe(1);
  });

  it('deleteRule: DELETEs /availability/:id', async () => {
    apiClient.delete.mockResolvedValue({ data: undefined });
    await availabilityService.deleteRule(1);
    expect(apiClient.delete).toHaveBeenCalledWith('/availability/1', { signal: undefined });
  });

  it('getExceptions: GETs /availability-exceptions/me', async () => {
    apiClient.get.mockResolvedValue({ data: [exception] });
    const result = await availabilityService.getExceptions();
    expect(apiClient.get).toHaveBeenCalledWith('/availability-exceptions/me', { signal: undefined });
    expect(result).toEqual([exception]);
  });

  it('createException: POSTs /availability-exceptions', async () => {
    apiClient.post.mockResolvedValue({ data: exception });
    const input = { date: '2026-09-01', reason: 'Vacaciones' };
    const result = await availabilityService.createException(input);
    expect(apiClient.post).toHaveBeenCalledWith('/availability-exceptions', input, { signal: undefined });
    expect(result.reason).toBe('Vacaciones');
  });

  it('deleteException: DELETEs /availability-exceptions/:id', async () => {
    apiClient.delete.mockResolvedValue({ data: undefined });
    await availabilityService.deleteException(3);
    expect(apiClient.delete).toHaveBeenCalledWith('/availability-exceptions/3', { signal: undefined });
  });
});
