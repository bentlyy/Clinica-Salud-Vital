import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import BookingPage from '../pages/BookingPage';
import SpecialistsPage from '../pages/SpecialistsPage';
import GuestBookingsPage from '../pages/GuestBookingsPage';
import ConfirmPage from '../pages/ConfirmPage';
import MyBookingsPage from '../pages/MyBookingsPage';
import DoctorPanel from '../pages/DoctorPanel';
import DoctorAvailabilityPage from '../pages/DoctorAvailabilityPage';
import DoctorCalendarPage from '../pages/DoctorCalendarPage';
import DoctorClinicalRecordsPage from '../pages/DoctorClinicalRecordsPage';
import RegisterDoctorPage from '../pages/RegisterDoctorPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import ProtectedRoute from './ProtectedRoute';
import Navbar from '../components/Navbar';

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
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

      <Route path="/my-bookings/guest" element={<AppLayout><GuestBookingsPage /></AppLayout>} />
      <Route path="/confirm/:token" element={<AppLayout><ConfirmPage /></AppLayout>} />
      <Route path="/my-bookings" element={<ProtectedRoute><AppLayout><MyBookingsPage /></AppLayout></ProtectedRoute>} />

      <Route path="/doctor" element={<ProtectedRoute role="doctor"><AppLayout><DoctorPanel /></AppLayout></ProtectedRoute>} />
      <Route path="/doctor/availability" element={<ProtectedRoute role="doctor"><AppLayout><DoctorAvailabilityPage /></AppLayout></ProtectedRoute>} />
      <Route path="/doctor/calendar" element={<ProtectedRoute role="doctor"><AppLayout><DoctorCalendarPage /></AppLayout></ProtectedRoute>} />
      <Route path="/doctor/clinical-records" element={<ProtectedRoute role="doctor"><AppLayout><DoctorClinicalRecordsPage /></AppLayout></ProtectedRoute>} />

      <Route path="/admin/register-doctor" element={<ProtectedRoute role="admin"><AppLayout><RegisterDoctorPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AppLayout><AnalyticsPage /></AppLayout></ProtectedRoute>} />
    </Routes>
  );
}
