import { apiClient } from '@/shared/services/api-client';
import type {
  OnboardingApplication,
  OnboardingApplicationDetail,
  OnboardingApplicationsResponse,
  OnboardingDocument,
  OnboardingDocumentCategory,
  OnboardingProfile,
  OnboardingProfileUpdate,
  OnboardPayload,
  SaasPlan,
} from '../types/onboarding.types';

export interface UploadDocumentInput {
  category: OnboardingDocumentCategory;
  file_name: string;
  mime_type: string;
  data_base64: string;
}

export const onboardingService = {
  // Formulario público de contratación
  async getPlans(): Promise<SaasPlan[]> {
    const { data } = await apiClient.get<{ data: SaasPlan[] }>('/saas/plans');
    return data.data;
  },

  async onboardTenant(payload: OnboardPayload): Promise<{ tenantId: string; message: string }> {
    const { data } = await apiClient.post<{ tenantId: string; message: string }>('/saas/onboard', payload);
    return data;
  },

  // Perfil y documentos (clínica autenticada)
  async getMyOnboarding(): Promise<OnboardingProfile | null> {
    const { data } = await apiClient.get<{ data: OnboardingProfile | null }>('/saas/onboarding');
    return data.data;
  },

  async updateProfile(profile: OnboardingProfileUpdate): Promise<OnboardingProfile> {
    const { data } = await apiClient.patch<{ data: OnboardingProfile }>('/saas/onboarding', profile);
    return data.data;
  },

  async listDocuments(): Promise<OnboardingDocument[]> {
    const { data } = await apiClient.get<{ data: OnboardingDocument[] }>('/saas/onboarding/documents');
    return data.data;
  },

  async uploadDocument(input: UploadDocumentInput): Promise<OnboardingDocument> {
    const { data } = await apiClient.post<{ data: OnboardingDocument }>('/saas/onboarding/documents', input);
    return data.data;
  },

  async downloadDocument(id: number): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(`/saas/onboarding/documents/${id}/download`, {
      responseType: 'blob',
    });
    return data;
  },

  async deleteDocument(id: number): Promise<void> {
    await apiClient.delete(`/saas/onboarding/documents/${id}`);
  },

  // Panel superadmin
  async listApplications(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<OnboardingApplicationsResponse> {
    const { data } = await apiClient.get<OnboardingApplicationsResponse>('/saas/onboarding/applications', {
      params,
    });
    return data;
  },

  async getApplication(id: number): Promise<OnboardingApplicationDetail> {
    const { data } = await apiClient.get<{ data: OnboardingApplicationDetail }>(`/saas/onboarding/applications/${id}`);
    return data.data;
  },

  async approveApplication(id: number): Promise<void> {
    await apiClient.patch(`/saas/onboarding/applications/${id}/approve`);
  },

  async rejectApplication(id: number, reason: string): Promise<void> {
    await apiClient.patch(`/saas/onboarding/applications/${id}/reject`, { reason });
  },
};

export type { OnboardingApplication };/**
 * Helper para convertir un File del navegador a base64 (sin prefijo data:).
 */
export function fileToBase64(file: File): Promise<{ file_name: string; mime_type: string; data_base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? (result.split(',')[1] ?? '') : result;
      resolve({ file_name: file.name, mime_type: file.type || 'application/octet-stream', data_base64: base64 });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}