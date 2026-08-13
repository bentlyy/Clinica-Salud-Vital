import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar, Typography, Tabs, Tab, CircularProgress, Button } from '@mui/material';
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
import FileDownload from '@mui/icons-material/FileDownload';
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
import type { AdminAnalytics } from '../types/analytics.types';

const StatCard = memo(function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  const theme = useTheme();
  return (
    <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>
        {icon}
      </Avatar>
      <Box>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: '0.8125rem' }}>{label}</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>{value}</Typography>
      </Box>
    </Paper>
  );
});

function LoadingPanel() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

const escapeCsv = (value: string | number) => {
  const str = String(value ?? '');
  return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const exportAnalyticsCsv = (analytics: AdminAnalytics | undefined, t: (key: string, fallback: string) => string) => {
  const lines: string[] = [];
  const pushSection = (title: string, headers: string[], rows: Array<Array<string | number>>) => {
    lines.push(`# ${title}`);
    if (rows.length > 0) {
      lines.push(headers.map(escapeCsv).join(','));
      rows.forEach((row) => lines.push(row.map(escapeCsv).join(',')));
    }
  };

  pushSection(
    t('csvMetrics', 'Metrics'),
    [t('csvMetric', 'Metric'), t('csvValue', 'Value')],
    Object.entries(analytics?.stats ?? {}).map(([key, value]) => [key, value as number]),
  );
  pushSection(
    t('csvBookingsByMonth', 'Bookings by month'),
    [t('csvMonth', 'Month'), t('csvBookings', 'Bookings')],
    (analytics?.bookings_by_month ?? []).map((r) => [String(r.month ?? ''), Number(r.total ?? 0)]),
  );
  pushSection(
    t('csvBookingStatus', 'Booking status'),
    [t('csvStatus', 'Status'), t('csvCount', 'Count')],
    (analytics?.bookings_by_status ?? []).map((r) => [String(r.status ?? ''), Number(r.count ?? 0)]),
  );
  pushSection(
    t('csvTopDoctors', 'Top doctors'),
    [t('colDoctor', 'Doctor'), t('colSpecialty', 'Specialty'), t('colBookings', 'Bookings'), t('colConfirmed', 'Confirmed')],
    (analytics?.top_doctors ?? []).map((d) => [String(d.name ?? ''), String(d.specialty ?? ''), Number(d.appointments ?? 0), Number(d.confirmed_bookings ?? 0)]),
  );

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `analytics_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

function DoctorAnalytics() {
  const { t } = useTranslation('admin_analytics');
  const theme = useTheme();
  const { data: myStats, error: statsError, refetch: statsRefetch } = useMyDoctorStats();
  const { data: monthData, isLoading: monthLoading } = useBookingsByMonth();
  const { data: statusData, isLoading: statusLoading } = useStatusDistribution();

  if (statsError) {
    return <ErrorState error={statsError as Error} onRetry={statsRefetch} />;
  }

  return (
    <Box>
      <PageHeader title={t('myAnalytics')} subtitle={t('myAnalyticsSubtitle')} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <StatCard icon={<Event sx={{ color: theme.palette.common.white }} />} label={t('myBookings')} value={myStats?.total_bookings ?? '—'} color={theme.palette.secondary.main} />
        <StatCard icon={<People sx={{ color: theme.palette.common.white }} />} label={t('patientsServed')} value={myStats?.patients_served ?? '—'} color={theme.palette.primary.main} />
        <StatCard icon={<Today sx={{ color: theme.palette.common.white }} />} label={t('upcomingBookings')} value={myStats?.upcoming_bookings ?? '—'} color={theme.palette.warning.main} />
        <StatCard icon={<TrendingUp sx={{ color: theme.palette.common.white }} />} label={t('clinicalRecords')} value={myStats?.clinical_records ?? '—'} color={theme.palette.info.dark} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <BookingsByMonthChart data={monthData ?? []} isLoading={monthLoading} />
        <StatusPieChart data={statusData ?? []} isLoading={statusLoading} />
      </Box>
    </Box>
  );
}

function AdminAnalytics() {
  const { t } = useTranslation('admin_analytics');
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const { data: analytics, isLoading, error, refetch } = useAdminAnalytics();
  const { data: noShows, isLoading: noShowsLoading } = useNoShows();
  const { data: diagnoses, isLoading: diagnosesLoading } = useDiagnoses();
  const { data: demand, isLoading: demandLoading } = useDemand();
  const { data: schedules, isLoading: schedulesLoading } = useSchedules();
  const { data: vitals, isLoading: vitalsLoading } = useVitals();

  const ML_TABS = [
    { key: 'overview', label: t('tabGeneral'), icon: <Insights sx={{ fontSize: 18 }} /> },
    { key: 'noshow', label: t('tabNoShows'), icon: <WarningAmber sx={{ fontSize: 18 }} /> },
    { key: 'diagnoses', label: t('tabDiagnoses'), icon: <MonitorHeart sx={{ fontSize: 18 }} /> },
    { key: 'demand', label: t('tabDemand'), icon: <QueryStats sx={{ fontSize: 18 }} /> },
    { key: 'schedules', label: t('tabSchedules'), icon: <CalendarMonth sx={{ fontSize: 18 }} /> },
    { key: 'vitals', label: t('tabVitals'), icon: <MonitorHeart sx={{ fontSize: 18 }} /> },
  ];

  if (error) {
    return <ErrorState error={error as Error} onRetry={refetch} />;
  }

  return (
    <Box>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Paper sx={{ border: `1px solid ${theme.palette.divider}`, mb: 3 }}>
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
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownload />}
              onClick={() => exportAnalyticsCsv(analytics, t)}
            >
              {t('exportCSV')}
            </Button>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2.5, mb: 3 }}>
            <StatCard icon={<People sx={{ color: theme.palette.common.white }} />} label={t('totalPatients')} value={analytics?.stats?.total_patients ?? '—'} color={theme.palette.primary.main} />
            <StatCard icon={<LocalHospital sx={{ color: theme.palette.common.white }} />} label={t('totalDoctors')} value={analytics?.stats?.total_doctors ?? '—'} color={theme.palette.info.main} />
            <StatCard icon={<Event sx={{ color: theme.palette.common.white }} />} label={t('totalBookings')} value={analytics?.stats?.total_bookings ?? '—'} color={theme.palette.secondary.main} />
            <StatCard icon={<Today sx={{ color: theme.palette.common.white }} />} label={t('todayBookings')} value={analytics?.stats?.today_bookings ?? '—'} color={theme.palette.warning.main} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
            <BookingsByMonthChart data={analytics?.bookings_by_month ?? []} isLoading={isLoading} />
            <StatusPieChart data={analytics?.bookings_by_status ?? []} isLoading={isLoading} />
          </Box>
          <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Star sx={{ color: theme.palette.warning.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('topDoctors')}</Typography>
            </Box>
            {isLoading ? (
              <LoadingPanel />
            ) : !analytics?.top_doctors?.length ? (
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textAlign: 'center', py: 4 }}>{t('noData')}</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('colDoctor')}</TableCell>
                      <TableCell>{t('colSpecialty')}</TableCell>
                      <TableCell align="right">{t('colBookings')}</TableCell>
                      <TableCell align="right">{t('colConfirmed')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.top_doctors.map((doctor) => (
                      <TableRow key={doctor.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: '0.75rem', fontWeight: 600 }}>
                              {doctor.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{doctor.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{doctor.specialty || '—'}</Typography></TableCell>
                        <TableCell align="right">{doctor.appointments}</TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>{doctor.confirmed_bookings}</Typography></TableCell>
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
