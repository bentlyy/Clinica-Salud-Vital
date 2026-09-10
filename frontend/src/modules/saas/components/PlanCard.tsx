import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { formatPricingAmount } from '@/shared/utils/pricing';
import { useConvertedPrice } from '@/shared/hooks/usePricing';
import { PlanFeatures } from './PlanFeatures';
import type { Plan } from '../types/saas.types';

interface PlanCardProps {
  plan: Plan;
  isCurrent?: boolean;
  onSelect: (plan: Plan) => void;
}

export function PlanCard({ plan, isCurrent = false, onSelect }: PlanCardProps) {
  const theme = useTheme();
  const { t } = useTranslation('saas');
  const price = useConvertedPrice(plan.price_monthly);

  const brandMain = theme.palette.custom?.brand?.main || theme.palette.primary.main;
  const brandLight = theme.palette.custom?.brand?.light || theme.palette.primary.light;
  const brandAlpha8 = theme.palette.custom?.brand?.alpha8 || 'rgba(0,0,0,0.06)';

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        p: 2.5,
        borderRadius: 2,
        border: isCurrent
          ? `1.5px solid ${brandMain}`
          : `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': isCurrent
          ? undefined
          : {
              borderColor: brandLight,
              boxShadow: `0 0 0 3px ${brandAlpha8}`,
            },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {plan.name}
        </Typography>
        {isCurrent && <Chip label={t('currentPlanLabel')} size="small" color="success" />}
      </Box>

      {plan.description && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {plan.description}
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 0.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: brandMain }}>
          {price.symbol}{formatPricingAmount(price.amount, price.currency)}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('perMonth')}
        </Typography>
      </Box>

      <Box sx={{ flex: 1 }} />
      <PlanFeatures plan={plan} />

      <Button
        variant={isCurrent ? 'outlined' : 'contained'}
        disabled={isCurrent}
        color="primary"
        size="large"
        fullWidth
        onClick={() => onSelect(plan)}
        sx={{ mt: 1.5 }}
      >
        {isCurrent ? t('currentPlanLabel') : t('selectPlan')}
      </Button>
    </Paper>
  );
}