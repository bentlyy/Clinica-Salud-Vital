import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface DashboardKpiCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  color: string;
  bgColor: string;
  sparkData: { v: number }[];
  trend?: { value: number; up: boolean } | null;
}

export function DashboardKpiCard({
  label,
  value,
  icon,
  color,
  bgColor,
  sparkData,
  trend,
}: DashboardKpiCardProps) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: '16px',
        border: `1px solid ${theme.palette.divider}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        '&:hover': { boxShadow: theme.shadows[3], transform: 'translateY(-2px)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            backgroundColor: bgColor,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        {trend && (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: trend.up ? theme.palette.success.main : theme.palette.error.main,
              backgroundColor: trend.up
                ? theme.palette.custom.status.success.bg
                : theme.palette.custom.status.error.bg,
              px: 0.75,
              py: 0.25,
              borderRadius: '6px',
            }}
          >
            {trend.up ? '↑' : '↓'} {Math.abs(trend.value)}%
          </Typography>
        )}
      </Box>

      <Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: theme.palette.text.primary,
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.25 }}>
          {label}
        </Typography>
      </Box>

      {sparkData.length > 1 && (
        <Box sx={{ height: 34, mt: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                fill={`url(#spark-${label})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
}
