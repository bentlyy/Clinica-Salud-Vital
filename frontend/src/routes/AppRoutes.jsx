import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Navbar from '../components/Navbar';

const HomePage = lazy(() => import('../pages/HomePage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const BookingPage = lazy(() => import('../pages/BookingPage'));
const SpecialistsPage = lazy(() => import('../pages/SpecialistsPage'));
const ConfirmPage = lazy(() => import('../pages/ConfirmPage'));
const MyBookingsPage = lazy(() => import('../pages/MyBookingsPage'));
const DoctorPanel = lazy(() => import('../pages/DoctorPanel'));
const DoctorAvailabilityPage = lazy(() => import('../pages/DoctorAvailabilityPage'));
const DoctorCalendarPage = lazy(() => import('../pages/DoctorCalendarPage'));
const DoctorClinicalRecordsPage = lazy(() => import('../pages/DoctorClinicalRecordsPage'));
const RegisterDoctorPage = lazy(() => import('../pages/RegisterDoctorPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const SaasRegisterPage = lazy(() => import('../pages/SaasRegisterPage'));
const SaasPlansPage = lazy(() => import('../pages/SaasPlansPage'));
const SaasSuccessPage = lazy(() => import('../pages/SaasSuccessPage'));
const TenantDashboardPage = lazy(() => import('../pages/TenantDashboardPage'));
const SuperAdminDashboardPage = lazy(() => import('../pages/SuperAdminDashboardPage'));
const SuperAdminTenantsPage = lazy(() => import('../pages/SuperAdminTenantsPage'));
const SuperAdminTenantDetailPage = lazy(() => import('../pages/SuperAdminTenantDetailPage'));

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>}>
        {children}
      </Suspense>
    </>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
      <Route path="/login" element={<AppLayout><LoginPage /></AppLayout>} />
      <Route path="/register" element={<AppLayout><RegisterPage /></AppLayout>} />

      <Route path="/booking" element={<AppLayout><BookingPage /></AppLayout>} />
      <Route path="/specialists" element={<AppLayout><SpecialistsPage /></AppLayout>} />
      <Route path="/doctors" element={<ProtectedRoute><AppLayout><BookingPage /></AppLayout></ProtectedRoute>} />


      <Route path="/confirm/:token" element={<AppLayout><ConfirmPage /></AppLayout>} />
      <Route path="/my-bookings" element={<ProtectedRoute><AppLayout><MyBookingsPage /></AppLayout></ProtectedRoute>} />

      <Route path="/saas/register" element={<AppLayout><SaasRegisterPage /></AppLayout>} />
      <Route path="/saas/plans" element={<AppLayout><SaasPlansPage /></AppLayout>} />
      <Route path="/saas/success" element={<AppLayout><SaasSuccessPage /></AppLayout>} />

      <Route path="/admin/tenant" element={<ProtectedRoute role="admin"><AppLayout><TenantDashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/doctor" element={<ProtectedRoute role="doctor"><AppLayout><DoctorPanel /></AppLayout></ProtectedRoute>} />
      <Route path="/doctor/availability" element={<ProtectedRoute role="doctor"><AppLayout><DoctorAvailabilityPage /></AppLayout></ProtectedRoute>} />
      <Route path="/doctor/calendar" element={<ProtectedRoute role="doctor"><AppLayout><DoctorCalendarPage /></AppLayout></ProtectedRoute>} />
      <Route path="/doctor/clinical-records" element={<ProtectedRoute role="doctor"><AppLayout><DoctorClinicalRecordsPage /></AppLayout></ProtectedRoute>} />

      <Route path="/admin/register-doctor" element={<ProtectedRoute role="admin"><AppLayout><RegisterDoctorPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AppLayout><AnalyticsPage /></AppLayout></ProtectedRoute>} />

      <Route path="/super-admin" element={<ProtectedRoute role="superadmin"><AppLayout><SuperAdminDashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/super-admin/tenants" element={<ProtectedRoute role="superadmin"><AppLayout><SuperAdminTenantsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/super-admin/tenants/:id" element={<ProtectedRoute role="superadmin"><AppLayout><SuperAdminTenantDetailPage /></AppLayout></ProtectedRoute>} />
    </Routes>
  );
}
