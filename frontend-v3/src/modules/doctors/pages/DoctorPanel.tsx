import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
} from '@mui/material';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Science from '@mui/icons-material/Science';
import History from '@mui/icons-material/History';
import People from '@mui/icons-material/People';
import AccessTime from '@mui/icons-material/AccessTime';
import EventNote from '@mui/icons-material/EventNote';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useMyBookings } from '@/modules/bookings/hooks/useBookings';
import type { Booking } from '@/modules/bookings/types/booking.types';

const QUICK_LINKS = [
  { labelKey: 'doctor_panel.linkCalendar', icon: <CalendarMonth />, path: '/calendar', color: '#0d9488' },
  { labelKey: 'doctor_panel.linkSchedule', icon: <AccessTime />, path: '/availability', color: '#2563eb' },
  { labelKey: 'doctor_panel.linkHistory', icon: <History />, path: '/clinical-records', color: '#7c3aed' },
  { labelKey: 'doctor_panel.linkLaboratory', icon: <Science />, path: '/laboratory', color: '#f59e0b' },
  { labelKey: 'doctor_panel.linkPatients', icon: <People />, path: '/patients', color: '#059669' },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef3c7', color: '#d97706' },
  confirmed: { bg: '#dbeafe', color: '#2563eb' },
  completed: { bg: '#d1fae5', color: '#059669' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280' },
  no_show: { bg: '#fee2e2', color: '#dc2626' },
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#6b7280' };
}

function getStatusLabel(status: string, t: (key: string) => string) {
  const labels: Record<string, string> = {
    pending: t('doctor_panel.status.pending'),
    confirmed: t('doctor_panel.status.confirmed'),
    completed: t('doctor_panel.status.completed'),
    cancelled: t('doctor_panel.status.cancelled'),
    no_show: t('doctor_panel.status.no_show'),
  };
  return labels[status] || status;
}

export default function DoctorPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const today = new Date().toISOString().split('T')[0] ?? '';

  const { data, isLoading, error, refetch } = useMyBookings({
    page: 1,
    limit: 100,
    status: 'confirmed',
  });

  const bookings: Booking[] = data?.data ?? [];

  const todayBookings = useMemo(
    () => bookings.filter((b) => b.date === today),
    [bookings, today],
  );

  const upcomingBookings = useMemo(
    () => bookings.filter((b) => b.date > today).slice(0, 5),
    [bookings, today],
  );

  const patientCount = useMemo(() => {
    const patientIds = new Set(bookings.map((b) => b.patient_id).filter(Boolean));
    return patientIds.size;
  }, [bookings]);

  if (isLoading) return <LoadingState message={t('doctor_panel.loading')} />;
  if (error) return <ErrorState error={error as Error} onRetry={refetch} />;

  return (
    <Box>
      <PageHeader
        title={t('doctor_panel.welcome', { name: user?.name || '' })}
        subtitle={new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      />

      {/* Quick Links */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {QUICK_LINKS.map((link) => (
          <Grid xs={6} sm={4} md={2.4} key={link.path}>
            <Paper
              onClick={() => navigate(link.path)}
              sx={{
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: link.color,
                  boxShadow: `0 4px 12px ${link.color}22`,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Avatar sx={{ mx: 'auto', mb: 1, backgroundColor: `${link.color}15`, color: link.color }}>
                {link.icon}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                {t(link.labelKey)}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Stats */}
        <Grid xs={12} md={4}>
          <Paper sx={{ p: 2.5, border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#6b7280', mb: 2 }}>
              {t('doctor_panel.daySummary')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#374151' }}>{t('doctor_panel.todayAppointments')}</Typography>
                <Chip label={todayBookings.length} size="small" sx={{ backgroundColor: '#0d9488', color: '#fff', fontWeight: 600 }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#374151' }}>{t('doctor_panel.upcomingAppointments')}</Typography>
                <Chip label={upcomingBookings.length} size="small" sx={{ backgroundColor: '#2563eb', color: '#fff', fontWeight: 600 }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#374151' }}>{t('doctor_panel.activePatients')}</Typography>
                <Chip label={patientCount} size="small" sx={{ backgroundColor: '#7c3aed', color: '#fff', fontWeight: 600 }} />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Today's Agenda */}
        <Grid xs={12} md={8}>
          <Paper sx={{ p: 2.5, border: '1px solid #e5e7eb', borderRadius: '12px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <EventNote sx={{ color: '#0d9488', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151' }}>
                {t('doctor_panel.todayAgenda')}
              </Typography>
            </Box>

            {todayBookings.length === 0 ? (
              <EmptyState
                title={t('doctor_panel.noAppointmentsToday')}
                message={t('doctor_panel.noAppointmentsTodayDesc')}
              />
            ) : (
              <List disablePadding>
                {todayBookings.map((booking, idx) => {
                  const st = getStatusColor(booking.status);
                  return (
                    <Box key={booking.id}>
                      {idx > 0 && <Divider />}
                      <ListItem
                        sx={{ px: 0, py: 1.5 }}
                        secondaryAction={
                          <Chip label={getStatusLabel(booking.status, t)} size="small" sx={{ backgroundColor: st.bg, color: st.color, fontWeight: 500 }} />
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ backgroundColor: '#0d948815', color: '#0d9488', width: 40, height: 40, fontSize: 14, fontWeight: 600 }}>
                            {booking.time}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={booking.patient_name || booking.guest_name || t('doctor_panel.patient')}
                          secondary={`${booking.duration || 30} min${booking.doctor_name ? ` · ${booking.doctor_name}` : ''}`}
                          primaryTypographyProps={{ fontWeight: 600, color: '#1f2937' }}
                          secondaryTypographyProps={{ color: '#6b7280', fontSize: 13 }}
                        />
                      </ListItem>
                    </Box>
                  );
                })}
              </List>
            )}

            {todayBookings.length > 0 && (
              <Box sx={{ mt: 1, textAlign: 'center' }}>
                <Button size="small" onClick={() => navigate('/bookings')} sx={{ textTransform: 'none', color: '#0d9488' }}>
                  {t('doctor_panel.viewAll')}
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
