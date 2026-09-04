import { Box, Typography } from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { HealthScore } from '../types/super-admin.types';

function scoreColor(score: number, theme: Theme) {
  if (score < 41) return theme.palette.error.main;
  if (score < 70) return theme.palette.warning.main;
  return theme.palette.success.main;
}

interface HealthScoreGaugeProps {
  tenant: HealthScore;
}

const DIMENSION_KEYS = [
  { key: 'score_activity', i18n: 'dim_activity' },
  { key: 'score_trend', i18n: 'dim_trend' },
  { key: 'score_patients', i18n: 'dim_patients' },
  { key: 'score_cancellation', i18n: 'dim_cancellation' },
  { key: 'score_modules', i18n: 'dim_modules' },
];

export function HealthScoreGauge({ tenant }: HealthScoreGaugeProps) {
  const theme = useTheme();
  const { t } = useTranslation('super_admin_dashboard');
  const score = tenant.health_score ?? 0;
  const color = scoreColor(score, theme);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={theme.palette.divider}
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
            >
              {score}
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              /100
            </Typography>
          </Box>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {tenant.name}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            {t('health_score')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {DIMENSION_KEYS.map((dim) => {
          const value = Number(tenant[dim.key as keyof HealthScore] ?? 0);
          const max = 20;
          return (
            <Box key={dim.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, width: 90, flexShrink: 0 }}>
                {t(dim.i18n)}
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: '3px',
                  backgroundColor: theme.palette.custom.surface.sunken,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${Math.min(100, (value / max) * 100)}%`,
                    borderRadius: '3px',
                    backgroundColor: scoreColor((value / max) * 100, theme),
                    transition: 'width 0.5s ease',
                  }}
                />
              </Box>
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary, width: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
              >
                {value}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
