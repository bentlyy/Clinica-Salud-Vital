import { useContext } from 'react';
import { FeatureContext } from './FeatureContext';
import type { FeatureContextValue } from './FeatureContext';

export const useFeature = (): FeatureContextValue => {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error('useFeature must be used within a FeatureProvider');
  return ctx;
};
