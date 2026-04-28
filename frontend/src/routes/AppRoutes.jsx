import { Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DoctorsPage from '../pages/DoctorsPage';
import ProtectedRoute from './ProtectedRoute';
import MyBookingsPage from '../pages/MyBookingsPage';
import DoctorPanel from '../pages/DoctorPanel';
import DoctorAvailabilityPage from '../pages/DoctorAvailabilityPage';
import DoctorCalendarPage from '../pages/DoctorCalendarPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route
        path="/doctors"
        element={
          <ProtectedRoute>
            <DoctorsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-bookings"
        element={
          <ProtectedRoute>
            <MyBookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor"
        element={
          <ProtectedRoute role="doctor">
            <DoctorPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/availability"
        element={
          <ProtectedRoute role="doctor">
            <DoctorAvailabilityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/calendar"
        element={
          <ProtectedRoute role="doctor">
            <DoctorCalendarPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}