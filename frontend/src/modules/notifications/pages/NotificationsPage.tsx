import { useState, useEffect } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import WarningAmber from '@mui/icons-material/WarningAmber';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import MarkEmailRead from '@mui/icons-material/MarkEmailRead';
import { useTranslation } from 'react-i18next';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useNotifications, useMarkAsRead } from '../hooks/useNotifications';
import { NOTIFICATION_TYPE_CONFIG } from '../types/notification.types';
import type { Notification } from '../types/notification.types';
import { formatDate } from '@/shared/utils/localeUtils';
import { useAuth } from '@/shared/providers/AuthProvider';
import { superAdminService } from '@/modules/super-admin/services/super-admin.service';
import type { Tenant } from '@/modules/super-admin/types/super-admin.types';

const TYPE_ICONS: Record<Notification['type'], React.ReactNode> = {
  info: <InfoOutlined sx={{ fontSize: 20 }} />,
  warning: <WarningAmber sx={{ fontSize: 20 }} />,
  success: <CheckCircleOutline sx={{ fontSize: 20 }} />,
  error: <ErrorOutline sx={{ fontSize: 20 }} />,
};

export default function NotificationsPage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation('notifications');
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const [page, setPage] = useState(1);
  const limit = 15;
  const [clinics, setClinics] = useState<Tenant[]>([]);
  const [clinicFilter, setClinicFilter] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) return;
    let active = true;
    superAdminService
      .listTenants()
      .then((res) => {
        if (active) setClinics(res.data ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  const { data, isLoading, error, refetch } = useNotifications({
    page,
    limit,
    tenantId: isSuperAdmin ? clinicFilter || undefined : undefined,
  });
  const markAsRead = useMarkAsRead();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return t('minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('daysAgo', { count: diffDays });
    return formatDate(date);
  };

  if (isLoading) return <LoadingState message={t('loading')} />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;

  const notifications = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {!embedded && (
        <PageHeader
          title={t('title')}
          subtitle={t('total_notifications', { count: data?.total ?? 0 })}
          action={
            notifications.some((n: Notification) => !n.is_read) ? (
              <Button
                variant="outlined"
                startIcon={<MarkEmailRead />}
                disabled
              >
                {t('markAllRead')}
              </Button>
            ) : undefined
          }
        />
      )}

      {isSuperAdmin && (
        <Paper sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
          <FormControl size="small" fullWidth>
            <InputLabel id="notifications-clinic-filter">{t('clinicFilter')}</InputLabel>
            <Select
              labelId="notifications-clinic-filter"
              label={t('clinicFilter')}
              value={clinicFilter}
              onChange={(e) => { setClinicFilter(e.target.value); setPage(1); }}
            >
              <MenuItem value="">{t('allClinics')}</MenuItem>
              {clinics.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          icon={<MarkEmailRead sx={{ fontSize: 48, color: theme.palette.grey[300] }} />}
          title={t('noNotifications')}
          message={t('no_new_notifications')}
        />
      ) : (
        <Paper sx={{ borderRadius: '14px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <List disablePadding>
            {notifications.map((notification: Notification, index: number) => {
              const typeConfig = NOTIFICATION_TYPE_CONFIG[notification.type];
              return (
                <ListItem
                  key={notification.id}
                  sx={{
                    py: 2,
                    px: 3,
                    backgroundColor: notification.is_read ? 'transparent' : theme.palette.success.light,
                    borderBottom: index < notifications.length - 1 ? `1px solid ${theme.palette.grey[100]}` : 'none',
                    cursor: notification.link ? 'pointer' : 'default',
                    transition: 'background-color 0.2s',
                    '&:hover': { backgroundColor: theme.palette.grey[100] },
                  }}
                  onClick={() => handleNotificationClick(notification)}
                  secondaryAction={
                    <IconButton size="small" edge="end" sx={{ color: theme.palette.text.secondary }}>
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
                            color: theme.palette.text.primary,
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
                              backgroundColor: theme.palette.primary.main,
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.25 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          {formatRelativeDate(notification.created_at)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: `1px solid ${theme.palette.grey[100]}` }}>
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
