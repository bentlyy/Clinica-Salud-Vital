import { apiClient } from '@/shared/services/api-client';

export interface DashboardStats {
  total_patients: number;
  total_doctors: number;
  total_bookings: number;
  today_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
}

export interface UpcomingBooking {
  id: number;
  date: string;
  time: string;
  duration: number;
  status: string;
  doctor_name: string;
  patient_name: string | null;
  guest_name: string | null;
}

function normalizeDate(raw: unknown): string {
  if (!raw) return '';
  const s = String(raw);
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? s.split('T')[0] ?? s;
}

function normalizeTime(raw: unknown): string {
  if (!raw) return '';
  const s = String(raw);
  const match = s.match(/^(\d{2}:\d{2})/);
  return match?.[1] ?? s.slice(0, 5);
}

export const analyticsService = {
  getDashboardStats: async (opts?: { signal?: AbortSignal }): Promise<DashboardStats> => {
    const { data } = await apiClient.get<{ data: DashboardStats }>('/analytics/dashboard', { signal: opts?.signal });
    return data.data;
  },

  getMyDoctorStats: async (opts?: { signal?: AbortSignal }): Promise<{
    total_bookings: number;
    upcoming_bookings: number;
    patients_served: number;
    clinical_records: number;
  }> => {
    const { data } = await apiClient.get<{ data: Record<string, unknown> }>('/analytics/my-stats', { signal: opts?.signal });
    return data.data as {
      total_bookings: number;
      upcoming_bookings: number;
      patients_served: number;
      clinical_records: number;
    };
  },

  getUpcomingBookings: async (opts?: { signal?: AbortSignal }): Promise<UpcomingBooking[]> => {
    const today = new Date().toISOString().split('T')[0] ?? '';
    const { data } = await apiClient.get<{ data: Record<string, unknown>[] }>('/bookings/all', {
      params: { page: 1, limit: 10 },
      signal: opts?.signal,
    });
    return (data.data ?? [])
      .filter((b) => {
        const bDate = normalizeDate(b.date);
        return bDate >= today;
      })
      .map((b) => ({
        id: Number(b.id),
        date: normalizeDate(b.date),
        time: normalizeTime(b.time),
        duration: Number(b.duration) || 30,
        status: String(b.status),
        doctor_name: String(b.doctor_name || ''),
        patient_name: b.patient_name ? String(b.patient_name) : null,
        guest_name: b.guest_name ? String(b.guest_name) : null,
      }))
      .slice(0, 5);
  },

  getDoctorUpcomingBookings: async (opts?: { signal?: AbortSignal }): Promise<UpcomingBooking[]> => {
    const today = new Date().toISOString().split('T')[0] ?? '';
    const { data } = await apiClient.get<{ data: Record<string, unknown>[]; total: number }>('/bookings/doctor', {
      params: { page: 1, limit: 50 },
      signal: opts?.signal,
    });
    const rows = Array.isArray(data.data) ? data.data : [];
    return rows
      .filter((b) => {
        const bDate = normalizeDate(b.date);
        return bDate >= today;
      })
      .map((b) => ({
        id: Number(b.id),
        date: normalizeDate(b.date),
        time: normalizeTime(b.time),
        duration: Number(b.duration) || 30,
        status: String(b.status),
        doctor_name: '',
        patient_name: b.patient_name ? String(b.patient_name) : null,
        guest_name: b.guest_name ? String(b.guest_name) : null,
      }))
      .slice(0, 5);
  },
};
