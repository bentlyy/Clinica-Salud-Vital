import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar } from '@mui/material';
import Star from '@mui/icons-material/Star';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { useAdminAnalytics } from '../hooks/useAnalytics';
import { BookingsByMonthChart } from '../components/BookingsByMonthChart';
import { RevenueChart } from '../components/RevenueChart';
import { StatusPieChart } from '../components/StatusPieChart';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);

export default function AdminAnalyticsPage() {
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

      {/* Charts Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <BookingsByMonthChart
          data={analytics?.bookings_by_month ?? []}
          isLoading={isLoading}
        />
        <RevenueChart
          data={analytics?.revenue_by_month ?? []}
          isLoading={isLoading}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <StatusPieChart
          data={analytics?.bookings_by_status ?? []}
          isLoading={isLoading}
        />

        {/* Top Doctors Table */}
        <Paper
          sx={{ p: 3, border: '1px solid #e5e7eb' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Star sx={{ color: '#f59e0b' }} />
            <Box component="h3" sx={{ fontWeight: 600, color: '#1f2937', fontSize: '1.125rem', margin: 0 }}>
              Doctores Destacados
            </Box>
          </Box>

          {isLoading ? (
            <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box component="span" sx={{ color: '#6b7280' }}>Cargando datos...</Box>
            </Box>
          ) : !analytics?.top_doctors?.length ? (
            <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box component="span" sx={{ color: '#6b7280' }}>No hay datos disponibles</Box>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Doctor</TableCell>
                    <TableCell align="right">Citas</TableCell>
                    <TableCell align="right">Ingresos</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.top_doctors.map((doctor, index) => (
                    <TableRow key={`${doctor.name}-${index}`} hover>
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
                      <TableCell align="right">
                        <Box component="span" sx={{ color: '#374151', fontSize: '0.8125rem' }}>
                          {doctor.appointments}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box component="span" sx={{ fontWeight: 600, color: '#0d9488', fontSize: '0.8125rem' }}>
                          {formatCurrency(doctor.revenue)}
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
    </Box>
  );
}
