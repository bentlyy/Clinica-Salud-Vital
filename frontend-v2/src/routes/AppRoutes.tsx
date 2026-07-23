import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import LandingPageWrapper from './LandingPageWrapper'
import AppLayout from '@/components/AppLayout'
import PlaceholderPage from '@/pages/PlaceholderPage'

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const DoctorDashboard = lazy(() => import('@/pages/doctor/DoctorDashboard'))
const PatientDashboard = lazy(() => import('@/pages/patient/PatientDashboard'))
const LabDashboard = lazy(() => import('@/pages/lab/LabDashboard'))
const SuperAdminDashboard = lazy(() => import('@/pages/superadmin/SuperAdminDashboard'))

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--gray-50)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: 48, height: 48, margin: '0 auto 16px',
          background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))',
          borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24
        }}>&#x2764;&#xFE0F;</div>
        <div style={{ color: 'var(--gray-400)', fontSize: 14 }}>Cargando...</div>
      </div>
    </div>
  )
}

function DashboardLayout({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <AppLayout title={title}>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </AppLayout>
  )
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPageWrapper />} />
        <Route path="/booking" element={<PlaceholderPage title="Reservar Cita" />} />
        <Route path="/register" element={<PlaceholderPage title="Registro" />} />
        <Route path="/confirm/:token" element={<PlaceholderPage title="Confirmacion" />} />
        
        {/* Admin routes */}
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <Routes>
              <Route index element={<DashboardLayout title="Admin"><AdminDashboard /></DashboardLayout>} />
              <Route path="dashboard" element={<DashboardLayout title="Admin"><AdminDashboard /></DashboardLayout>} />
              <Route path="doctors" element={<DashboardLayout title="Doctores"><PlaceholderPage title="Gestionar Doctores" /></DashboardLayout>} />
              <Route path="patients" element={<DashboardLayout title="Pacientes"><PlaceholderPage title="Gestionar Pacientes" /></DashboardLayout>} />
              <Route path="bookings" element={<DashboardLayout title="Citas"><PlaceholderPage title="Gestionar Citas" /></DashboardLayout>} />
              <Route path="reports" element={<DashboardLayout title="Reportes"><PlaceholderPage title="Reportes" /></DashboardLayout>} />
              <Route path="settings" element={<DashboardLayout title="Configuracion"><PlaceholderPage title="Configuracion" /></DashboardLayout>} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* Doctor routes */}
        <Route path="/doctor/*" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <Routes>
              <Route index element={<DashboardLayout title="Doctor"><DoctorDashboard /></DashboardLayout>} />
              <Route path="dashboard" element={<DashboardLayout title="Doctor"><DoctorDashboard /></DashboardLayout>} />
              <Route path="appointments" element={<DashboardLayout title="Citas"><PlaceholderPage title="Mis Citas" /></DashboardLayout>} />
              <Route path="patients" element={<DashboardLayout title="Pacientes"><PlaceholderPage title="Mis Pacientes" /></DashboardLayout>} />
              <Route path="records" element={<DashboardLayout title="Historiales"><PlaceholderPage title="Historiales Clinicos" /></DashboardLayout>} />
              <Route path="availability" element={<DashboardLayout title="Disponibilidad"><PlaceholderPage title="Mi Disponibilidad" /></DashboardLayout>} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* Patient routes */}
        <Route path="/patient/*" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <Routes>
              <Route index element={<DashboardLayout title="Paciente"><PatientDashboard /></DashboardLayout>} />
              <Route path="dashboard" element={<DashboardLayout title="Paciente"><PatientDashboard /></DashboardLayout>} />
              <Route path="appointments" element={<DashboardLayout title="Citas"><PlaceholderPage title="Mis Citas" /></DashboardLayout>} />
              <Route path="records" element={<DashboardLayout title="Historiales"><PlaceholderPage title="Mi Historial" /></DashboardLayout>} />
              <Route path="lab-results" element={<DashboardLayout title="Laboratorio"><PlaceholderPage title="Resultados de Laboratorio" /></DashboardLayout>} />
              <Route path="invoices" element={<DashboardLayout title="Facturacion"><PlaceholderPage title="Mis Facturas" /></DashboardLayout>} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* Lab routes */}
        <Route path="/lab/*" element={
          <ProtectedRoute allowedRoles={['lab_technician', 'admin', 'superadmin']}>
            <Routes>
              <Route index element={<DashboardLayout title="Laboratorio"><LabDashboard /></DashboardLayout>} />
              <Route path="dashboard" element={<DashboardLayout title="Laboratorio"><LabDashboard /></DashboardLayout>} />
              <Route path="requests" element={<DashboardLayout title="Solicitudes"><PlaceholderPage title="Solicitudes de Laboratorio" /></DashboardLayout>} />
              <Route path="equipment" element={<DashboardLayout title="Equipos"><PlaceholderPage title="Equipos" /></DashboardLayout>} />
              <Route path="quality" element={<DashboardLayout title="Calidad"><PlaceholderPage title="Control de Calidad" /></DashboardLayout>} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* Super Admin routes */}
        <Route path="/super-admin/*" element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <Routes>
              <Route index element={<DashboardLayout title="Super Admin"><SuperAdminDashboard /></DashboardLayout>} />
              <Route path="dashboard" element={<DashboardLayout title="Super Admin"><SuperAdminDashboard /></DashboardLayout>} />
              <Route path="tenants" element={<DashboardLayout title="Tenants"><PlaceholderPage title="Gestionar Tenants" /></DashboardLayout>} />
              <Route path="users" element={<DashboardLayout title="Usuarios"><PlaceholderPage title="Gestionar Usuarios Globales" /></DashboardLayout>} />
              <Route path="billing" element={<DashboardLayout title="Facturacion"><PlaceholderPage title="Facturacion Global" /></DashboardLayout>} />
              <Route path="system" element={<DashboardLayout title="Sistema"><PlaceholderPage title="Monitoreo del Sistema" /></DashboardLayout>} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<PlaceholderPage title="Pagina no encontrada" />} />
      </Routes>
    </Suspense>
  )
}
