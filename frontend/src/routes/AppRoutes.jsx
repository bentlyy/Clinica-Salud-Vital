import { Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DoctorsPage from '../pages/DoctorsPage';
import ProtectedRoute from './ProtectedRoute';
import MyBookingsPage from '../pages/MyBookingsPage';
import DoctorPanel from '../pages/DoctorPanel';
import DoctorAvailabilityPage from '../pages/DoctorAvailabilityPage';
import DoctorCalendarPage from '../pages/DoctorCalendarPage';
import Navbar from '../components/Navbar';

// 🔥 Layout con Navbar
function AppLayout({ children }) {
  return (
    <div>
      <Navbar />
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* 🔓 PUBLIC */}
      <Route path="/" element={<LoginPage />} />

      {/* 🔐 PRIVATE (USER) */}
      <Route
        path="/doctors"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DoctorsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-bookings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MyBookingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* 🔐 PRIVATE (DOCTOR) */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute role="doctor">
            <AppLayout>
              <DoctorPanel />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/doctor/availability"
        element={
          <ProtectedRoute role="doctor">
            <AppLayout>
              <DoctorAvailabilityPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/doctor/calendar"
        element={
          <ProtectedRoute role="doctor">
            <AppLayout>
              <DoctorCalendarPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}