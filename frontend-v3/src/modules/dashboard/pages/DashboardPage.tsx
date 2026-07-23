import { Box, Typography, Paper, Avatar, Chip, List, ListItem, ListItemAvatar, ListItemText, Divider } from '@mui/material';
import Grid from '@mui/material/Grid';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import People from '@mui/icons-material/People';
import Science from '@mui/icons-material/Science';
import TrendingUp from '@mui/icons-material/TrendingUp';
import EventBusy from '@mui/icons-material/EventBusy';
import Assignment from '@mui/icons-material/Assignment';
import LocalHospital from '@mui/icons-material/LocalHospital';
import { useAuth } from '@/shared/providers/AuthProvider';
import { getRoleLabel } from '@/shared/utils/role.utils';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { useDashboardStats, useUpcomingBookings, useMyDoctorStats, useDoctorUpcomingBookings } from '../hooks/useAnalytics';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: '#d97706', bg: '#fffbeb' },
  confirmed: { label: 'Confirmada', color: '#0d9488', bg: '#f0fdfa' },
  cancelled: { label: 'Cancelada', color: '#ef4444', bg: '#fef2f2' },
  completed: { label: 'Completada', color: '#2563eb', bg: '#eff6ff' },
};

function DoctorDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useMyDoctorStats();
  const { data: upcoming, isLoading: bookingsLoading } = useDoctorUpcomingBookings();

  if (statsLoading || bookingsLoading) return <LoadingState message="Cargando dashboard..." />;

  const statCards = [
    { label: 'Citas Proximas', value: stats?.upcoming_bookings ?? 0, icon: <CalendarMonth />, color: '#0d9488', bgColor: '#f0fdfa' },
    { label: 'Pacientes Atendidos', value: stats?.patients_served ?? 0, icon: <People />, color: '#2563eb', bgColor: '#eff6ff' },
    { label: 'Total Citas', value: stats?.total_bookings ?? 0, icon: <Science />, color: '#d97706', bg: '#fffbeb', bgColor: '#fffbeb' },
    { label: 'Expedientes', value: stats?.clinical_records ?? 0, icon: <Assignment />, color: '#7c3aed', bgColor: '#f5f3ff' },
  ];

  return (
    <Box>
      <PageHeader
        title={`Bienvenido, Dr. ${user?.name || ''}`}
        subtitle={`Rol: ${user ? getRoleLabel(user.role) : ''} | ${user?.tenant_name || ''}`}
      />

      <Grid container spacing={3}>
        {statCards.map((stat) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
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
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  {stat.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mt: 3, p: 4, border: '1px solid #e5e7eb' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1f2937' }}>
          Proximas Citas
        </Typography>
        {upcoming && upcoming.length > 0 ? (
          <List disablePadding>
            {upcoming.map((b, i) => {
              const st = STATUS_MAP[b.status] ?? STATUS_MAP.pending;
              const label = b.patient_name || b.guest_name || 'Sin nombre';
              const d = new Date(`${b.date}T00:00:00`);
              return (
                <Box key={b.id}>
                  {i > 0 && <Divider />}
                  <ListItem disablePadding sx={{ py: 1.5 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 40, height: 40, backgroundColor: st.bg, color: st.color, fontSize: '0.75rem', fontWeight: 700 }}>
                        <CalendarMonth fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                            {label}
                          </Typography>
                          <Chip label={st.label} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, backgroundColor: st.bg, color: st.color }} />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })} &middot; {b.time}
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
            <EventBusy sx={{ fontSize: 40, color: '#d1d5db', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              No hay proximas citas programadas.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats } = useDashboardStats();
  const { data: upcoming } = useUpcomingBookings();

  const statCards = [
    { label: 'Citas Hoy', value: stats?.today_bookings ?? 0, icon: <CalendarMonth />, color: '#0d9488', bgColor: '#f0fdfa' },
    { label: 'Pacientes', value: stats?.total_patients ?? 0, icon: <People />, color: '#2563eb', bgColor: '#eff6ff' },
    { label: 'Total Citas', value: stats?.total_bookings ?? 0, icon: <Science />, color: '#d97706', bgColor: '#fffbeb' },
    { label: 'Confirmadas', value: stats?.confirmed_bookings ?? 0, icon: <TrendingUp />, color: '#059669', bgColor: '#ecfdf5' },
  ];

  return (
    <Box>
      <PageHeader
        title={`Bienvenido, ${user?.name || 'Usuario'}`}
        subtitle={`Rol: ${user ? getRoleLabel(user.role) : ''} | ${user?.tenant_name || ''}`}
      />

      <Grid container spacing={3}>
        {statCards.map((stat) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
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
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  {stat.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mt: 3, p: 4, border: '1px solid #e5e7eb' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1f2937' }}>
          Proximas Citas
        </Typography>
        {upcoming && upcoming.length > 0 ? (
          <List disablePadding>
            {upcoming.map((b, i) => {
              const st = STATUS_MAP[b.status] ?? STATUS_MAP.pending;
              const label = b.patient_name || b.guest_name || 'Sin nombre';
              const d = new Date(`${b.date}T00:00:00`);
              return (
                <Box key={b.id}>
                  {i > 0 && <Divider />}
                  <ListItem disablePadding sx={{ py: 1.5 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 40, height: 40, backgroundColor: st.bg, color: st.color, fontSize: '0.75rem', fontWeight: 700 }}>
                        <CalendarMonth fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                            {label}
                          </Typography>
                          <Chip label={st.label} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, backgroundColor: st.bg, color: st.color }} />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })} &middot; {b.time} &middot; {b.doctor_name || 'Doctor'}
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
            <EventBusy sx={{ fontSize: 40, color: '#d1d5db', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              No hay proximas citas programadas.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'doctor') return <DoctorDashboard />;
  return <AdminDashboard />;
}
