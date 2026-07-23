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

const SEVERITY_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  info: {
    icon: <InfoIcon sx={{ fontSize: 18 }} />,
    color: '#3b82f6',
    bgColor: '#eff6ff',
  },
  warning: {
    icon: <WarningIcon sx={{ fontSize: 18 }} />,
    color: '#d97706',
    bgColor: '#fffbeb',
  },
  critical: {
    icon: <ErrorIcon sx={{ fontSize: 18 }} />,
    color: '#dc2626',
    bgColor: '#fef2f2',
  },
};

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
      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', p: 2 }}>
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
      sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', overflow: 'hidden' }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationsNoneIcon sx={{ fontSize: 20, color: '#0d9488' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
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
                backgroundColor: '#fef2f2',
                color: '#dc2626',
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
          '&::-webkit-scrollbar-thumb': { backgroundColor: '#d1d5db', borderRadius: 3 },
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
            <NotificationsNoneIcon sx={{ fontSize: 40, color: '#d1d5db' }} />
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              No hay alertas activas
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {sortedNotifications.map((notification) => {
              const sevConfig = SEVERITY_CONFIG[notification.severity] ?? SEVERITY_CONFIG.info;
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
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background-color 0.15s',
                    '&:hover': {
                      backgroundColor: '#fafafa',
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
                        sx={{ fontWeight: 600, color: '#1f2937' }}
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
                          backgroundColor: '#f3f4f6',
                          color: '#6b7280',
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', lineHeight: 1.5 }}>
                      {notification.message}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: '#9ca3af', display: 'block', mt: 0.5, fontSize: '0.7rem' }}
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
                          color: '#10b981',
                          mt: 0.25,
                          '&:hover': {
                            backgroundColor: '#ecfdf5',
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
