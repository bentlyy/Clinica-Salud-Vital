import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type { AuditLog, AuditListParams } from '../types/audit.types';

export const auditService = {
  async list(params?: AuditListParams, opts?: { signal?: AbortSignal }): Promise<PaginatedResponse<AuditLog>> {
    const { data } = await apiClient.get<AuditLog[] | PaginatedResponse<AuditLog>>('/audit', { params, signal: opts?.signal });
    if (Array.isArray(data)) {
      return { data, total: data.length, page: params?.page ?? 1, limit: params?.limit ?? 20, totalPages: 1 };
    }
    return data;
  },
};
