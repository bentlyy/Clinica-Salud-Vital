import { useContext } from 'react';
import { FeatureContext, type FeatureContextValue } from '@/shared/providers/FeatureProvider';

export function useFeature(): FeatureContextValue {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error('useFeature must be used within a FeatureProvider');
  return ctx;
}
