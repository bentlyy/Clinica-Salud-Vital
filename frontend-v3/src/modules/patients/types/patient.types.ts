export interface Patient {
  id: number;
  name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface PatientListParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  gender?: string;
}
