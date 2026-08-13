import { apiClient } from '@/shared/services/api-client';
import type { Holiday, CreateHolidayInput } from '../types/holiday.types';

export const holidayService = {
  list: (): Promise<Holiday[]> =>
    apiClient.get<{ data: Holiday[] }>('/holidays').then((r) => r.data.data),

  create: (input: CreateHolidayInput): Promise<{ holiday: Holiday; cancelled_bookings: number; short_notice: boolean }> =>
    apiClient.post('/holidays', input).then((r) => r.data),

  remove: (id: number): Promise<void> =>
    apiClient.delete(`/holidays/${id}`).then(() => undefined),
};
