import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/providers/AuthProvider';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { AuthLayout } from '@/shared/components/layout/AuthLayout';
import { PatientLayout } from '@/shared/components/layout/PatientLayout';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import type { ReactNode } from 'react';

// Lazy loaded pages
const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/modules/dashboard/pages/DashboardPage'));
const UsersPage = lazy(() => import('@/modules/users/pages/UsersPage'));
const DoctorsPage = lazy(() => import('@/modules/doctors/pages/DoctorsPage'));
const BookingsPage = lazy(() => import('@/modules/bookings/pages/BookingsPage'));
const AvailabilityPage = lazy(() => import('@/modules/availability/pages/AvailabilityPage'));
const BillingPage = lazy(() => import('@/modules/billing/pages/BillingPage'));
const AdminAnalyticsPage = lazy(() => import('@/modules/analytics/pages/AdminAnalyticsPage'));
const ReportsPage = lazy(() => import('@/modules/reports/pages/ReportsPage'));

// Real module pages
const ClinicalRecordsPage = lazy(() => import('@/modules/clinical-records/pages/ClinicalRecordsPage'));
const ClinicalRecordDetailPage = lazy(() => import('@/modules/clinical-records/pages/ClinicalRecordDetailPage'));
const PrescriptionsPage = lazy(() => import('@/modules/prescriptions/pages/PrescriptionsPage'));
const MedicalHistoryPage = lazy(() => import('@/modules/medical-history/pages/MedicalHistoryPage'));

// Laboratory module
const LabDashboardPage = lazy(() => import('@/modules/laboratory/pages/LabDashboardPage'));
const LabRequestsPage = lazy(() => import('@/modules/laboratory/pages/LabRequestsPage'));
const LabRequestDetailPage = lazy(() => import('@/modules/laboratory/pages/LabRequestDetailPage'));

// Audit module
const AuditPage = lazy(() => import('@/modules/audit/pages/AuditPage'));

// Settings module
const SettingsPage = lazy(() => import('@/modules/settings/pages/SettingsPage'));

// Notifications module
const NotificationsPage = lazy(() => import('@/modules/notifications/pages/NotificationsPage'));

// Super Admin module
const SuperAdminDashboardPage = lazy(() => import('@/modules/super-admin/pages/SuperAdminDashboardPage'));
const SuperAdminTenantsPage = lazy(() => import('@/modules/super-admin/pages/SuperAdminTenantsPage'));

// Specialties module
const SpecialtiesPage = lazy(() => import('@/modules/specialties/pages/SpecialtiesPage'));

// Patients module
const PatientsPage = lazy(() => import('@/modules/patients/pages/PatientsPage'));

// Placeholder pages - will be replaced with real implementations
const PlaceholderPage = lazy(() => import('@/shared/components/ui/PlaceholderPage'));

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
        </Route>

        {/* Dashboard routes (admin, doctor, lab, superadmin) */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'doctor', 'lab_technician']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tenants" element={<SuperAdminTenantsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/availability" element={<AvailabilityPage />} />
          <Route path="/clinical-records" element={<ClinicalRecordsPage />} />
          <Route path="/clinical-records/:id" element={<ClinicalRecordDetailPage />} />
          <Route path="/prescriptions" element={<PrescriptionsPage />} />
          <Route path="/medical-history" element={<MedicalHistoryPage />} />
          <Route path="/laboratory" element={<LabDashboardPage />} />
          <Route path="/laboratory/requests" element={<LabRequestsPage />} />
          <Route path="/laboratory/:id" element={<LabRequestDetailPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/saas" element={<SuperAdminDashboardPage />} />
          <Route path="/specialties" element={<SpecialtiesPage />} />
          <Route path="/patients" element={<PatientsPage />} />
        </Route>

        {/* Patient routes (no sidebar, topbar only) */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PatientLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/patient" element={<PlaceholderPage title="Mi Portal" />} />
          <Route path="/patient/bookings" element={<BookingsPage />} />
          <Route path="/patient/clinical-records" element={<ClinicalRecordsPage />} />
          <Route path="/patient/clinical-records/:id" element={<ClinicalRecordDetailPage />} />
          <Route path="/patient/prescriptions" element={<PrescriptionsPage />} />
          <Route path="/patient/medical-history" element={<MedicalHistoryPage />} />
          <Route path="/patient/laboratory" element={<PlaceholderPage title="Mis Resultados" />} />
          <Route path="/patient/settings" element={<SettingsPage />} />
        </Route>

        {/* Root redirects to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
