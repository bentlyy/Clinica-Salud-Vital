import { Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DoctorsPage from '../pages/DoctorsPage';
import ProtectedRoute from './ProtectedRoute';
import MyBookingsPage from '../pages/MyBookingsPage';

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
    </Routes>
  );
}