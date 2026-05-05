import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="clinic-navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">+</span>
          <span className="brand-text">
            <span className="brand-name">Salud Vital</span>
            <span className="brand-sub">Clínica Privada</span>
          </span>
        </Link>

        <nav className="navbar-nav">
          {user && (
            <>
              <Link to="/booking" className="nav-link">Reservar</Link>
              <Link to="/my-bookings" className="nav-link">Mis Reservas</Link>
            </>
          )}

          {user?.role === 'doctor' && (
            <>
              <Link to="/doctor" className="nav-link">Panel</Link>
              <Link to="/doctor/calendar" className="nav-link">Calendario</Link>
            </>
          )}

          {user?.role === 'admin' && (
            <Link to="/admin/register-doctor" className="nav-link nav-link-accent">Registrar Doctor</Link>
          )}

          {!user && (
            <>
              <Link to="/booking" className="nav-link">Reservar</Link>
              <Link to="/login" className="nav-link">Iniciar Sesión</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Crear Cuenta</Link>
            </>
          )}

          {user && (
            <div className="navbar-user">
              <span className="user-email">{user.email}</span>
              <button onClick={() => { logout(); window.location.href = '/'; }} className="btn btn-ghost btn-sm">
                Salir
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
