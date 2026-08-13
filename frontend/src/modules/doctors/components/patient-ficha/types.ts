export interface FichaPatient {
  id: number;
  name: string;
  email?: string;
  rut?: string | null;
  phone?: string | null;
}

export interface FichaClinicalRecord {
  id: number;
  doctor_name?: string;
  diagnosis?: string;
  chief_complaint?: string;
  anamnesis?: string;
  treatment_plan?: string;
  created_at: string;
  status?: string;
}

export interface FichaLabRequest {
  id: number;
  patient_id: number | null;
  request_number: string;
  test_type?: string;
  status: string;
  priority?: string;
  results?: string;
  created_at: string;
}

export interface FichaMedicalHistoryEntry {
  id: number;
  condition: string;
  onset_date?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
}

export interface FichaPrescription {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface FichaPrescriptionRecord {
  clinical_record_id: number;
  patient_id: number;
  doctor_name?: string;
  created_at: string;
  medications: FichaPrescription[];
}

export interface FichaBooking {
  id: number;
  patient_id: number | null;
  patient_name?: string;
  guest_name: string | null;
  date: string;
  time: string;
  duration?: number;
  status: string;
}
