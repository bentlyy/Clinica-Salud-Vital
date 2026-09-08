export type OnboardingStatus = 'pending' | 'approved' | 'rejected';

export type OnboardingDocumentCategory =
  | 'contract'
  | 'license'
  | 'tax_id'
  | 'constitution'
  | 'logo'
  | 'other';

export interface OnboardingDocument {
  id: number;
  category: OnboardingDocumentCategory;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: number | null;
  created_at: string;
}

export interface OnboardingProfile {
  id: number;
  tenant_id: string;
  company_name: string;
  plan_code: string;
  status: OnboardingStatus;
  admin_name: string | null;
  admin_email: string;
  legal_name: string | null;
  tax_id: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  phone: string | null;
  website: string | null;
  license_number: string | null;
  legal_entity_type: string | null;
  legal_representative_name: string | null;
  legal_representative_email: string | null;
  specialties: string[];
  doctor_count: number | null;
  operating_hours: Record<string, unknown> | null;
  notes: string | null;
  admin_phone: string | null;
  completeness_pct: number;
  missing_fields: string[];
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  documents: OnboardingDocument[];
}

export interface OnboardingDraftDocument {
  category: OnboardingDocumentCategory;
  file_name: string;
  mime_type: string;
  data_base64: string;
}

export interface OnboardPayload {
  tenant_name: string;
  domain: string;
  admin_email: string;
  admin_password: string;
  admin_name?: string;
  admin_phone?: string;
  locale?: string;
  timezone?: string;
  plan_code?: string;
  country?: string;
  legal_name?: string;
  tax_id?: string;
  region?: string;
  city?: string;
  address?: string;
  postal_code?: string;
  phone?: string;
  website?: string;
  license_number?: string;
  legal_entity_type?: string;
  legal_representative_name?: string;
  legal_representative_email?: string;
  specialties?: string[];
  doctor_count?: number;
  operating_hours?: Record<string, unknown>;
  notes?: string;
  documents?: OnboardingDraftDocument[];
}

export type OnboardingProfileUpdate = Partial<
  Pick<
    OnboardingProfile,
    | 'legal_name'
    | 'tax_id'
    | 'country'
    | 'region'
    | 'city'
    | 'address'
    | 'postal_code'
    | 'phone'
    | 'website'
    | 'license_number'
    | 'legal_entity_type'
    | 'legal_representative_name'
    | 'legal_representative_email'
    | 'specialties'
    | 'doctor_count'
    | 'operating_hours'
    | 'notes'
    | 'admin_phone'
  >
>;

export interface OnboardingApplication {
  id: number;
  tenant_id: string;
  company_name: string;
  country: string | null;
  city: string | null;
  tax_id: string | null;
  plan_code: string;
  status: OnboardingStatus;
  admin_name: string | null;
  admin_email: string;
  completeness_pct: number;
  doc_count: number;
  tenant_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingApplicationDetail extends OnboardingProfile {
  tenant_active: boolean;
  domain: string | null;
  total_users: number;
  total_bookings: number;
}

export interface OnboardingApplicationsResponse {
  data: OnboardingApplication[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface SaasPlan {
  id: number;
  name: string;
  code: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_doctors: number;
  max_patients: number;
  storage_gb: number;
  features: Record<string, boolean>;
  active: boolean;
  sort_order: number;
}