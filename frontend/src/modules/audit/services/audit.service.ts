import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type { AuditLog, AuditListParams } from '../types/audit.types';

export const auditService = {
  list(params?: AuditListParams, opts?: { signal?: AbortSignal }): Promise<PaginatedResponse<AuditLog>> {
    return apiClient.get('/audit', { params, signal: opts?.signal }).then((r) => r.data);
  },
};
