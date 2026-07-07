import React, { ReactNode } from 'react';
import { useFeature } from '../context/useFeature';
import { useI18n } from '../i18n/useI18n';
import PremiumLocked from './PremiumLocked';
import LoadingState from './LoadingState';

const WithFeature = React.memo(function WithFeature({ featureKey, children, featureName }: { featureKey: string; children: ReactNode; featureName?: string }) {
  const { hasFeature, loading } = useFeature();
  const { t } = useI18n();
  if (loading) return <LoadingState message={t('loading_state.message') || 'Cargando...'} />;
  if (!hasFeature(featureKey)) return <PremiumLocked featureName={featureName} />;
  return <>{children}</>;
});

export default WithFeature;
