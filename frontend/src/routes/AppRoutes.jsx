import { Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DoctorsPage from '../pages/DoctorsPage';
import ProtectedRoute from './ProtectedRoute';

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
    </Routes>
  );
}