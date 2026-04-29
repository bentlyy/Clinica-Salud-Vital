import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  // 🔄 loading más limpio
  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Cargando sesión...</p>
      </div>
    );
  }

  // 🔒 no autenticado
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 🚫 sin permisos
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}