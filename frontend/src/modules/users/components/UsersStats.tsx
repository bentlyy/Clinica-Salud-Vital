import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import PeopleOutline from '@mui/icons-material/PeopleOutline';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import type { User } from '../types/user.types';
import { formatNumber } from '@/shared/utils/localeUtils';

interface UsersStatsProps {
  users: User[];
  total: number;
}

function relativeTime(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (!iso) return t('never');
  const date = new Date(iso);
  if (isNaN(date.getTime())) return t('never');
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t('time_just_now');
  if (minutes < 60) return t('time_minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time_hours', { count: hours });
  const days = Math.floor(hours / 24);
  return t('time_days', { count: days });
}

export function UsersStats({ users, total }: UsersStatsProps) {
  const { t } = useTranslation('users');
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.length - activeCount;
  const activePct = users.length > 0 ? Math.round((activeCount / users.length) * 100) : 0;

  const newest = users.reduce<User | null>((acc, u) => {
    if (!u.created_at) return acc;
    if (!acc) return u;
    return new Date(u.created_at) > new Date(acc.created_at) ? u : acc;
  }, null);

  const cards = [
    {
      key: 'stats_total',
      label: t('stats_total'),
      value: formatNumber(total),
      icon: <PeopleOutline sx={{ fontSize: 20 }} />,
      color: theme.palette.primary.main,
      bg: dark ? 'rgba(13,148,136,0.15)' : '#f0fdfa',
    },
    {
      key: 'stats_active',
      label: t('stats_active'),
      value: formatNumber(activeCount),
      sub: t('stats_pct', { pct: activePct }),
      icon: <CheckCircleOutline sx={{ fontSize: 20 }} />,
      color: theme.palette.success.main,
      bg: dark ? 'rgba(16,185,129,0.15)' : '#ecfdf5',
    },
    {
      key: 'stats_inactive',
      label: t('stats_inactive'),
      value: formatNumber(inactiveCount),
      icon: <BlockOutlined sx={{ fontSize: 20 }} />,
      color: theme.palette.custom.status.error.text,
      bg: dark ? 'rgba(239,68,68,0.15)' : '#fef2f2',
    },
    {
      key: 'stats_last_login',
      label: t('stats_last_login'),
      value: newest ? relativeTime(newest.created_at, t) : t('never'),
      icon: <HistoryOutlined sx={{ fontSize: 20 }} />,
      color: theme.palette.info.main,
      bg: dark ? 'rgba(59,130,246,0.15)' : '#eff6ff',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      {cards.map((card) => (
        <Paper
          key={card.key}
          sx={{
            p: 2,
            borderRadius: '16px',
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            transition: 'box-shadow 0.2s ease, transform 0.2s ease',
            '&:hover': { boxShadow: theme.shadows[3], transform: 'translateY(-1px)' },
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              backgroundColor: card.bg,
              color: card.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {card.icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: theme.palette.text.primary,
                lineHeight: 1.2,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {card.value}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, lineHeight: 1.3 }}>
              {card.label}
            </Typography>
            {card.sub && (
              <Typography
                variant="caption"
                sx={{ color: theme.palette.success.main, fontWeight: 600, display: 'block' }}
              >
                {card.sub}
              </Typography>
            )}
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
