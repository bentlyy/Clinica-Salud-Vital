import { memo } from 'react';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import RateReviewIcon from '@mui/icons-material/RateReview';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import TimerOffIcon from '@mui/icons-material/TimerOff';
import { MetricCard, MetricCardSkeleton } from '../shared/MetricCard';
import type { LabDashboardMetrics } from '../../types/lab.types';

interface DashboardMetricsBarProps {
  metrics?: LabDashboardMetrics | null;
  isLoading?: boolean;
}

function DashboardMetricsBarBase({ metrics, isLoading }: DashboardMetricsBarProps) {
  const theme = useTheme();

  const METRIC_ITEMS = [
    {
      key: 'pending' as const,
      label: 'Pendientes',
      icon: <PendingActionsIcon />,
      color: theme.palette.warning.main,
      bgColor: theme.palette.custom.status.warning.bg,
    },
    {
      key: 'in_progress' as const,
      label: 'En Proceso',
      icon: <HourglassBottomIcon />,
      color: theme.palette.info.main,
      bgColor: theme.palette.custom.status.info.bg,
    },
    {
      key: 'pending_validation' as const,
      label: 'Validación Pendiente',
      icon: <RateReviewIcon />,
      color: theme.palette.secondary.main,
      bgColor: theme.palette.action.hover,
    },
    {
      key: 'urgent' as const,
      label: 'Urgentes',
      icon: <PriorityHighIcon />,
      color: theme.palette.error.main,
      bgColor: theme.palette.custom.status.error.bg,
    },
    {
      key: 'sla_breached' as const,
      label: 'SLA Vencido',
      icon: <TimerOffIcon />,
      color: theme.palette.error.dark,
      bgColor: theme.palette.custom.status.error.bg,
    },
  ];
  return (
    <Grid container spacing={2}>
      {METRIC_ITEMS.map((item) => (
        <Grid xs={12} sm={6} md={3} lg={2.4} key={item.key}>
          {isLoading ? (
            <MetricCardSkeleton bgColor={item.bgColor} />
          ) : (
            <MetricCard
              title={item.label}
              value={metrics?.[item.key] ?? 0}
              icon={item.icon}
              color={item.color}
              bgColor={item.bgColor}
            />
          )}
        </Grid>
      ))}
    </Grid>
  );
}

export const DashboardMetricsBar = memo(DashboardMetricsBarBase);
