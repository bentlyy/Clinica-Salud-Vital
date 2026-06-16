import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import LoadingState from '../components/LoadingState';

interface ProtectedRouteProps {
  children: ReactNode;
  role?: string;
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState message="Cargando sesión..." />;
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role && !(role === 'admin' && user.role === 'superadmin')) return <Navigate to="/" replace />;
  return children;
}
