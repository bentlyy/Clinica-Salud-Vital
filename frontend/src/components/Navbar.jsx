import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/useTheme';
import { useI18n, setStoredLocale } from '../i18n/useI18n';

const locales = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
  { code: 'fr', label: 'FR' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale } = useI18n();
  const [localeOpen, setLocaleOpen] = useState(false);

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
              <Link to="/doctor/clinical-records" className="nav-link">Fichas Clínicas</Link>
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <Link to="/admin/analytics" className="nav-link">Análisis</Link>
              <Link to="/admin/tenant" className="nav-link">Mi Clínica</Link>
              <Link to="/admin/register-doctor" className="nav-link nav-link-accent">Registrar Doctor</Link>
            </>
          )}

          {user?.role === 'superadmin' && (
            <>
              <Link to="/super-admin" className="nav-link">Dashboard</Link>
              <Link to="/super-admin/tenants" className="nav-link">Tenants</Link>
              <Link to="/saas/plans" className="nav-link">Planes</Link>
            </>
          )}

          {!user && (
            <>
              <Link to="/specialists" className="nav-link">Especialistas</Link>
              <Link to="/booking" className="nav-link">Reservar</Link>
              <Link to="/saas/register" className="nav-link nav-link-accent">Crear Clínica</Link>
              <Link to="/login" className="nav-link">Iniciar Sesión</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Crear Cuenta</Link>
            </>
          )}

          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => setLocaleOpen(!localeOpen)} className="btn btn-ghost btn-sm" style={{ minWidth: 40 }}>
              {locale.toUpperCase()}
            </button>
            {localeOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card, white)',
                border: '1px solid var(--border-color)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 100, minWidth: 60,
              }}>
                {locales.map((l) => (
                  <button key={l.code} className="btn btn-ghost btn-sm" style={{ width: '100%', borderRadius: 0 }}
                    onClick={() => { setStoredLocale(l.code); setLocaleOpen(false); }}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={toggleTheme} className="btn btn-ghost btn-sm theme-toggle" aria-label="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {localeOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setLocaleOpen(false)} />}

          {user && (
            <div className="navbar-user">
              <span className="user-email">
                {user.email}
                {user.tenant_id && user.tenant_id !== 'default' && (
                  <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>· {user.tenant_id}</span>
                )}
              </span>
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
