import { apiClient } from '@/shared/services/api-client';
import type {
  AvailabilityRule,
  CreateAvailabilityRuleInput,
} from '../types/availability.types';

export const availabilityService = {
  getRules: (): Promise<AvailabilityRule[]> =>
    apiClient.get('/availability').then((r) => r.data),

  createRule: (data: CreateAvailabilityRuleInput): Promise<AvailabilityRule> =>
    apiClient.post('/availability', data).then((r) => r.data),

  deleteRule: (id: number): Promise<void> =>
    apiClient.delete(`/availability/${id}`).then((r) => r.data),
};
