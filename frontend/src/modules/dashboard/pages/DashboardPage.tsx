import { lazy, Suspense, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Box, Typography, Paper, Avatar, Chip, List, ListItem, ListItemAvatar, ListItemText, Divider, Tabs, Tab } from '@mui/material';
import Grid from '@mui/material/Grid';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import People from '@mui/icons-material/People';
import Science from '@mui/icons-material/Science';
import TrendingUp from '@mui/icons-material/TrendingUp';
import EventBusy from '@mui/icons-material/EventBusy';
import Assignment from '@mui/icons-material/Assignment';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LocalHospital from '@mui/icons-material/LocalHospital';
import PersonSearch from '@mui/icons-material/PersonSearch';
import MedicalServices from '@mui/icons-material/MedicalServices';
import Description from '@mui/icons-material/Description';
import History from '@mui/icons-material/History';
import Receipt from '@mui/icons-material/Receipt';
import Assessment from '@mui/icons-material/Assessment';
import Badge from '@mui/icons-material/Badge';
import Inventory from '@mui/icons-material/Inventory';
import Notifications from '@mui/icons-material/Notifications';
import Settings from '@mui/icons-material/Settings';
import Verified from '@mui/icons-material/Verified';
import Analytics from '@mui/icons-material/Analytics';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useFeature } from '@/shared/hooks/useFeature';
import { getRoleLabel } from '@/shared/utils/role.utils';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { PremiumLocked } from '@/shared/components/PremiumLocked';
import { formatDate } from '@/shared/utils/localeUtils';
import { useDashboardStats, useUpcomingBookings, useMyDoctorStats, useDoctorUpcomingBookings } from '../hooks/useAnalytics';

const UsersPage = lazy(() => import('@/modules/users/pages/UsersPage'));
const DoctorsPage = lazy(() => import('@/modules/doctors/pages/DoctorsPage'));
const PatientsPage = lazy(() => import('@/modules/patients/pages/PatientsPage'));
const SpecialtiesPage = lazy(() => import('@/modules/specialties/pages/SpecialtiesPage'));
const BookingsPage = lazy(() => import('@/modules/bookings/pages/BookingsPage'));
const ClinicalRecordsPage = lazy(() => import('@/modules/clinical-records/pages/ClinicalRecordsPage'));
const PrescriptionsPage = lazy(() => import('@/modules/prescriptions/pages/PrescriptionsPage'));
const MedicalHistoryPage = lazy(() => import('@/modules/medical-history/pages/MedicalHistoryPage'));
const LabDashboardPage = lazy(() => import('@/modules/laboratory/pages/LabDashboardPage'));
const LabRequestsPage = lazy(() => import('@/modules/laboratory/pages/LabRequestsPage'));
const LabTestsCatalogPage = lazy(() => import('@/modules/laboratory/pages/LabTestsCatalogPage'));
const LabQualityControlPage = lazy(() => import('@/modules/laboratory/pages/LabQualityControlPage'));
const LabAnalyticsPage = lazy(() => import('@/modules/laboratory/pages/LabAnalyticsPage'));
const BillingPage = lazy(() => import('@/modules/billing/pages/BillingPage'));
const AdminAnalyticsPage = lazy(() => import('@/modules/analytics/pages/AdminAnalyticsPage'));
const ReportsPage = lazy(() => import('@/modules/reports/pages/ReportsPage'));
const AuditPage = lazy(() => import('@/modules/audit/pages/AuditPage'));
const NotificationsPage = lazy(() => import('@/modules/notifications/pages/NotificationsPage'));
const SettingsPage = lazy(() => import('@/modules/settings/pages/SettingsPage'));

function getStatusMap(isDark: boolean) {
  return {
    pending: { key: 'pending', color: isDark ? '#fbbf24' : '#d97706', bg: isDark ? '#422006' : '#fffbeb' },
    confirmed: { key: 'confirmed', color: isDark ? '#2dd4bf' : '#0d9488', bg: isDark ? '#042f2e' : '#f0fdfa' },
    cancelled: { key: 'cancelled', color: isDark ? '#f87171' : '#ef4444', bg: isDark ? '#450a0a' : '#fef2f2' },
    completed: { key: 'completed', color: isDark ? '#60a5fa' : '#2563eb', bg: isDark ? '#1e3a5f' : '#eff6ff' },
  };
}

function DoctorDashboard() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const statusMap = getStatusMap(isDark);
  const { data: stats, isLoading: statsLoading } = useMyDoctorStats();
  const { data: upcoming, isLoading: bookingsLoading } = useDoctorUpcomingBookings();

  if (statsLoading || bookingsLoading) return <LoadingState message={t('loading')} />;

  const statCards = [
    { label: t('upcomingAppointments'), value: stats?.upcoming_bookings ?? 0, icon: <CalendarMonth />, color: isDark ? '#2dd4bf' : '#0d9488', bgColor: isDark ? '#042f2e' : '#f0fdfa' },
    { label: t('patientsAttended'), value: stats?.patients_served ?? 0, icon: <People />, color: isDark ? '#60a5fa' : '#2563eb', bgColor: isDark ? '#1e3a5f' : '#eff6ff' },
    { label: t('totalAppointments'), value: stats?.total_bookings ?? 0, icon: <Science />, color: isDark ? '#fbbf24' : '#d97706', bgColor: isDark ? '#422006' : '#fffbeb' },
    { label: t('clinicalRecords'), value: stats?.clinical_records ?? 0, icon: <Assignment />, color: isDark ? '#a78bfa' : '#7c3aed', bgColor: isDark ? '#2e1065' : '#f5f3ff' },
  ];

  return (
    <Box>
      <PageHeader
        title={t('welcome_doctor', { name: user?.name || '' })}
        subtitle={t('role_subtitle', { role: user ? getRoleLabel(user.role) : '', tenant: user?.tenant_name || '' })}
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
                  <ListItem disablePadding sx={{ py: 1.5 }}>
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

interface SectionTab {
  key: string;
  label: string;
  icon: ReactElement;
  content: ReactNode;
}

interface SectionGroup {
  key: string;
  label: string;
  icon: ReactElement;
  sections: SectionTab[];
}

type DashboardStats = ReturnType<typeof useDashboardStats>['data'];
type UpcomingBooking = NonNullable<ReturnType<typeof useUpcomingBookings>['data']>[number];

function AdminOverview({
  t,
  isDark,
  statusMap,
  stats,
  upcoming,
}: {
  t: TFunction<'dashboard', undefined>;
  isDark: boolean;
  statusMap: ReturnType<typeof getStatusMap>;
  stats: DashboardStats;
  upcoming: UpcomingBooking[] | undefined;
}) {
  const theme = useTheme();
  const statCards = [
    { label: t('todaysAppointments'), value: stats?.today_bookings ?? 0, icon: <CalendarMonth />, color: isDark ? '#2dd4bf' : '#0d9488', bgColor: isDark ? '#042f2e' : '#f0fdfa' },
    { label: t('totalPatients'), value: stats?.total_patients ?? 0, icon: <People />, color: isDark ? '#60a5fa' : '#2563eb', bgColor: isDark ? '#1e3a5f' : '#eff6ff' },
    { label: t('totalAppointments'), value: stats?.total_bookings ?? 0, icon: <Science />, color: isDark ? '#fbbf24' : '#d97706', bgColor: isDark ? '#422006' : '#fffbeb' },
    { label: t('confirmed'), value: stats?.confirmed_bookings ?? 0, icon: <TrendingUp />, color: isDark ? '#34d399' : '#059669', bgColor: isDark ? '#022c22' : '#ecfdf5' },
  ];

  return (
    <>
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
                  <ListItem disablePadding sx={{ py: 1.5 }}>
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
    </>
  );
}

function AdminDashboard() {
  const { t } = useTranslation('dashboard');
  const { t: tn } = useTranslation('nav');
  const { user } = useAuth();
  const { hasFeature, loading: featureLoading } = useFeature();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const statusMap = getStatusMap(isDark);
  const { data: stats } = useDashboardStats();
  const { data: upcoming } = useUpcomingBookings();
  const [groupIndex, setGroupIndex] = useState(0);
  const [sectionIndex, setSectionIndex] = useState(0);

  const groups: SectionGroup[] = [
    {
      key: 'dashboard',
      label: tn('dashboard'),
      icon: <DashboardIcon />,
      sections: [
        {
          key: 'dashboard',
          label: tn('dashboard'),
          icon: <DashboardIcon />,
          content: <AdminOverview t={t} isDark={isDark} statusMap={statusMap} stats={stats} upcoming={upcoming} />,
        },
        { key: 'users', label: tn('users'), icon: <People />, content: <UsersPage /> },
        { key: 'doctors', label: tn('doctors'), icon: <LocalHospital />, content: <DoctorsPage /> },
        { key: 'patients', label: tn('patients'), icon: <PersonSearch />, content: <PatientsPage /> },
        { key: 'specialties', label: tn('specialties'), icon: <MedicalServices />, content: <SpecialtiesPage /> },
      ],
    },
    {
      key: 'clinical',
      label: tn('groupClinical'),
      icon: <MedicalServices />,
      sections: [
        { key: 'clinicalRecords', label: tn('clinicalRecords'), icon: <Description />, content: <ClinicalRecordsPage /> },
        { key: 'prescriptions', label: tn('prescriptions'), icon: <Assignment />, content: <PrescriptionsPage /> },
        { key: 'medicalHistory', label: tn('medicalHistory'), icon: <History />, content: <MedicalHistoryPage /> },
      ],
    },
    {
      key: 'management',
      label: tn('groupManagement'),
      icon: <Assignment />,
      sections: [
        { key: 'bookings', label: tn('bookings'), icon: <CalendarMonth />, content: <BookingsPage /> },
        { key: 'billing', label: tn('billing'), icon: <Receipt />, content: <BillingPage /> },
        { key: 'analytics', label: tn('analytics'), icon: <Assessment />, content: <AdminAnalyticsPage /> },
        { key: 'reports', label: tn('reports'), icon: <Badge />, content: <ReportsPage /> },
      ],
    },
    {
      key: 'laboratory',
      label: tn('laboratory'),
      icon: <Science />,
      sections: [
        { key: 'labPanel', label: tn('labPanel'), icon: <DashboardIcon />, content: <LabDashboardPage /> },
        { key: 'labRequests', label: tn('labRequests'), icon: <Assignment />, content: <LabRequestsPage /> },
        { key: 'labCatalog', label: tn('labCatalog'), icon: <Inventory />, content: <LabTestsCatalogPage /> },
        { key: 'labQualityControl', label: tn('labQualityControl'), icon: <Verified />, content: <LabQualityControlPage /> },
        { key: 'labAnalytics', label: tn('labAnalytics'), icon: <Analytics />, content: <LabAnalyticsPage /> },
      ],
    },
    {
      key: 'system',
      label: tn('groupSystem'),
      icon: <Settings />,
      sections: [
        { key: 'audit', label: tn('audit'), icon: <Inventory />, content: <AuditPage /> },
        { key: 'notifications', label: tn('notifications'), icon: <Notifications />, content: <NotificationsPage /> },
        { key: 'settings', label: tn('settings'), icon: <Settings />, content: <SettingsPage /> },
      ],
    },
  ];

  const activeGroup = groups[groupIndex]!;
  const activeSection = activeGroup.sections[Math.min(sectionIndex, activeGroup.sections.length - 1)]!;
  const laboratoryLocked = !featureLoading && activeGroup.key === 'laboratory' && !hasFeature('laboratory');

  return (
    <Box>
      <PageHeader
        title={t('welcome_user', { name: user?.name || t('default_user') })}
        subtitle={t('role_subtitle', { role: user ? getRoleLabel(user.role) : '', tenant: user?.tenant_name || '' })}
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={groupIndex}
          onChange={(_, v) => {
            setGroupIndex(v);
            setSectionIndex(0);
          }}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="admin section groups"
        >
          {groups.map((g) => (
            <Tab key={g.key} label={g.label} icon={g.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Box>

      {activeGroup.sections.length > 1 && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={sectionIndex}
            onChange={(_, v) => setSectionIndex(v)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="admin sections"
          >
            {activeGroup.sections.map((s) => (
              <Tab key={s.key} label={s.label} icon={s.icon} iconPosition="start" />
            ))}
          </Tabs>
        </Box>
      )}

      {laboratoryLocked ? (
        <PremiumLocked featureName="Laboratorio" />
      ) : (
        <Suspense fallback={<LoadingState message={t('loading')} />}>{activeSection.content}</Suspense>
      )}
    </Box>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'doctor') return <DoctorDashboard />;
  return <AdminDashboard />;
}
