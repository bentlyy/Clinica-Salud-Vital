import { useState, useEffect, useCallback } from 'react';
import type { LabRequest, LabRequestStatus } from '../types';
import { getAllRequestsForLab } from '../api/laboratory.api';

export function useLabRequests(statusFilter?: LabRequestStatus | '') {
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllRequestsForLab(statusFilter || undefined);
      setRequests(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  return { requests, loading, error, refresh: fetch, setRequests };
}
