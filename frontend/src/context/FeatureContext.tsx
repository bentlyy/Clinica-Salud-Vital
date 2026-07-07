import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getFeatures } from '../api/saas';
import { useAuth } from './useAuth';

export interface FeatureContextValue {
  features: Record<string, boolean>;
  hasFeature: (key: string) => boolean;
  loading: boolean;
  reload: () => Promise<void>;
}

export const FeatureContext = createContext<FeatureContextValue | null>(null);

export const FeatureProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const f = await getFeatures();
      setFeatures(f);
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
};
