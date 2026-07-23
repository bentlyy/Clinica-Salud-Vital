import { createContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { apiClient } from '@/shared/services/api-client';

export interface FeatureContextValue {
  features: Record<string, boolean>;
  hasFeature: (key: string) => boolean;
  loading: boolean;
  reload: () => Promise<void>;
}

export const FeatureContext = createContext<FeatureContextValue | null>(null);

export function FeatureProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<Record<string, boolean>>('/saas/features');
      setFeatures(data);
    } catch {
      setFeatures({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      load();
    } else {
      setFeatures({});
      setLoading(false);
    }
  }, [user, load]);

  const hasFeature = useCallback((key: string) => {
    return features[key] === true;
  }, [features]);

  const value = useMemo(() => ({ features, hasFeature, loading, reload: load }), [features, hasFeature, loading, load]);

  return (
    <FeatureContext.Provider value={value}>
      {children}
    </FeatureContext.Provider>
  );
}
