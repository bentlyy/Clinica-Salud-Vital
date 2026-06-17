import { createContext, useState, useEffect, useCallback } from 'react';
import { getFeatures } from '../api/saas';
import { useAuth } from './useAuth';

export const FeatureContext = createContext();

export const FeatureProvider = ({ children }) => {
  const { user } = useAuth();
  const [features, setFeatures] = useState({});
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

  const hasFeature = useCallback((key) => {
    return features[key] === true;
  }, [features]);

  return (
    <FeatureContext.Provider value={{ features, hasFeature, loading, reload: load }}>
      {children}
    </FeatureContext.Provider>
  );
};
