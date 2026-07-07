import { useState, useEffect, useCallback } from 'react';
import type { LabArea } from '../types';
import { getLabAreas } from '../api/laboratory.api';

export function useLabAreas() {
  const [areas, setAreas] = useState<LabArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLabAreas();
      setAreas(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar áreas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const selectedArea = areas.find(a => a.id === selectedAreaId) || null;

  return { areas, loading, error, selectedAreaId, setSelectedAreaId, selectedArea, refresh: fetch };
}
