import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useFeature } from '@/shared/hooks/useFeature';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { PatientLayout } from '@/shared/components/layout/PatientLayout';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { PremiumLocked } from '@/shared/components/PremiumLocked';
import type { ReactNode } from 'react';

// Lazy loaded pages
const LandingPage = lazy(() => import('@/modules/landing/LandingPage'));
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
const LabAreaDashboardPage = lazy(() => import('@/modules/laboratory/pages/LabAreaDashboardPage'));
const LabAnalyticsPage = lazy(() => import('@/modules/laboratory/pages/LabAnalyticsPage'));
const LabQualityControlPage = lazy(() => import('@/modules/laboratory/pages/LabQualityControlPage'));

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

// Placeholder pages
const PlaceholderPage = lazy(() => import('@/shared/components/ui/PlaceholderPage'));

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function FeatureRoute({ featureKey, featureName }: { featureKey: string; featureName?: string }) {
  const { hasFeature, loading } = useFeature();

  if (loading) return <LoadingState />;
  if (!hasFeature(featureKey)) return <PremiumLocked featureName={featureName} />;

  return <Outlet />;
}

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
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
          <Route path="/laboratory" element={<FeatureRoute featureKey="laboratory" featureName="Laboratorio" />}>
            <Route index element={<LabDashboardPage />} />
            <Route path="requests" element={<LabRequestsPage />} />
            <Route path="requests/:id" element={<LabRequestDetailPage />} />
            <Route path="area/:areaId" element={<LabAreaDashboardPage />} />
            <Route path="analytics" element={<LabAnalyticsPage />} />
            <Route path="quality-control" element={<LabQualityControlPage />} />
          </Route>
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

        {/* Public landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Catch-all: go to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
