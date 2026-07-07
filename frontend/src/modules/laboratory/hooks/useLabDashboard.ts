import { useState, useEffect, useCallback } from 'react';
import type { LabDashboardMetrics } from '../types';
import { getDashboardMetrics } from '../api/laboratory.api';

export function useLabDashboard(areaId?: number | null) {
  const [metrics, setMetrics] = useState<LabDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardMetrics(areaId ?? undefined);
      setMetrics(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  }, [areaId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { metrics, loading, error, refresh: fetch };
}
