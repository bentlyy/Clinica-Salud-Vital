import { memo } from 'react';
import Grid from '@mui/material/Grid';
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

const METRIC_ITEMS = [
  {
    key: 'pending' as const,
    label: 'Pendientes',
    icon: <PendingActionsIcon />,
    color: '#f59e0b',
    bgColor: '#fffbeb',
  },
  {
    key: 'in_progress' as const,
    label: 'En Proceso',
    icon: <HourglassBottomIcon />,
    color: '#3b82f6',
    bgColor: '#eff6ff',
  },
  {
    key: 'pending_validation' as const,
    label: 'Validación Pendiente',
    icon: <RateReviewIcon />,
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
  },
  {
    key: 'urgent' as const,
    label: 'Urgentes',
    icon: <PriorityHighIcon />,
    color: '#ef4444',
    bgColor: '#fef2f2',
  },
  {
    key: 'sla_breached' as const,
    label: 'SLA Vencido',
    icon: <TimerOffIcon />,
    color: '#dc2626',
    bgColor: '#fef2f2',
  },
] as const;

function DashboardMetricsBarBase({ metrics, isLoading }: DashboardMetricsBarProps) {
  return (
    <Grid container spacing={2}>
      {METRIC_ITEMS.map((item) => (
        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 2.4 }} key={item.key}>
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
