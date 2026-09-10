import { useMemo } from 'react';
import { Alert, Box, Button, Grid, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { formatPricingAmount } from '@/shared/utils/pricing';
import { useConvertedPrice } from '@/shared/hooks/usePricing';
import { usePlans, useCreateCheckout } from '../hooks/useSaas';
import { PlanFeatures } from '../components/PlanFeatures';

export default function CheckoutPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation('saas');
  const [searchParams] = useSearchParams();

  const planCode = searchParams.get('plan') ?? '';
  const canceled = searchParams.get('canceled') === '1';

  const { data: plans, isLoading, error } = usePlans();
  const createCheckout = useCreateCheckout();

  const plan = useMemo(
    () => plans?.find((p) => p.code === planCode) ?? null,
    [plans, planCode],
  );

  const price = useConvertedPrice(plan?.price_monthly ?? 0);

  const paying = createCheckout.isPending;

  const handlePay = () => {
    if (!plan) return;
    createCheckout.mutate(plan.code, {
      onSuccess: (resp) => {
        if (resp.url.startsWith('http')) {
          window.location.href = resp.url;
        } else {
          navigate(resp.url);
        }
      },
    });
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState />;

  const brandMain = theme.palette.custom?.brand?.main || theme.palette.primary.main;

  return (
    <Box>
      <PageHeader
        title={t('checkoutTitle')}
        subtitle={t('checkoutSubtitle')}
      />

      {canceled && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {t('canceledTitle')}
          </Typography>
          <Typography variant="body2">{t('canceledBody')}</Typography>
        </Alert>
      )}

      {!plan ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {t('selectPlanFirst')}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            sx={{ mt: 2 }}
            onClick={() => navigate('/saas/plan')}
          >
            {t('backToPlans')}
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} md={7} lg={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: 2,
                border: `1.5px solid ${brandMain}`,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {plan.name}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: brandMain }}>
                  {price.symbol}{formatPricingAmount(price.amount, price.currency)}
                  <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                    {t('perMonth')}
                  </Typography>
                </Typography>
              </Box>

              {plan.description && (
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                  {plan.description}
                </Typography>
              )}

              <Box sx={{ mt: 2.5 }}>
                <PlanFeatures plan={plan} />
              </Box>

              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                disabled={paying}
                onClick={handlePay}
                sx={{ mt: 3, py: 1.25 }}
              >
                {paying ? t('creatingCheckout') : t('payWithMp')}
              </Button>

              <Button
                variant="text"
                size="small"
                fullWidth
                disabled={paying}
                onClick={() => navigate('/saas/plan')}
                sx={{ mt: 1 }}
              >
                {t('backToPlans')}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}