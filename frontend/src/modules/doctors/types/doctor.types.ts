export interface Doctor {
  id: number;
  user_id: number;
  name: string;
  email: string;
  specialty?: string;
  specialty_id?: number;
  license_number?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  is_active: boolean;
  consultation_fee?: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateDoctorInput {
  name: string;
  email: string;
  specialty_id?: number;
  license_number?: string;
  phone?: string;
  bio?: string;
  consultation_fee?: number;
}

export interface UpdateDoctorInput {
  name?: string;
  email?: string;
  specialty_id?: number;
  license_number?: string;
  phone?: string;
  bio?: string;
  consultation_fee?: number;
}

export interface DoctorStats {
  total_patients: number;
  total_appointments: number;
  today_appointments: number;
  completed_appointments: number;
  monthly_revenue: number;
}

export interface DoctorListParams {
  page?: number;
  limit?: number;
  search?: string;
  specialty_id?: number;
  is_active?: boolean;
}

export interface DoctorScheduleSlot {
  id: number;
  doctor_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}
