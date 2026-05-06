import { UserRole } from './index.js';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  rut: string;
  phone?: string;
  role?: UserRole;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    rut: string;
  };
}

export interface BookingRequest {
  doctor_id: number;
  date: string;
  time: string;
}

export interface GuestBookingRequest {
  doctor_id: number;
  date: string;
  time: string;
  guest_name: string;
  guest_rut: string;
  guest_email: string;
  guest_phone: string;
}

export interface CreateDoctorRequest {
  name: string;
  specialty: string;
  email: string;
  user_id: number;
  slot_duration?: number;
}

export interface UpdateAvailabilityRequest {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface CreateClinicalRecordRequest {
  patient_id: number;
  doctor_id: number;
  booking_id: number;
  chief_complaint: string;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
}

export interface UpdateBookingStatusRequest {
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
}

export interface ConfirmationRequest {
  token: string;
}

export interface CreateInvoiceRequest {
  patient_id: number;
  items: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
  due_date: string;
}

export interface CreateLabRequestRequest {
  patient_id: number;
  doctor_id: number;
  tests: number[];
  notes?: string;
}

export interface AuditQueryParams {
  user_id?: number;
  action?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface AnalyticsQueryParams {
  start_date: string;
  end_date: string;
  doctor_id?: number;
}