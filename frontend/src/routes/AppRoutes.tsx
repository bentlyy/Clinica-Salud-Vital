import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import WithFeature from '../components/WithFeature';
import AppLayout from './AppLayout';
import LoadingState from '../components/LoadingState';

const HomePage = lazy(() => import('../pages/HomePage'));
const LandingSaaS = lazy(() => import('../pages/LandingSaaS'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const BookingPage = lazy(() => import('../pages/BookingPage'));
const SpecialistsPage = lazy(() => import('../pages/SpecialistsPage'));
const ConfirmPage = lazy(() => import('../pages/ConfirmPage'));
const MyBookingsPage = lazy(() => import('../pages/MyBookingsPage'));
const DoctorPanel = lazy(() => import('../pages/DoctorPanel'));
const DoctorAvailabilityPage = lazy(() => import('../pages/DoctorAvailabilityPage'));
const DoctorCalendarPage = lazy(() => import('../pages/DoctorCalendarPage'));
const DoctorClinicalRecordsPage = lazy(() => import('../pages/DoctorClinicalRecordsPage'));
const DoctorPatientHistoryPage = lazy(() => import('../pages/DoctorPatientHistoryPage'));
const DoctorLabResultsPage = lazy(() => import('../pages/DoctorLabResultsPage'));
const MyMedicalHistoryPage = lazy(() => import('../pages/MyMedicalHistoryPage'));
const MyMedicalHistoryDetailPage = lazy(() => import('../pages/MyMedicalHistoryDetailPage'));
const MyLabResultsPage = lazy(() => import('../pages/MyLabResultsPage'));
const LabResultDetailPage = lazy(() => import('../pages/LabResultDetailPage'));
const LabTestsCatalogPage = lazy(() => import('../pages/LabTestsCatalogPage'));
const LabDashboardPage = lazy(() => import('../modules/laboratory/pages/LabDashboardPage'));
const LabAreaDashboardPage = lazy(() => import('../modules/laboratory/pages/LabAreaDashboardPage'));
const LabAnalyticsPage = lazy(() => import('../modules/laboratory/pages/LabAnalyticsPage'));
const LabQCPage = lazy(() => import('../modules/laboratory/pages/LabQCPage'));
const RegisterDoctorPage = lazy(() => import('../pages/RegisterDoctorPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const AdminSpecialtiesPage = lazy(() => import('../pages/AdminSpecialtiesPage'));
const AdminLabTestsPage = lazy(() => import('../pages/AdminLabTestsPage'));

const AdminDemoDataPage = lazy(() => import('../pages/AdminDemoDataPage'));
const LabTechnicianDashboardPage = lazy(() => import('../pages/LabTechnicianDashboardPage'));
const SuperAdminDashboardPage = lazy(() => import('../pages/SuperAdminDashboardPage'));
const SuperAdminTenantsPage = lazy(() => import('../pages/SuperAdminTenantsPage'));
const SuperAdminTenantDetailPage = lazy(() => import('../pages/SuperAdminTenantDetailPage'));
const SuperAdminDemoDataPage = lazy(() => import('../pages/SuperAdminDemoDataPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState fullPage />}>
    <Routes>
      <Route path="/" element={<LandingSaaS />} />
      <Route path="/login" element={<Navigate to="/?openLogin=1" replace />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/booking" element={<AppLayout><BookingPage /></AppLayout>} />
      <Route path="/specialists" element={<AppLayout><SpecialistsPage /></AppLayout>} />
      <Route path="/doctors" element={<ProtectedRoute><AppLayout><BookingPage /></AppLayout></ProtectedRoute>} />

      <Route path="/confirm/:token" element={<AppLayout><ConfirmPage /></AppLayout>} />
      <Route path="/my-bookings" element={<ProtectedRoute><AppLayout><MyBookingsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/my-medical-history" element={<ProtectedRoute><AppLayout><MyMedicalHistoryPage /></AppLayout></ProtectedRoute>} />
      <Route path="/my-medical-history/:id" element={<ProtectedRoute><AppLayout><MyMedicalHistoryDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/my-lab-results" element={<ProtectedRoute><AppLayout><WithFeature featureKey="laboratory"><MyLabResultsPage /></WithFeature></AppLayout></ProtectedRoute>} />
      <Route path="/my-lab-results/:id" element={<ProtectedRoute><AppLayout><WithFeature featureKey="laboratory"><LabResultDetailPage /></WithFeature></AppLayout></ProtectedRoute>} />
      <Route path="/lab-tests" element={<ProtectedRoute><AppLayout><WithFeature featureKey="laboratory"><LabTestsCatalogPage /></WithFeature></AppLayout></ProtectedRoute>} />

      <Route path="/doctor" element={<ProtectedRoute role="doctor"><AppLayout><DoctorPanel /></AppLayout></ProtectedRoute>} />
      <Route path="/doctor/availability" element={<ProtectedRoute role="doctor"><AppLayout><DoctorAvailabilityPage /></AppLayout></ProtectedRoute>} />
      <Route path="/doctor/calendar" element={<ProtectedRoute role="doctor"><AppLayout><DoctorCalendarPage /></AppLayout></ProtectedRoute>} />
      <Route path="/doctor/clinical-records" element={<ProtectedRoute role="doctor"><AppLayout><DoctorClinicalRecordsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/doctor/patient-history" element={<ProtectedRoute role="doctor"><AppLayout><DoctorPatientHistoryPage /></AppLayout></ProtectedRoute>} />
      <Route path="/doctor/lab-results" element={<ProtectedRoute role="doctor"><AppLayout><WithFeature featureKey="laboratory"><DoctorLabResultsPage /></WithFeature></AppLayout></ProtectedRoute>} />
      <Route path="/doctor/lab-results/:id" element={<ProtectedRoute role="doctor"><AppLayout><WithFeature featureKey="laboratory"><LabResultDetailPage /></WithFeature></AppLayout></ProtectedRoute>} />

      <Route path="/admin/register-doctor" element={<ProtectedRoute role="admin"><AppLayout><RegisterDoctorPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AppLayout><AnalyticsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/specialties" element={<ProtectedRoute role="admin"><AppLayout><AdminSpecialtiesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/lab-tests" element={<ProtectedRoute role="admin"><AppLayout><WithFeature featureKey="laboratory"><AdminLabTestsPage /></WithFeature></AppLayout></ProtectedRoute>} />
      <Route path="/admin/demo-data" element={<ProtectedRoute role="admin"><AppLayout><AdminDemoDataPage /></AppLayout></ProtectedRoute>} />

      <Route path="/lab" element={<ProtectedRoute role="lab_technician"><AppLayout><WithFeature featureKey="laboratory"><LabTechnicianDashboardPage /></WithFeature></AppLayout></ProtectedRoute>} />
      <Route path="/lab/dashboard" element={<ProtectedRoute role="lab_technician"><AppLayout><WithFeature featureKey="laboratory"><LabDashboardPage /></WithFeature></AppLayout></ProtectedRoute>} />
      <Route path="/lab/dashboard/:areaId" element={<ProtectedRoute role="lab_technician"><AppLayout><WithFeature featureKey="laboratory"><LabAreaDashboardPage /></WithFeature></AppLayout></ProtectedRoute>} />
      <Route path="/lab/analytics" element={<ProtectedRoute role="lab_technician"><AppLayout><WithFeature featureKey="laboratory"><LabAnalyticsPage /></WithFeature></AppLayout></ProtectedRoute>} />
      <Route path="/lab/qc" element={<ProtectedRoute role="lab_technician"><AppLayout><WithFeature featureKey="laboratory"><LabQCPage /></WithFeature></AppLayout></ProtectedRoute>} />
      <Route path="/lab/requests/:id" element={<ProtectedRoute role="lab_technician"><AppLayout><WithFeature featureKey="laboratory"><LabResultDetailPage /></WithFeature></AppLayout></ProtectedRoute>} />
      <Route path="/super-admin" element={<ProtectedRoute role="superadmin"><AppLayout><SuperAdminDashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/super-admin/tenants" element={<ProtectedRoute role="superadmin"><AppLayout><SuperAdminTenantsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/super-admin/tenants/:id" element={<ProtectedRoute role="superadmin"><AppLayout><SuperAdminTenantDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/super-admin/demo-data" element={<ProtectedRoute role="superadmin"><AppLayout><SuperAdminDemoDataPage /></AppLayout></ProtectedRoute>} />

      <Route path="*" element={<AppLayout><NotFoundPage /></AppLayout>} />
    </Routes>
    </Suspense>
  );
}
