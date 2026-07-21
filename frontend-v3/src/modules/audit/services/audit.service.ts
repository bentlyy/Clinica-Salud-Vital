import { apiClient } from '@/shared/services/api-client';
import type { PaginatedResponse } from '@/shared/types/api.types';
import type { AuditLog, AuditListParams } from '../types/audit.types';

export const auditService = {
  list(params?: AuditListParams): Promise<PaginatedResponse<AuditLog>> {
    return apiClient.get('/audit', { params }).then((r) => r.data);
  },
};
