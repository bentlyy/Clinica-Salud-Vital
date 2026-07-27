import { Box, Paper, Typography, Avatar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AttachMoney from '@mui/icons-material/AttachMoney';
import PendingActions from '@mui/icons-material/PendingActions';
import WarningAmber from '@mui/icons-material/WarningAmber';
import TrendingUp from '@mui/icons-material/TrendingUp';
import { MotionDiv } from '@/shared/utils/animations';
import type { BillingStats } from '../types/billing.types';

interface BillingSummaryCardsProps {
  stats: BillingStats | undefined;
  isLoading: boolean;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);

export function BillingSummaryCards({ stats, isLoading }: BillingSummaryCardsProps) {
  const theme = useTheme();

  const cards = [
    {
      label: 'Ingresos Totales',
      value: stats?.total_revenue ?? 0,
      icon: <AttachMoney />,
      color: theme.palette.primary.main,
      bgColor: theme.palette.custom.brand.lightest,
    },
    {
      label: 'Pendientes de Pago',
      value: stats?.pending_amount ?? 0,
      icon: <PendingActions />,
      color: theme.palette.warning.main,
      bgColor: theme.palette.custom.status.warning.bg,
    },
    {
      label: 'Facturas Vencidas',
      value: stats?.overdue_amount ?? 0,
      icon: <WarningAmber />,
      color: theme.palette.error.main,
      bgColor: theme.palette.custom.status.error.bg,
    },
    {
      label: 'Facturas Últimos 30 días',
      value: stats?.invoices_last_30_days ?? 0,
      icon: <TrendingUp />,
      color: theme.palette.info.main,
      bgColor: theme.palette.custom.status.info.bg,
      format: 'number' as const,
    },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
      {cards.map((card, index) => (
        <Box key={card.label}>
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
          >
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  backgroundColor: card.bgColor,
                  color: card.color,
                }}
              >
                {card.icon}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                  {isLoading ? '...' : card.format === 'number' ? card.value.toLocaleString('es-CL') : formatCurrency(card.value)}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  {card.label}
                </Typography>
              </Box>
            </Paper>
          </MotionDiv>
        </Box>
      ))}
    </Box>
  );
}
