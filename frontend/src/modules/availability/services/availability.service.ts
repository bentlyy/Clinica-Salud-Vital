import { apiClient } from '@/shared/services/api-client';
import type {
  AvailabilityRule,
  CreateAvailabilityRuleInput,
  AvailabilityException,
  CreateAvailabilityExceptionInput,
} from '../types/availability.types';

export const availabilityService = {
  getRules: (opts?: { signal?: AbortSignal }): Promise<AvailabilityRule[]> =>
    apiClient.get('/availability/me', { signal: opts?.signal }).then((r) => r.data),

  createRule: (data: CreateAvailabilityRuleInput, opts?: { signal?: AbortSignal }): Promise<AvailabilityRule> =>
    apiClient.post('/availability', data, { signal: opts?.signal }).then((r) => r.data),

  deleteRule: (id: number, opts?: { signal?: AbortSignal }): Promise<void> =>
    apiClient.delete(`/availability/${id}`, { signal: opts?.signal }).then((r) => r.data),

  getExceptions: (opts?: { signal?: AbortSignal }): Promise<AvailabilityException[]> =>
    apiClient.get('/availability-exceptions/me', { signal: opts?.signal }).then((r) => r.data),

  createException: (data: CreateAvailabilityExceptionInput, opts?: { signal?: AbortSignal }): Promise<AvailabilityException> =>
    apiClient.post('/availability-exceptions', data, { signal: opts?.signal }).then((r) => r.data),

  deleteException: (id: number, opts?: { signal?: AbortSignal }): Promise<void> =>
    apiClient.delete(`/availability-exceptions/${id}`, { signal: opts?.signal }).then((r) => r.data),
};
