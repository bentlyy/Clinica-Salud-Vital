import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import LoadingState from '../components/LoadingState';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Cargando sesión..." />;
  }

  if (!user) return <Navigate to="/" replace />;

  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}
