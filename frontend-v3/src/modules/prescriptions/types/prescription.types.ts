export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  id: number;
  tenant_id: number;
  patient_id: number;
  doctor_id: number;
  clinical_record_id?: number;
  medications: Medication[];
  notes?: string;
  doctor_name?: string;
  patient_name?: string;
  created_at: string;
}

export interface CreatePrescriptionInput {
  patient_id: number;
  clinical_record_id?: number;
  medications: Medication[];
  notes?: string;
}

export interface UpdatePrescriptionInput extends Partial<CreatePrescriptionInput> {}

export interface PrescriptionListParams {
  page?: number;
  limit?: number;
  patient_id?: number;
  doctor_id?: number;
  search?: string;
}
