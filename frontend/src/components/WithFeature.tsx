import { ReactNode } from 'react';
import { useFeature } from '../context/useFeature';
import PremiumLocked from './PremiumLocked';

export default function WithFeature({ featureKey, children, featureName }: { featureKey: string; children: ReactNode; featureName?: string }) {
  const { hasFeature, loading } = useFeature();
  if (loading) return null;
  if (!hasFeature(featureKey)) return <PremiumLocked featureName={featureName} />;
  return <>{children}</>;
}
