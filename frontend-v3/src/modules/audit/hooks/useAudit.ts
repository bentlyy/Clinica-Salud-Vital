import { useQuery } from '@tanstack/react-query';
import { auditService } from '../services/audit.service';
import type { AuditListParams } from '../types/audit.types';

const STALE_TIME = 30_000;

export const auditKeys = {
  all: ['audit'] as const,
  list: (params?: AuditListParams) => ['audit', 'list', params] as const,
};

export function useAuditList(params?: AuditListParams) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditService.list(params),
    staleTime: STALE_TIME,
    placeholderData: (prev) => prev,
  });
}
