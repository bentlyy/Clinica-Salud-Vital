import { Box, Typography, Paper, Avatar, Chip, List, ListItem, ListItemAvatar, ListItemText, Divider, Tabs, Tab } from '@mui/material';
import Grid from '@mui/material/Grid';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import People from '@mui/icons-material/People';
import Science from '@mui/icons-material/Science';
import TrendingUp from '@mui/icons-material/TrendingUp';
import EventBusy from '@mui/icons-material/EventBusy';
import Assignment from '@mui/icons-material/Assignment';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme, type Theme } from '@mui/material/styles';
import { useAuth } from '@/shared/providers/AuthProvider';
import { getRoleLabel } from '@/shared/utils/role.utils';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { formatDate } from '@/shared/utils/localeUtils';
import { useDashboardStats, useUpcomingBookings, useMyDoctorStats, useDoctorUpcomingBookings } from '../hooks/useAnalytics';
import { useMyBookings } from '@/modules/bookings/hooks/useBookings';
import UsersPage from '@/modules/users/pages/UsersPage';
import DoctorsPage from '@/modules/doctors/pages/DoctorsPage';
import PatientsPage from '@/modules/patients/pages/PatientsPage';
import SpecialtiesPage from '@/modules/specialties/pages/SpecialtiesPage';

function getStatusMap(theme: Theme) {
  return {
    pending: { key: 'pending', color: theme.palette.custom.status.warning.text, bg: theme.palette.custom.status.warning.bg },
    confirmed: { key: 'confirmed', color: theme.palette.primary.main, bg: theme.palette.custom.brand.lightest },
    cancelled: { key: 'cancelled', color: theme.palette.error.main, bg: theme.palette.custom.status.error.bg },
    completed: { key: 'completed', color: theme.palette.info.main, bg: theme.palette.custom.status.info.bg },
  };
}

function DoctorDashboard() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const theme = useTheme();
  const statusMap = getStatusMap(theme);
  const { data: stats, isLoading: statsLoading } = useMyDoctorStats();
  const { data: upcoming, isLoading: bookingsLoading } = useDoctorUpcomingBookings();

  if (statsLoading || bookingsLoading) return <LoadingState message={t('loading')} />;

  const statCards = [
    { label: t('upcomingAppointments'), value: stats?.upcoming_bookings ?? 0, icon: <CalendarMonth />, color: theme.palette.primary.main, bgColor: theme.palette.custom.brand.lightest },
    { label: t('patientsAttended'), value: stats?.patients_served ?? 0, icon: <People />, color: theme.palette.info.main, bgColor: theme.palette.custom.status.info.bg },
    { label: t('totalAppointments'), value: stats?.total_bookings ?? 0, icon: <Science />, color: theme.palette.custom.status.warning.text, bgColor: theme.palette.custom.status.warning.bg },
    { label: t('clinicalRecords'), value: stats?.clinical_records ?? 0, icon: <Assignment />, color: theme.palette.custom.purple.text, bgColor: theme.palette.custom.purple.bg },
  ];

  return (
    <Box>
      <PageHeader
        title={t('welcome_doctor', { name: user?.name || '' })}
        subtitle={t('role_subtitle', { role: user ? getRoleLabel(user.role, t) : '', tenant: user?.tenant_name || '' })}
      />

      <Grid container spacing={4}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Paper
              sx={{
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '12px',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
              }}
            >
              <Avatar sx={{ width: 48, height: 48, backgroundColor: stat.bgColor, color: stat.color }}>
                {stat.icon}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {stat.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mt: 2.5, p: 2.5, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
          {t('upcoming_appointments_section')}
        </Typography>
        {upcoming && upcoming.length > 0 ? (
          <List disablePadding>
            {upcoming.map((b, i) => {
              const st = statusMap[b.status as keyof typeof statusMap] ?? statusMap.pending;
              const label = b.patient_name || b.guest_name || t('no_name');
              const d = new Date(`${b.date}T00:00:00`);
              return (
                <Box key={b.id}>
                  {i > 0 && <Divider />}
                  <ListItem disablePadding sx={{ py: 1.25 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 36, height: 36, backgroundColor: st.bg, color: st.color, fontSize: '0.75rem', fontWeight: 700 }}>
                        <CalendarMonth fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {label}
                          </Typography>
                          <Chip label={t(`status.${st.key}`)} size="small" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 600, backgroundColor: st.bg, color: st.color }} />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' })} &middot; {b.time}
                        </Typography>
                      }
                    />
                  </ListItem>
                </Box>
              );
            })}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <EventBusy sx={{ fontSize: 40, color: 'text.secondary', mb: 1, opacity: 0.4 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('no_upcoming_appointments')}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

function PatientDashboard() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const theme = useTheme();
  const statusMap = getStatusMap(theme);
  const { data, isLoading } = useMyBookings({ page: 1, limit: 50 });

  if (isLoading) return <LoadingState message={t('loading')} />;

  const bookings = data?.data ?? [];
  const upcoming = bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed');
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;

  const statCards = [
    { label: t('upcomingAppointments'), value: upcoming.length, icon: <CalendarMonth />, color: theme.palette.primary.main, bgColor: theme.palette.custom.brand.lightest },
    { label: t('completed'), value: completed, icon: <Assignment />, color: theme.palette.info.main, bgColor: theme.palette.custom.status.info.bg },
    { label: t('cancelled'), value: cancelled, icon: <EventBusy />, color: theme.palette.error.main, bgColor: theme.palette.custom.status.error.bg },
    { label: t('totalAppointments'), value: bookings.length, icon: <Science />, color: theme.palette.custom.status.warning.text, bgColor: theme.palette.custom.status.warning.bg },
  ];

  return (
    <Box>
      <PageHeader
        title={t('welcome_user', { name: user?.name || t('default_user') })}
        subtitle={t('role_subtitle', { role: user ? getRoleLabel(user.role, t) : '', tenant: user?.tenant_name || '' })}
      />

      <Grid container spacing={3}>
        {statCards.map((stat) => (
          <Grid xs={12} sm={6} md={3} key={stat.label}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
              }}
            >
              <Avatar sx={{ width: 48, height: 48, backgroundColor: stat.bgColor, color: stat.color }}>
                {stat.icon}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {stat.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mt: 3, p: 4, border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
          {t('upcoming_appointments_section')}
        </Typography>
        {upcoming.length > 0 ? (
          <List disablePadding>
            {upcoming.map((b, i) => {
              const st = statusMap[b.status as keyof typeof statusMap] ?? statusMap.pending;
              const d = new Date(`${b.date}T00:00:00`);
              return (
                <Box key={b.id}>
                  {i > 0 && <Divider />}
                  <ListItem disablePadding sx={{ py: 2 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 40, height: 40, backgroundColor: st.bg, color: st.color, fontSize: '0.75rem', fontWeight: 700 }}>
                        <CalendarMonth fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {b.doctor_name || t('doctor')}
                          </Typography>
                          <Chip label={t(`status.${st.key}`)} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, backgroundColor: st.bg, color: st.color }} />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' })} &middot; {b.time}
                        </Typography>
                      }
                    />
                  </ListItem>
                </Box>
              );
            })}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <EventBusy sx={{ fontSize: 40, color: 'text.secondary', mb: 1, opacity: 0.4 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('no_upcoming_appointments')}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

function AdminOverview() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const theme = useTheme();
  const statusMap = getStatusMap(theme);
  const { data: stats } = useDashboardStats();
  const { data: upcoming } = useUpcomingBookings();

  const statCards = [
    { label: t('todaysAppointments'), value: stats?.today_bookings ?? 0, icon: <CalendarMonth />, color: theme.palette.primary.main, bgColor: theme.palette.custom.brand.lightest },
    { label: t('totalPatients'), value: stats?.total_patients ?? 0, icon: <People />, color: theme.palette.info.main, bgColor: theme.palette.custom.status.info.bg },
    { label: t('totalAppointments'), value: stats?.total_bookings ?? 0, icon: <Science />, color: theme.palette.custom.status.warning.text, bgColor: theme.palette.custom.status.warning.bg },
    { label: t('confirmed'), value: stats?.confirmed_bookings ?? 0, icon: <TrendingUp />, color: theme.palette.success.main, bgColor: theme.palette.custom.status.success.bg },
  ];

  return (
    <Box>
      <PageHeader
        title={t('welcome_user', { name: user?.name || t('default_user') })}
        subtitle={t('role_subtitle', { role: user ? getRoleLabel(user.role, t) : '', tenant: user?.tenant_name || '' })}
      />

      <Grid container spacing={3}>
        {statCards.map((stat) => (
          <Grid xs={12} sm={6} md={3} key={stat.label}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
              }}
            >
              <Avatar sx={{ width: 48, height: 48, backgroundColor: stat.bgColor, color: stat.color }}>
                {stat.icon}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {stat.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mt: 3, p: 4, border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
          {t('upcoming_appointments_section')}
        </Typography>
        {upcoming && upcoming.length > 0 ? (
          <List disablePadding>
            {upcoming.map((b, i) => {
              const st = statusMap[b.status as keyof typeof statusMap] ?? statusMap.pending;
              const label = b.patient_name || b.guest_name || t('no_name');
              const d = new Date(`${b.date}T00:00:00`);
              return (
                <Box key={b.id}>
                  {i > 0 && <Divider />}
                  <ListItem disablePadding sx={{ py: 2 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 40, height: 40, backgroundColor: st.bg, color: st.color, fontSize: '0.75rem', fontWeight: 700 }}>
                        <CalendarMonth fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {label}
                          </Typography>
                          <Chip label={t(`status.${st.key}`)} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, backgroundColor: st.bg, color: st.color }} />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' })} &middot; {b.time} &middot; {b.doctor_name || t('doctor')}
                        </Typography>
                      }
                    />
                  </ListItem>
                </Box>
              );
            })}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <EventBusy sx={{ fontSize: 40, color: 'text.secondary', mb: 1, opacity: 0.4 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('no_upcoming_appointments')}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

function AdminDashboard() {
  const { t } = useTranslation('dashboard');
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: t('tabDashboard'), content: <AdminOverview /> },
    { label: t('tabUsers'), content: <UsersPage /> },
    { label: t('tabDoctors'), content: <DoctorsPage /> },
    { label: t('tabPatients'), content: <PatientsPage /> },
    { label: t('tabSpecialties'), content: <SpecialtiesPage /> },
  ];

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          {tabs.map((tb) => (
            <Tab key={tb.label} label={tb.label} />
          ))}
        </Tabs>
      </Box>
      <Box>{tabs[tab]?.content}</Box>
    </Box>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'doctor') return <DoctorDashboard />;
  if (user?.role === 'patient' || user?.role === 'user') return <PatientDashboard />;
  return <AdminDashboard />;
}
