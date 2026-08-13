import { apiClient } from '@/shared/services/api-client';
import type { WaitlistEntry } from '../types/waitlist.types';

export const waitlistService = {
  join: (doctorId: number, requestedDate: string): Promise<WaitlistEntry> =>
    apiClient.post<WaitlistEntry>('/waitlist', { doctor_id: doctorId, requested_date: requestedDate }).then((r) => r.data),

  myList: (): Promise<WaitlistEntry[]> =>
    apiClient.get<{ data: WaitlistEntry[] }>('/waitlist/me').then((r) => r.data.data),

  leave: (id: number): Promise<void> =>
    apiClient.delete(`/waitlist/${id}`).then(() => undefined),
};
