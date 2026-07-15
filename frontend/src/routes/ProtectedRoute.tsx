import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../i18n/useI18n';
import LoadingState from '../components/LoadingState';

interface ProtectedRouteProps {
  children: ReactNode;
  role?: string;
}

const ROLE_HIERARCHY: Record<string, string[]> = {
  superadmin: ['superadmin', 'admin', 'doctor', 'lab_technician', 'patient'],
  admin: ['admin', 'doctor', 'lab_technician', 'patient'],
  doctor: ['doctor'],
  lab_technician: ['lab_technician'],
  patient: ['patient'],
};

function hasPermission(userRole: string, requiredRole: string): boolean {
  if (userRole === requiredRole) return true;
  if (userRole === 'superadmin' && requiredRole === 'admin') return true;
  const allowed = ROLE_HIERARCHY[userRole];
  return allowed ? allowed.includes(requiredRole) : false;
}

const ProtectedRoute = React.memo(function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  if (loading) return <LoadingState message={t?.('protected.loading_session') || 'Cargando sesión...'} />;
  if (!user) return <Navigate to="/?openLogin=1" replace />;
  if (role && !hasPermission(user.role as string, role)) return <Navigate to="/" replace />;
  return children;
});

export default ProtectedRoute;
