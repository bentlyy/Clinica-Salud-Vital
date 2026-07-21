import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Pagination,
  Chip,
} from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import WarningAmber from '@mui/icons-material/WarningAmber';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import MarkEmailRead from '@mui/icons-material/MarkEmailRead';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useNotifications, useMarkAsRead } from '../hooks/useNotifications';
import { NOTIFICATION_TYPE_CONFIG } from '../types/notification.types';
import type { Notification } from '../types/notification.types';

const TYPE_ICONS: Record<Notification['type'], React.ReactNode> = {
  info: <InfoOutlined sx={{ fontSize: 20 }} />,
  warning: <WarningAmber sx={{ fontSize: 20 }} />,
  success: <CheckCircleOutline sx={{ fontSize: 20 }} />,
  error: <ErrorOutline sx={{ fontSize: 20 }} />,
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading, error, refetch } = useNotifications({ page, limit });
  const markAsRead = useMarkAsRead();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-CL');
  };

  if (isLoading) return <LoadingState message="Cargando notificaciones..." />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;

  const notifications = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title="Notificaciones"
        subtitle={`${data?.total ?? 0} notificaciones en total`}
      action={
        notifications.some((n: Notification) => !n.is_read) ? (
          <Button
            variant="outlined"
            startIcon={<MarkEmailRead />}
            disabled
          >
            Marcar todas como leídas
          </Button>
        ) : undefined
      }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={<MarkEmailRead sx={{ fontSize: 48, color: '#d1d5db' }} />}
          title="Sin notificaciones"
          message="No tienes notificaciones nuevas."
        />
      ) : (
        <Paper sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <List disablePadding>
            {notifications.map((notification: Notification, index: number) => {
              const typeConfig = NOTIFICATION_TYPE_CONFIG[notification.type];
              return (
                <ListItem
                  key={notification.id}
                  sx={{
                    py: 2,
                    px: 3,
                    backgroundColor: notification.is_read ? 'transparent' : '#f0fdfa',
                    borderBottom: index < notifications.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: notification.link ? 'pointer' : 'default',
                    transition: 'background-color 0.2s',
                    '&:hover': { backgroundColor: '#f9fafb' },
                  }}
                  onClick={() => handleNotificationClick(notification)}
                  secondaryAction={
                    <IconButton size="small" edge="end" sx={{ color: '#9ca3af' }}>
                      {TYPE_ICONS[notification.type]}
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: typeConfig.bgColor,
                        color: typeConfig.color,
                      }}
                    >
                      {TYPE_ICONS[notification.type]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: notification.is_read ? 500 : 700,
                            color: '#1f2937',
                          }}
                        >
                          {notification.title}
                        </Typography>
                        <Chip
                          label={typeConfig.label}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            backgroundColor: typeConfig.bgColor,
                            color: typeConfig.color,
                          }}
                        />
                        {!notification.is_read && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: '#0d9488',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.25 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                          {formatDate(notification.created_at)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: '1px solid #f3f4f6' }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
                size="small"
              />
            </Box>
          )}
        </Paper>
      )}
    </MotionDiv>
  );
}
