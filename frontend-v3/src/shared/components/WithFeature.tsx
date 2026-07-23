import { type ReactNode } from 'react';
import { useFeature } from '@/shared/hooks/useFeature';
import { PremiumLocked } from './PremiumLocked';
import { LoadingState } from '@/shared/components/ui/LoadingState';

export function WithFeature({
  featureKey,
  featureName,
  children,
}: {
  featureKey: string;
  featureName?: string;
  children: ReactNode;
}) {
  const { hasFeature, loading } = useFeature();

  if (loading) return <LoadingState />;
  if (!hasFeature(featureKey)) return <PremiumLocked featureName={featureName} />;

  return <>{children}</>;
}
