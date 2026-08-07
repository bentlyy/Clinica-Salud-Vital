import type { AxiosRequestConfig } from 'axios';
import { apiClient } from '@/shared/services/api-client';
import type { Booking, BookingListParams } from '../types/booking.types';
import type { PaginatedResponse } from '@/shared/types/api.types';

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

function normalizeBooking(raw: Record<string, unknown>): Booking {
  return {
    ...raw,
    date: normalizeDate(raw.date),
    time: normalizeTime(raw.time),
  } as Booking;
}

function normalizePaginatedResponse(raw: Record<string, unknown>): PaginatedResponse<Booking> {
  const rows = Array.isArray(raw.data) ? raw.data : [];
  return {
    data: rows.map((r: Record<string, unknown>) => normalizeBooking(r)),
    total: Number(raw.total ?? rows.length),
    page: Number(raw.page ?? 1),
    limit: Number(raw.limit ?? rows.length),
    totalPages: Number(raw.totalPages ?? 1),
  };
}

function applyClientFilter(
  response: PaginatedResponse<Booking>,
  params?: BookingListParams,
): PaginatedResponse<Booking> {
  let filtered = response.data;
  if (params?.status) {
    filtered = filtered.filter((b) => b.status === params.status);
  }
  return {
    ...response,
    data: filtered,
    total: filtered.length,
    totalPages: 1,
  };
}

export const bookingService = {
  getMyBookings: (params?: BookingListParams, config?: AxiosRequestConfig): Promise<PaginatedResponse<Booking>> =>
    apiClient.get('/bookings/me', { params, ...config })
      .then((r) => applyClientFilter(normalizePaginatedResponse(r.data), params)),

  getDoctorBookings: (params?: BookingListParams, config?: AxiosRequestConfig): Promise<PaginatedResponse<Booking>> =>
    apiClient.get('/bookings/doctor', { params, ...config })
      .then((r) => applyClientFilter(normalizePaginatedResponse(r.data), params)),

  getAllBookings: (params?: BookingListParams, config?: AxiosRequestConfig): Promise<PaginatedResponse<Booking>> =>
    apiClient.get('/bookings/all', { params, ...config })
      .then((r) => applyClientFilter(normalizePaginatedResponse(r.data), params)),

  create: (data: import('../types/booking.types').CreateBookingInput, config?: AxiosRequestConfig): Promise<Booking> =>
    apiClient.post('/bookings', data, config).then((r) => normalizeBooking(r.data)),

  cancel: (id: number, reason?: string, config?: AxiosRequestConfig): Promise<Booking> =>
    apiClient.patch(`/bookings/${id}/cancel`, reason ? { reason } : undefined, config).then((r) => r.data),

  getAvailableSlots: (doctorId: number, date: string, config?: AxiosRequestConfig): Promise<string[]> =>
    apiClient
      .get('/bookings/available-slots', { params: { doctor_id: doctorId, date }, ...config })
      .then((r) => r.data),

  getDailyDensity: (
    start: string,
    end: string,
    config?: AxiosRequestConfig,
  ): Promise<{ data: { date: string; count: number }[] }> =>
    apiClient
      .get('/bookings/doctor/daily-density', { params: { start, end }, ...config })
      .then((r) => r.data),
};
