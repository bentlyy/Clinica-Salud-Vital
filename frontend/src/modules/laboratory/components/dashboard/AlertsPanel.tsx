import { memo, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Skeleton,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import type { LabNotification } from '../../types/lab.types';
import { LAB_NOTIFICATION_TYPE_LABELS } from '../../types/lab.types';

interface AlertsPanelProps {
  notifications?: LabNotification[];
  isLoading?: boolean;
  onAcknowledge?: (id: number) => void;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

import type { Theme } from '@mui/material/styles';

function getSeverityConfig(theme: Theme, severity: string) {
  const configs: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
    info: {
      icon: <InfoIcon sx={{ fontSize: 18 }} />,
      color: theme.palette.info.main,
      bgColor: theme.palette.custom.status.info.bg,
    },
    warning: {
      icon: <WarningIcon sx={{ fontSize: 18 }} />,
      color: theme.palette.warning.dark,
      bgColor: theme.palette.custom.status.warning.bg,
    },
    critical: {
      icon: <ErrorIcon sx={{ fontSize: 18 }} />,
      color: theme.palette.error.dark,
      bgColor: theme.palette.custom.status.error.bg,
    },
  };
  return configs[severity] ?? configs.info ?? { icon: <InfoIcon sx={{ fontSize: 18 }} />, color: theme.palette.info.main, bgColor: theme.palette.custom.status.info.bg };
}

function formatRelativeTime(dateStr: string): string {
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Hace ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `Hace ${diffD}d`;
  } catch {
    return dateStr;
  }
}

function AlertsPanelBase({ notifications = [], isLoading, onAcknowledge }: AlertsPanelProps) {
  const theme = useTheme();
  const sortedNotifications = useMemo(() => {
    return [...notifications]
      .filter((n) => !n.acknowledged)
      .sort((a, b) => {
        const sevDiff = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
        if (sevDiff !== 0) return sevDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [notifications]);

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={160} height={24} />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width="100%" height={72} sx={{ borderRadius: '10px' }} />
          ))}
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationsNoneIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            Alertas Activas
          </Typography>
          {sortedNotifications.length > 0 && (
            <Chip
              label={sortedNotifications.length}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: theme.palette.custom.status.error.bg,
                color: theme.palette.error.dark,
              }}
            />
          )}
        </Box>
      </Box>

      <Box
        sx={{
          maxHeight: 400,
          overflow: 'auto',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: theme.palette.divider, borderRadius: 3 },
        }}
      >
        {sortedNotifications.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              gap: 1.5,
            }}
          >
            <NotificationsNoneIcon sx={{ fontSize: 40, color: theme.palette.divider }} />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              No hay alertas activas
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {sortedNotifications.map((notification) => {
              const sevConfig = getSeverityConfig(theme, notification.severity);
              const typeLabel =
                LAB_NOTIFICATION_TYPE_LABELS[notification.type] ?? notification.type;

              return (
                <Box
                  key={notification.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${theme.palette.custom.surface.sunken}`,
                    transition: 'background-color 0.15s',
                    '&:hover': {
                      backgroundColor: theme.palette.custom.surface.muted,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      minWidth: 32,
                      borderRadius: '8px',
                      backgroundColor: sevConfig.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: sevConfig.color,
                      mt: 0.25,
                    }}
                  >
                    {sevConfig.icon}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: theme.palette.text.primary }}
                      >
                        {notification.title}
                      </Typography>
                      <Chip
                        label={typeLabel}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 500,
                          backgroundColor: theme.palette.custom.surface.sunken,
                          color: theme.palette.text.secondary,
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.5 }}>
                      {notification.message}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: theme.palette.text.secondary, display: 'block', mt: 0.5, fontSize: '0.7rem', opacity: 0.7 }}
                    >
                      {formatRelativeTime(notification.created_at)}
                    </Typography>
                  </Box>

                  {onAcknowledge && !notification.acknowledged && (
                    <Tooltip title="Confirmar">
                      <IconButton
                        size="small"
                        onClick={() => onAcknowledge(notification.id)}
                        sx={{
                          color: theme.palette.success.main,
                          mt: 0.25,
                          '&:hover': {
                            backgroundColor: theme.palette.custom.status.success.bg,
                          },
                        }}
                      >
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Paper>
  );
}

export const AlertsPanel = memo(AlertsPanelBase);
