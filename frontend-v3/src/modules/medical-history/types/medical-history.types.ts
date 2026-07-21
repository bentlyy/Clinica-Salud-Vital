export type MedicalHistoryStatus = 'active' | 'resolved' | 'chronic' | 'family';

export interface MedicalHistoryEntry {
  id: number;
  tenant_id: number;
  patient_id: number;
  condition: string;
  onset_date?: string;
  status: MedicalHistoryStatus;
  notes?: string;
  created_at: string;
}

export interface CreateMedicalHistoryInput {
  patient_id: number;
  condition: string;
  onset_date?: string;
  status: MedicalHistoryStatus;
  notes?: string;
}

export interface UpdateMedicalHistoryInput extends Partial<CreateMedicalHistoryInput> {}

export interface MedicalHistoryListParams {
  page?: number;
  limit?: number;
  patient_id?: number;
  status?: MedicalHistoryStatus;
  search?: string;
}
