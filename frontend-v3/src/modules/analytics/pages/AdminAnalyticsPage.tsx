import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar, Typography } from '@mui/material';
import Star from '@mui/icons-material/Star';
import People from '@mui/icons-material/People';
import Event from '@mui/icons-material/Event';
import LocalHospital from '@mui/icons-material/LocalHospital';
import Today from '@mui/icons-material/Today';
import TrendingUp from '@mui/icons-material/TrendingUp';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { useAdminAnalytics, useMyDoctorStats, useBookingsByMonth, useStatusDistribution } from '../hooks/useAnalytics';
import { BookingsByMonthChart } from '../components/BookingsByMonthChart';
import { StatusPieChart } from '../components/StatusPieChart';
import { useAuth } from '@/shared/providers/AuthProvider';

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <Paper sx={{ p: 2.5, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>
        {icon}
      </Avatar>
      <Box>
        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.8125rem' }}>{label}</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>{value}</Typography>
      </Box>
    </Paper>
  );
}

function DoctorAnalytics() {
  const { data: myStats, isLoading: statsLoading, error: statsError, refetch: statsRefetch } = useMyDoctorStats();
  const { data: monthData, isLoading: monthLoading } = useBookingsByMonth();
  const { data: statusData, isLoading: statusLoading } = useStatusDistribution();

  if (statsError) {
    return <ErrorState error={statsError as Error} onRetry={statsRefetch} />;
  }

  return (
    <Box>
      <PageHeader
        title="Mis Analíticas"
        subtitle="Resumen de tu actividad como doctor"
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <StatCard
          icon={<Event sx={{ color: '#fff' }} />}
          label="Mis Citas"
          value={myStats?.total_bookings ?? '—'}
          color="#8b5cf6"
        />
        <StatCard
          icon={<People sx={{ color: '#fff' }} />}
          label="Pacientes Atendidos"
          value={myStats?.patients_served ?? '—'}
          color="#0d9488"
        />
        <StatCard
          icon={<Today sx={{ color: '#fff' }} />}
          label="Próximas Citas"
          value={myStats?.upcoming_bookings ?? '—'}
          color="#f59e0b"
        />
        <StatCard
          icon={<TrendingUp sx={{ color: '#fff' }} />}
          label="Expedientes"
          value={myStats?.clinical_records ?? '—'}
          color="#2563eb"
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <BookingsByMonthChart data={monthData ?? []} isLoading={monthLoading} />
        <StatusPieChart data={statusData ?? []} isLoading={statusLoading} />
      </Box>
    </Box>
  );
}

function AdminAnalytics() {
  const { data: analytics, isLoading, error, refetch } = useAdminAnalytics();

  if (error) {
    return <ErrorState error={error as Error} onRetry={refetch} />;
  }

  return (
    <Box>
      <PageHeader
        title="Analíticas"
        subtitle="Visualiza el rendimiento de la clínica"
      />

      {/* KPI Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <StatCard
          icon={<People sx={{ color: '#fff' }} />}
          label="Total Pacientes"
          value={analytics?.stats?.total_patients ?? '—'}
          color="#0d9488"
        />
        <StatCard
          icon={<LocalHospital sx={{ color: '#fff' }} />}
          label="Total Doctores"
          value={analytics?.stats?.total_doctors ?? '—'}
          color="#3b82f6"
        />
        <StatCard
          icon={<Event sx={{ color: '#fff' }} />}
          label="Total Citas"
          value={analytics?.stats?.total_bookings ?? '—'}
          color="#8b5cf6"
        />
        <StatCard
          icon={<Today sx={{ color: '#fff' }} />}
          label="Citas Hoy"
          value={analytics?.stats?.today_bookings ?? '—'}
          color="#f59e0b"
        />
      </Box>

      {/* Charts Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <BookingsByMonthChart
          data={analytics?.bookings_by_month ?? []}
          isLoading={isLoading}
        />
        <StatusPieChart
          data={analytics?.bookings_by_status ?? []}
          isLoading={isLoading}
        />
      </Box>

      {/* Top Doctors Table */}
      <Paper sx={{ p: 3, border: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Star sx={{ color: '#f59e0b' }} />
          <Box component="h3" sx={{ fontWeight: 600, color: '#1f2937', fontSize: '1.125rem', margin: 0 }}>
            Doctores Destacados
          </Box>
        </Box>

        {isLoading ? (
          <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>Cargando datos...</Typography>
          </Box>
        ) : !analytics?.top_doctors?.length ? (
          <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>No hay datos disponibles</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Doctor</TableCell>
                  <TableCell>Especialidad</TableCell>
                  <TableCell align="right">Citas</TableCell>
                  <TableCell align="right">Confirmadas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.top_doctors.map((doctor) => (
                  <TableRow key={doctor.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            backgroundColor: '#0d9488',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {doctor.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box component="span" sx={{ fontWeight: 500, color: '#1f2937', fontSize: '0.8125rem' }}>
                          {doctor.name}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.8125rem' }}>
                        {doctor.specialty || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box component="span" sx={{ color: '#374151', fontSize: '0.8125rem' }}>
                        {doctor.appointments}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box component="span" sx={{ fontWeight: 600, color: '#0d9488', fontSize: '0.8125rem' }}>
                        {doctor.confirmed_bookings}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}

export default function AdminAnalyticsPage() {
  const { user } = useAuth();

  if (user?.role === 'doctor') {
    return <DoctorAnalytics />;
  }

  return <AdminAnalytics />;
}
