import { apiClient } from '@/shared/services/api-client';
import type {
  AvailabilityRule,
  CreateAvailabilityRuleInput,
  AvailabilityException,
  CreateAvailabilityExceptionInput,
} from '../types/availability.types';

export const availabilityService = {
  getRules: (): Promise<AvailabilityRule[]> =>
    apiClient.get('/availability/me').then((r) => r.data),

  createRule: (data: CreateAvailabilityRuleInput): Promise<AvailabilityRule> =>
    apiClient.post('/availability', data).then((r) => r.data),

  deleteRule: (id: number): Promise<void> =>
    apiClient.delete(`/availability/${id}`).then((r) => r.data),

  getExceptions: (): Promise<AvailabilityException[]> =>
    apiClient.get('/availability-exceptions/me').then((r) => r.data),

  createException: (data: CreateAvailabilityExceptionInput): Promise<AvailabilityException> =>
    apiClient.post('/availability-exceptions', data).then((r) => r.data),

  deleteException: (id: number): Promise<void> =>
    apiClient.delete(`/availability-exceptions/${id}`).then((r) => r.data),
};
