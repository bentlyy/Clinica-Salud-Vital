export interface WaitlistEntry {
  id: number;
  tenant_id: string;
  doctor_id: number;
  user_id: number;
  requested_date: string;
  status: string;
  notified_at: string | null;
  created_at: string;
  doctor_name?: string;
  patient_name?: string;
}
