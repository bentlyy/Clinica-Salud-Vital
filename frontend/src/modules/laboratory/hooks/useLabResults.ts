import { useState, useCallback } from 'react';
import type { LabRequestItem, LabResultHistory } from '../types';
import * as api from '../api/laboratory.api';

export function useLabResults() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveResult = useCallback(async (itemId: number, resultValue: string, notes?: string) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateLabRequestItemResult(itemId, {
        result_value: resultValue,
        result_notes: notes,
      });
      return updated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar resultado';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const validateByTech = useCallback(async (itemId: number) => {
    return api.validateItemByTech(itemId);
  }, []);

  const validateByDoctor = useCallback(async (itemId: number) => {
    return api.validateItemByDoctor(itemId);
  }, []);

  const signItem = useCallback(async (itemId: number) => {
    return api.signItem(itemId);
  }, []);

  const deliverItem = useCallback(async (itemId: number, method?: string) => {
    return api.deliverItem(itemId, method);
  }, []);

  const getHistory = useCallback(async (itemId: number): Promise<LabResultHistory[]> => {
    return api.getItemHistory(itemId);
  }, []);

  return {
    saving, error,
    saveResult, validateByTech, validateByDoctor,
    signItem, deliverItem, getHistory,
  };
}
