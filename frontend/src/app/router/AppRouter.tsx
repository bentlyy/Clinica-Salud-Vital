import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useFeature } from '@/shared/hooks/useFeature';
import { getRedirectPath } from '@/shared/utils/role.utils';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';

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
const PatientPrescriptionsPage = lazy(() => import('@/modules/prescriptions/pages/PatientPrescriptionsPage'));
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
const SuperAdminTenantDetailPage = lazy(() => import('@/modules/super-admin/pages/SuperAdminTenantDetailPage'));
const SuperAdminUsersPage = lazy(() => import('@/modules/super-admin/pages/SuperAdminUsersPage'));
const SuperAdminBillingPage = lazy(() => import('@/modules/super-admin/pages/SuperAdminBillingPage'));

// Specialties module
const SpecialtiesPage = lazy(() => import('@/modules/specialties/pages/SpecialtiesPage'));

// Clinical module
const ClinicalPage = lazy(() => import('@/modules/clinical/pages/ClinicalPage'));

// Management module
const ManagementPage = lazy(() => import('@/modules/management/pages/ManagementPage'));

// System module
const SystemPage = lazy(() => import('@/modules/system/pages/SystemPage'));

// Patients module
const PatientsPage = lazy(() => import('@/modules/patients/pages/PatientsPage'));

// Doctor Calendar
const DoctorCalendarPage = lazy(() => import('@/modules/availability/pages/DoctorCalendarPage'));

// Guest Booking
const GuestBookingPage = lazy(() => import('@/modules/bookings/pages/GuestBookingPage'));

// Auth module
const TwoFAPage = lazy(() => import('@/modules/2fa/pages/TwoFAPage'));
const ForgotPasswordPage = lazy(() => import('@/modules/auth/pages/ForgotPasswordPage'));
const RegisterPage = lazy(() => import('@/modules/auth/pages/RegisterPage'));

// Bookings confirmation
const ConfirmPage = lazy(() => import('@/modules/bookings/pages/ConfirmPage'));

// Patient lab results
const PatientLabResultsPage = lazy(() => import('@/modules/laboratory/pages/PatientLabResultsPage'));

// Admin demo data
const AdminDemoDataPage = lazy(() => import('@/modules/admin/pages/AdminDemoDataPage'));

// Super Admin demo data
const SuperAdminDemoDataPage = lazy(() => import('@/modules/super-admin/pages/SuperAdminDemoDataPage'));

// Doctor Panel & Patient History
const DoctorPanel = lazy(() => import('@/modules/doctors/pages/DoctorPanel'));
const DoctorPatientHistoryPage = lazy(() => import('@/modules/doctors/pages/DoctorPatientHistoryPage'));
const DoctorLabResultsPage = lazy(() => import('@/modules/doctors/pages/DoctorLabResultsPage'));

// Lab Tests Catalog
const LabTestsCatalogPage = lazy(() => import('@/modules/laboratory/pages/LabTestsCatalogPage'));

// Lab Result Detail (shared doctor/patient)
const LabResultDetailPage = lazy(() => import('@/modules/laboratory/pages/LabResultDetailPage'));

// Admin pages
const AdminLabRequestsPage = lazy(() => import('@/modules/laboratory/pages/AdminLabRequestsPage'));
const AdminMedicalHistoryPage = lazy(() => import('@/modules/clinical-records/pages/AdminMedicalHistoryPage'));

// Patient medical history detail
const MyMedicalHistoryDetailPage = lazy(() => import('@/modules/medical-history/pages/MyMedicalHistoryDetailPage'));

// Not Found
const NotFoundPage = lazy(() => import('@/modules/auth/pages/NotFoundPage'));

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const home = getRedirectPath(user.role);
    if (location.pathname === home) {
      return <Navigate to="/" replace />;
    }
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}

function FeatureRoute({ featureKey, featureName }: { featureKey: string; featureName?: string }) {
  const { hasFeature, loading } = useFeature();

  if (loading) return <LoadingState />;
  if (!hasFeature(featureKey)) return <PremiumLocked featureName={featureName} />;

  return <Outlet />;
}

function UsersRoute() {
  const { user } = useAuth();
  if (user?.role === 'superadmin') return <SuperAdminUsersPage />;
  return <UsersPage />;
}

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        {/* Dashboard routes (all roles with sidebar) */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'doctor', 'lab_technician', 'patient', 'user']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tenants" element={<SuperAdminTenantsPage />} />
          <Route path="/tenants/:id" element={<SuperAdminTenantDetailPage />} />
          <Route path="/super-admin/users" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminUsersPage />
            </ProtectedRoute>
          } />
          <Route path="/users" element={<UsersRoute />} />
          <Route path="/cobros" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminBillingPage />
            </ProtectedRoute>
          } />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/clinical" element={<ClinicalPage />} />
          <Route path="/management" element={<ManagementPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="/availability" element={<AvailabilityPage />} />
          <Route path="/calendar" element={<DoctorCalendarPage />} />
          <Route path="/clinical-records" element={<ClinicalRecordsPage />} />
          <Route path="/clinical-records/:id" element={<ClinicalRecordDetailPage />} />
          <Route path="/prescriptions" element={<PatientPrescriptionsPage />} />
          <Route path="/medical-history" element={<MedicalHistoryPage />} />
          <Route path="/laboratory" element={<FeatureRoute featureKey="laboratory" featureName="Laboratorio" />}>
            <Route index element={<LabDashboardPage />} />
            <Route path="requests" element={<LabRequestsPage />} />
            <Route path="requests/:id" element={<LabRequestDetailPage />} />
            <Route path="area/:areaId" element={<LabAreaDashboardPage />} />
            <Route path="analytics" element={<LabAnalyticsPage />} />
            <Route path="quality-control" element={<LabQualityControlPage />} />
            <Route path="catalog" element={<LabTestsCatalogPage />} />
            <Route path="lab-results/:id" element={<LabResultDetailPage />} />
          </Route>
          <Route path="/admin/lab-requests" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLabRequestsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/medical-history" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminMedicalHistoryPage />
            </ProtectedRoute>
          } />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/notifications" element={
            <ProtectedRoute allowedRoles={['superadmin', 'lab_technician', 'admin', 'doctor']}>
              <NotificationsPage />
            </ProtectedRoute>
          } />
          <Route path="/saas" element={<SuperAdminDashboardPage />} />
          <Route path="/specialties" element={<SpecialtiesPage />} />
          <Route path="/panel" element={<DoctorPanel />} />
          <Route path="/doctor/lab-results" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorLabResultsPage />
            </ProtectedRoute>
          } />
          <Route path="/patient-history" element={<DoctorPatientHistoryPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/admin/demo-data" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDemoDataPage />
            </ProtectedRoute>
          } />
          <Route path="/super-admin/demo-data" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminDemoDataPage />
            </ProtectedRoute>
          } />
          <Route path="/medical-history/:id" element={<MyMedicalHistoryDetailPage />} />
          <Route path="/my-laboratory" element={<PatientLabResultsPage />} />
          <Route path="/my-laboratory/:id" element={<LabResultDetailPage />} />
        </Route>

        {/* Public landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Public routes */}
        <Route path="/2fa" element={<TwoFAPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/confirm/:token" element={<ConfirmPage />} />
        <Route path="/booking" element={<GuestBookingPage />} />

        {/* Catch-all: 404 page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
