export type UserRole = 'admin' | 'doctor' | 'patient' | 'guest' | 'user';

export interface User {
  id: number;
  email: string;
  password: string;
  role: UserRole;
  rut: string;
  name: string;
  phone?: string;
  blocked_until?: Date;
  no_show_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  email: string;
  user_id: number;
  slot_duration: number;
  created_at: Date;
  updated_at: Date;
}

export interface Booking {
  id: number;
  doctor_id: number;
  user_id?: number;
  guest_rut?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  confirmed: boolean;
  confirmation_token?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DoctorAvailability {
  id: number;
  doctor_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface DoctorException {
  id: number;
  doctor_id: number;
  date: string;
  is_full_day: boolean;
  start_time?: string;
  end_time?: string;
  reason?: string;
}

export interface ClinicalRecord {
  id: number;
  patient_id: number;
  doctor_id: number;
  booking_id: number;
  chief_complaint: string;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  patient_id: number;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  due_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LabRequest {
  id: number;
  patient_id: number;
  doctor_id: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type: string;
  resource_id?: number;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}