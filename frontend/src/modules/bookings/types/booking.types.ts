import type { PaginatedResponse } from '@/shared/types/api.types';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Booking {
  id: number;
  tenant_id: number;
  patient_id: number | null;
  doctor_id: number;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number; // minutes
  status: BookingStatus;
  notes: string | null;
  doctor_name?: string;
  patient_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingInput {
  doctor_id: number;
  date: string;
  time: string;
  duration?: number;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  notes?: string;
}

export interface BookingListParams {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  doctor_id?: number;
  date_from?: string;
  date_to?: string;
}

export type { PaginatedResponse };

export const BOOKING_STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: 'Pendiente', color: '#d97706', bgColor: '#fffbeb' },
  confirmed: { label: 'Confirmada', color: '#0d9488', bgColor: '#f0fdfa' },
  cancelled: { label: 'Cancelada', color: '#ef4444', bgColor: '#fef2f2' },
  completed: { label: 'Completada', color: '#2563eb', bgColor: '#eff6ff' },
  no_show: { label: 'No asistió', color: '#6b7280', bgColor: '#f3f4f6' },
};

export const BOOKING_STATUS_OPTIONS: { value: BookingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'no_show', label: 'No asistió' },
];
