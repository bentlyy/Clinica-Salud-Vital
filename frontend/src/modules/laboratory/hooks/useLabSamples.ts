import { useState, useCallback } from 'react';
import type { LabSample } from '../types';
import * as api from '../api/laboratory.api';

export function useLabSamples() {
  const [samples, setSamples] = useState<LabSample[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSamples = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSamples(params);
      setSamples(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar muestras');
    } finally {
      setLoading(false);
    }
  }, []);

  const receiveSample = useCallback(async (id: number) => {
    const updated = await api.receiveSample(id);
    setSamples(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    return updated;
  }, []);

  const verifySample = useCallback(async (id: number) => {
    const updated = await api.verifySample(id);
    setSamples(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    return updated;
  }, []);

  const assignSample = useCallback(async (id: number, data: { assigned_tech_id: number; assigned_equipment_id?: number }) => {
    const updated = await api.assignSample(id, data);
    setSamples(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    return updated;
  }, []);

  const recordQC = useCallback(async (id: number, data: { qc_status: string; qc_notes?: string }) => {
    const updated = await api.recordSampleQC(id, data);
    setSamples(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    return updated;
  }, []);

  const rejectSample = useCallback(async (id: number, reason: string) => {
    const updated = await api.rejectSample(id, reason);
    setSamples(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    return updated;
  }, []);

  return {
    samples, loading, error,
    fetchSamples, receiveSample, verifySample, assignSample,
    recordQC, rejectSample,
  };
}
