import { Box, Chip, Grid, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { formatDate } from '@/shared/utils/localeUtils';
import { formatPricingAmount } from '@/shared/utils/pricing';
import { useConvertedPrice } from '@/shared/hooks/usePricing';
import { usePlans, useMySubscription } from '../hooks/useSaas';
import { PlanCard } from '../components/PlanCard';
import type { Plan, SubscriptionStatus } from '../types/saas.types';

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: 'statusActive',
  trialing: 'statusTrialing',
  past_due: 'statusPastDue',
  canceled: 'statusCanceled',
};

const STATUS_COLOR: Record<SubscriptionStatus, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  trialing: 'warning',
  past_due: 'error',
  canceled: 'default',
};

export default function PlanPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation('saas');

  const { data: plans, isLoading: plansLoading, error: plansError } = usePlans();
  const {
    data: subData,
    isLoading: subLoading,
    error: subError,
  } = useMySubscription();

  if (plansLoading || subLoading) return <LoadingState />;
  if (plansError || subError) return <ErrorState />;

  const currentPlanCode = subData?.subscription?.plan?.code ?? subData?.plan?.code;
  const subscription = subData?.subscription ?? null;
  const currentPrice = useConvertedPrice(subscription?.plan?.price_monthly ?? 0);

  const handleSelect = (plan: Plan) => {
    navigate(`/saas/checkout?plan=${plan.code}`);
  };

  return (
    <Box>
      <PageHeader
        title={t('subscriptionTitle')}
        subtitle={t('subscriptionSubtitle')}
      />

      {/* Current subscription */}
      {subscription && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.custom?.surface?.muted || theme.palette.background.paper,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {t('summaryLabel')}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {subscription.plan.name}
            </Typography>
          </Box>

          <Box sx={{ minWidth: 120 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('statusLabel')}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={t(STATUS_LABEL[subscription.status])}
                color={STATUS_COLOR[subscription.status]}
                size="small"
              />
            </Box>
          </Box>

          <Box sx={{ minWidth: 130 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('periodEndLabel')}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {formatDate(subscription.current_period_end)}
            </Typography>
          </Box>

          <Box sx={{ minWidth: 120 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('perMonth')}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.custom?.brand?.main || theme.palette.primary.main }}>
              {currentPrice.symbol}{formatPricingAmount(currentPrice.amount, currentPrice.currency)}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Plans */}
      <Grid container spacing={2}>
        {plans?.map((plan) => (
          <Grid item xs={12} md={4} key={plan.id}>
            <PlanCard
              plan={plan}
              isCurrent={currentPlanCode === plan.code}
              onSelect={handleSelect}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}