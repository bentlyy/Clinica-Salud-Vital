import { memo } from 'react';
import type { ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { useTheme, alpha } from '@mui/material/styles';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: string;
  bgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}

interface MetricCardSkeletonProps {
  bgColor?: string;
}

export const MetricCard = memo(function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  onClick,
}: MetricCardProps) {
  const theme = useTheme();
  const accentColor = color ?? theme.palette.primary.main;

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '14px',
        border: '1px solid #e5e7eb',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': onClick
          ? {
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              borderColor: alpha(accentColor, 0.4),
              transform: 'translateY(-1px)',
            }
          : {},
      }}
    >
      {/* Top accent bar */}
      <Box
        sx={{
          height: 4,
          background: `linear-gradient(135deg, ${accentColor} 0%, ${alpha(accentColor, 0.7)} 100%)`,
        }}
      />

      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Icon circle */}
        {icon && (
          <Box
            sx={{
              width: 44,
              height: 44,
              minWidth: 44,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(accentColor, 0.1),
              color: accentColor,
              '& svg': { fontSize: 22 },
            }}
          >
            {icon}
          </Box>
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              fontWeight: 500,
              fontSize: '0.75rem',
              mb: 0.5,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {title}
          </Typography>

          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              lineHeight: 1.2,
            }}
          >
            {value}
          </Typography>

          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                mt: 0.5,
                display: 'block',
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Trend indicator */}
        {trend && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              px: 1,
              py: 0.25,
              borderRadius: '8px',
              backgroundColor: trend.isPositive
                ? alpha(theme.palette.success.main, 0.1)
                : alpha(theme.palette.error.main, 0.1),
              color: trend.isPositive
                ? theme.palette.success.main
                : theme.palette.error.main,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1 }}>
              {trend.isPositive ? '\u2191' : '\u2193'} {Math.abs(trend.value)}%
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
});

export const MetricCardSkeleton = memo(function MetricCardSkeleton({ bgColor }: MetricCardSkeletonProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '14px',
        border: '1px solid #e5e7eb',
        backgroundColor: bgColor || 'transparent',
        overflow: 'hidden',
      }}
    >
      <Skeleton variant="rectangular" height={4} />
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: '12px' }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={16} />
          <Skeleton variant="text" width="40%" height={28} />
        </Box>
      </Box>
    </Paper>
  );
});
