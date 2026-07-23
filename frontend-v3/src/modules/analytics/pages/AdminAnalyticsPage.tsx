import { useState } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar, Typography, Tabs, Tab, CircularProgress } from '@mui/material';
import Star from '@mui/icons-material/Star';
import People from '@mui/icons-material/People';
import Event from '@mui/icons-material/Event';
import LocalHospital from '@mui/icons-material/LocalHospital';
import Today from '@mui/icons-material/Today';
import TrendingUp from '@mui/icons-material/TrendingUp';
import WarningAmber from '@mui/icons-material/WarningAmber';
import MonitorHeart from '@mui/icons-material/MonitorHeart';
import QueryStats from '@mui/icons-material/QueryStats';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Insights from '@mui/icons-material/Insights';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import {
  useAdminAnalytics, useMyDoctorStats, useBookingsByMonth, useStatusDistribution,
  useNoShows, useDiagnoses, useDemand, useSchedules, useVitals,
} from '../hooks/useAnalytics';
import { BookingsByMonthChart } from '../components/BookingsByMonthChart';
import { StatusPieChart } from '../components/StatusPieChart';
import { NoShowsPanel } from '../components/NoShowsPanel';
import { DiagnosesPanel } from '../components/DiagnosesPanel';
import { DemandPanel } from '../components/DemandPanel';
import { SchedulesPanel } from '../components/SchedulesPanel';
import { VitalsPanel } from '../components/VitalsPanel';
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

function LoadingPanel() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
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
      <PageHeader title="Mis Analíticas" subtitle="Resumen de tu actividad como doctor" />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <StatCard icon={<Event sx={{ color: '#fff' }} />} label="Mis Citas" value={myStats?.total_bookings ?? '—'} color="#8b5cf6" />
        <StatCard icon={<People sx={{ color: '#fff' }} />} label="Pacientes Atendidos" value={myStats?.patients_served ?? '—'} color="#0d9488" />
        <StatCard icon={<Today sx={{ color: '#fff' }} />} label="Próximas Citas" value={myStats?.upcoming_bookings ?? '—'} color="#f59e0b" />
        <StatCard icon={<TrendingUp sx={{ color: '#fff' }} />} label="Expedientes" value={myStats?.clinical_records ?? '—'} color="#2563eb" />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <BookingsByMonthChart data={monthData ?? []} isLoading={monthLoading} />
        <StatusPieChart data={statusData ?? []} isLoading={statusLoading} />
      </Box>
    </Box>
  );
}

const ML_TABS = [
  { key: 'overview', label: 'General', icon: <Insights sx={{ fontSize: 18 }} /> },
  { key: 'noshow', label: 'No-Shows', icon: <WarningAmber sx={{ fontSize: 18 }} /> },
  { key: 'diagnoses', label: 'Diagnósticos', icon: <MonitorHeart sx={{ fontSize: 18 }} /> },
  { key: 'demand', label: 'Demanda', icon: <QueryStats sx={{ fontSize: 18 }} /> },
  { key: 'schedules', label: 'Horarios', icon: <CalendarMonth sx={{ fontSize: 18 }} /> },
  { key: 'vitals', label: 'Vitales', icon: <MonitorHeart sx={{ fontSize: 18 }} /> },
];

function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: analytics, isLoading, error, refetch } = useAdminAnalytics();
  const { data: noShows, isLoading: noShowsLoading } = useNoShows();
  const { data: diagnoses, isLoading: diagnosesLoading } = useDiagnoses();
  const { data: demand, isLoading: demandLoading } = useDemand();
  const { data: schedules, isLoading: schedulesLoading } = useSchedules();
  const { data: vitals, isLoading: vitalsLoading } = useVitals();

  if (error) {
    return <ErrorState error={error as Error} onRetry={refetch} />;
  }

  return (
    <Box>
      <PageHeader title="Analíticas" subtitle="Visualiza el rendimiento de la clínica e inteligencia predictiva" />

      <Paper sx={{ border: '1px solid #e5e7eb', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, minHeight: 48 },
          }}
        >
          {ML_TABS.map((tab) => (
            <Tab key={tab.key} value={tab.key} label={tab.label} icon={tab.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {activeTab === 'overview' && (
        <Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
            <StatCard icon={<People sx={{ color: '#fff' }} />} label="Total Pacientes" value={analytics?.stats?.total_patients ?? '—'} color="#0d9488" />
            <StatCard icon={<LocalHospital sx={{ color: '#fff' }} />} label="Total Doctores" value={analytics?.stats?.total_doctors ?? '—'} color="#3b82f6" />
            <StatCard icon={<Event sx={{ color: '#fff' }} />} label="Total Citas" value={analytics?.stats?.total_bookings ?? '—'} color="#8b5cf6" />
            <StatCard icon={<Today sx={{ color: '#fff' }} />} label="Citas Hoy" value={analytics?.stats?.today_bookings ?? '—'} color="#f59e0b" />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
            <BookingsByMonthChart data={analytics?.bookings_by_month ?? []} isLoading={isLoading} />
            <StatusPieChart data={analytics?.bookings_by_status ?? []} isLoading={isLoading} />
          </Box>
          <Paper sx={{ p: 3, border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Star sx={{ color: '#f59e0b' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Doctores Destacados</Typography>
            </Box>
            {isLoading ? (
              <LoadingPanel />
            ) : !analytics?.top_doctors?.length ? (
              <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', py: 4 }}>No hay datos disponibles</Typography>
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
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#0d9488', fontSize: '0.75rem', fontWeight: 600 }}>
                              {doctor.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{doctor.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><Typography variant="body2" sx={{ color: '#6b7280' }}>{doctor.specialty || '—'}</Typography></TableCell>
                        <TableCell align="right">{doctor.appointments}</TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 600, color: '#0d9488' }}>{doctor.confirmed_bookings}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      )}

      {activeTab === 'noshow' && (noShowsLoading ? <LoadingPanel /> : <NoShowsPanel data={noShows ?? []} />)}
      {activeTab === 'diagnoses' && (diagnosesLoading ? <LoadingPanel /> : <DiagnosesPanel data={diagnoses ?? []} />)}
      {activeTab === 'demand' && (demandLoading ? <LoadingPanel /> : <DemandPanel data={demand ?? []} />)}
      {activeTab === 'schedules' && (schedulesLoading ? <LoadingPanel /> : <SchedulesPanel data={schedules ?? []} />)}
      {activeTab === 'vitals' && (vitalsLoading ? <LoadingPanel /> : <VitalsPanel data={vitals ?? []} />)}
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
