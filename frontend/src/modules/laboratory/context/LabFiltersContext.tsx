import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { LabFilterState, LabRequestStatus, LabPriority } from '../types';

const STORAGE_KEY = 'lab-filters';

function loadSavedFilters(): LabFilterState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {
    status: '', areaId: '', priority: '', search: '',
    dateFrom: '', dateTo: '', doctorId: '', technicianId: '',
    isCritical: false, isRepeated: false, onlyUrgent: false,
  };
}

interface LabFiltersContextValue {
  filters: LabFilterState;
  setFilter: (key: keyof LabFilterState, value: string | boolean) => void;
  setFilters: (partial: Partial<LabFilterState>) => void;
  resetFilters: () => void;
  activeFilterCount: number;
}

const LabFiltersContext = createContext<LabFiltersContextValue | null>(null);

export function LabFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<LabFilterState>(loadSavedFilters);

  const persist = useCallback((newFilters: LabFilterState) => {
    setFiltersState(newFilters);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newFilters)); } catch { /* ignore */ }
  }, []);

  const setFilter = useCallback((key: keyof LabFilterState, value: string | boolean) => {
    persist({ ...filters, [key]: value });
  }, [filters, persist]);

  const setFilters = useCallback((partial: Partial<LabFilterState>) => {
    persist({ ...filters, ...partial });
  }, [filters, persist]);

  const resetFilters = useCallback(() => {
    persist({
      status: '' as LabRequestStatus | '',
      areaId: '' as number | '',
      priority: '' as LabPriority | '',
      search: '', dateFrom: '', dateTo: '',
      doctorId: '' as number | '', technicianId: '' as number | '',
      isCritical: false, isRepeated: false, onlyUrgent: false,
    });
  }, [persist]);

  const activeFilterCount = Object.entries(filters).filter(
    ([key, val]) => val !== '' && val !== false && val !== 0 && key !== 'search'
  ).length;

  return (
    <LabFiltersContext.Provider value={{ filters, setFilter, setFilters, resetFilters, activeFilterCount }}>
      {children}
    </LabFiltersContext.Provider>
  );
}

export function useLabFilters() {
  const ctx = useContext(LabFiltersContext);
  if (!ctx) throw new Error('useLabFilters must be inside LabFiltersProvider');
  return ctx;
}
