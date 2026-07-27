import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type { Patient, PatientListParams } from '../types/patient.types';

interface BackendUserRow {
  id: number;
  email: string;
  name: string;
  role: string;
  rut?: string;
  phone?: string;
  active: boolean;
  created_at: string;
}

interface BackendPaginatedResponse {
  data: BackendUserRow[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function mapPatient(row: BackendUserRow): Patient {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    is_active: row.active,
    created_at: row.created_at,
  };
}

export const patientService = {
  async list(params: PatientListParams = {}, opts?: { signal?: AbortSignal }): Promise<PaginatedResponse<Patient>> {
    const baseParams: Record<string, unknown> = {
      limit: params.limit ?? 20,
      search: params.search || undefined,
    };

    const fetchRole = async (role: string): Promise<BackendPaginatedResponse> => {
      const { data } = await apiClient.get<BackendPaginatedResponse>('/doctors/users', {
        params: { ...baseParams, role },
        signal: opts?.signal,
      });
      return data;
    };

    const [userRes, patientRes] = await Promise.all([
      fetchRole('user'),
      fetchRole('patient'),
    ]);

    const allRows = [...(userRes.data ?? []), ...(patientRes.data ?? [])];
    const deduped = new Map<number, BackendUserRow>();
    for (const row of allRows) {
      if (!deduped.has(row.id)) deduped.set(row.id, row);
    }
    const allPatients = [...deduped.values()].map(mapPatient);

    let filtered = allPatients;
    if (params.gender) {
      filtered = allPatients.filter((p) => !p.gender || p.gender === params.gender);
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      data: paginated,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  },
};
