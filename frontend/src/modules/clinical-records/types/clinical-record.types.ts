export interface ClinicalRecord {
  id: number;
  tenant_id: number;
  patient_id: number;
  doctor_id: number;
  booking_id?: number;
  template_id?: number;
  chief_complaint: string;
  diagnosis: string;
  treatment_plan: string;
  notes?: string;
  vitals?: Record<string, string>;
  vital_signs?: Record<string, string>;
  anamnesis?: string;
  physical_exam?: string;
  cie10_codes?: string[];
  status?: string;
  attachments?: string[];
  doctor_name?: string;
  patient_name?: string;
  patient_rut?: string;
  patient_email?: string;
  specialty?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClinicalRecordInput {
  patient_id: number;
  doctor_id?: number;
  booking_id?: number;
  template_id?: number;
  chief_complaint: string;
  diagnosis: string;
  treatment_plan: string;
  notes?: string;
  vitals?: Record<string, string>;
}

export interface UpdateClinicalRecordInput extends Partial<CreateClinicalRecordInput> {}

export interface ClinicalRecordListParams {
  page?: number;
  limit?: number;
  patient_id?: number;
  doctor_id?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
}
