import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { LabDashboardMetrics, LabArea, LabNotification, LabFilterState } from '../types';
import { getDashboardMetrics, getLabAreas, getNotifications } from '../api/laboratory.api';

interface LabDashboardContextValue {
  metrics: LabDashboardMetrics | null;
  areas: LabArea[];
  notifications: LabNotification[];
  selectedAreaId: number | null;
  filters: LabFilterState;
  loading: boolean;
  error: string | null;
  setSelectedAreaId: (id: number | null) => void;
  setFilters: (filters: Partial<LabFilterState>) => void;
  refresh: () => Promise<void>;
}

const LabDashboardContext = createContext<LabDashboardContextValue | null>(null);

export function LabDashboardProvider({ children }: { children: ReactNode }) {
  const [metrics, setMetrics] = useState<LabDashboardMetrics | null>(null);
  const [areas, setAreas] = useState<LabArea[]>([]);
  const [notifications, setNotifications] = useState<LabNotification[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [filters, setFiltersState] = useState<LabFilterState>({
    status: '', areaId: '', priority: '', search: '',
    dateFrom: '', dateTo: '', doctorId: '', technicianId: '',
    isCritical: false, isRepeated: false, onlyUrgent: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsData, areasData, notifData] = await Promise.all([
        getDashboardMetrics(selectedAreaId ?? undefined),
        getLabAreas(),
        getNotifications({ limit: 20 }),
      ]);
      setMetrics(metricsData);
      setAreas(areasData);
      setNotifications(notifData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedAreaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const setFilters = useCallback((partial: Partial<LabFilterState>) => {
    setFiltersState(prev => ({ ...prev, ...partial }));
  }, []);

  return (
    <LabDashboardContext.Provider value={{
      metrics, areas, notifications, selectedAreaId, filters,
      loading, error,
      setSelectedAreaId, setFilters, refresh: fetchAll,
    }}>
      {children}
    </LabDashboardContext.Provider>
  );
}

export function useLabDashboardContext() {
  const ctx = useContext(LabDashboardContext);
  if (!ctx) throw new Error('useLabDashboardContext must be inside LabDashboardProvider');
  return ctx;
}
