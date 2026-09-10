import { Box, Button, Paper, Typography } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { formatPricingAmount } from '@/shared/utils/pricing';
import { useConvertedPrice } from '@/shared/hooks/usePricing';
import { usePlans, useMySubscription } from '../hooks/useSaas';

export default function SuccessPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation('saas');
  const [searchParams] = useSearchParams();

  const planCode = searchParams.get('plan') ?? '';
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: subData, isLoading: subLoading, error: subError } = useMySubscription();

  if (plansLoading || subLoading) return <LoadingState />;
  if (subError) return <ErrorState />;

  const brandMain = theme.palette.custom?.brand?.main || theme.palette.primary.main;
  const selectedPlan = plans?.find((p) => p.code === planCode) ?? subData?.subscription?.plan;
  const price = useConvertedPrice(selectedPlan?.price_monthly ?? 0);

  return (
    <Box>
      <PageHeader title={t('successTitle')} />

      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          mx: 'auto',
          mt: 2,
          p: 4,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          textAlign: 'center',
        }}
      >
        <CheckCircle sx={{ fontSize: 56, color: brandMain }} />

        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mt: 2 }}>
          {t('successTitle')}
        </Typography>

        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
          {t('successBody')}
        </Typography>

        {selectedPlan && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              borderRadius: 1.5,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.custom?.surface?.muted || theme.palette.background.paper,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {selectedPlan.name}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: brandMain }}>
              {price.symbol}{formatPricingAmount(price.amount, price.currency)}
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => navigate('/saas/plan')}
          >
            {t('backToPlans')}
          </Button>
          <Button variant="text" size="large" onClick={() => navigate('/dashboard')}>
            {t('goToDashboard')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}