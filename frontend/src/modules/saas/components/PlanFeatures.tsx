import { Box, Typography } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { Plan } from '../types/saas.types';

interface FeatureItem {
  key: string;
  vars?: Record<string, number | string>;
}

const featureKeys = (plan: Plan): FeatureItem[] => {
  const items: FeatureItem[] = [];

  if (plan.max_doctors === -1) {
    items.push({ key: 'featUnlimited', vars: { subject: 'doctors' } });
  } else if (plan.max_doctors > 0) {
    items.push({ key: 'featDoctors', vars: { count: plan.max_doctors } });
  }

  if (plan.max_patients === -1) {
    items.push({ key: 'featUnlimited', vars: { subject: 'patients' } });
  } else if (plan.max_patients > 0) {
    items.push({ key: 'featPatients', vars: { count: plan.max_patients } });
  }

  if (plan.storage_gb === -1) {
    items.push({ key: 'featUnlimited', vars: { subject: 'storage' } });
  } else if (plan.storage_gb > 0) {
    items.push({ key: 'featStorage', vars: { count: plan.storage_gb } });
  }

  const f = plan.features ?? {};
  if (f.sms) items.push({ key: 'featSms' });
  if (f.bookings) items.push({ key: 'featBookings' });
  if (f.laboratory) items.push({ key: 'featLaboratory' });
  if (f.clinical_records) items.push({ key: 'featClinicalRecords' });
  if (f.advanced_reports) items.push({ key: 'featAdvancedReports' });
  if (f.analytics) items.push({ key: 'featAnalytics' });
  if (f.api_access) items.push({ key: 'featApiAccess' });
  if (f.white_label) items.push({ key: 'featWhiteLabel' });
  if (f.custom_domain) items.push({ key: 'featCustomDomain' });

  return items;
};

export function PlanFeatures({ plan }: { plan: Plan }) {
  const theme = useTheme();
  const { t } = useTranslation('saas');
  const items = featureKeys(plan);

  if (items.length === 0) return null;

  return (
    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 0.75 }}>
      {items.map((feat) => (
        <Box component="li" key={feat.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle
            sx={{
              fontSize: 16,
              flexShrink: 0,
              color: theme.palette.custom?.brand?.main || theme.palette.primary.main,
            }}
          />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t(feat.key, feat.vars)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}