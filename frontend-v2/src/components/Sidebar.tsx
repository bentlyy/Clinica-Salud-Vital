import React, { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/useAuth';
import { useI18n } from '@/i18n/I18nContext';
import { useTheme } from '@/context/useTheme';
import './Sidebar.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Role = 'superadmin' | 'admin' | 'doctor' | 'lab_technician' | 'patient' | 'user' | 'guest';

interface NavItem {
  icon: string;
  label: string;
  path: string;
  badge?: number;
}

/* ------------------------------------------------------------------ */
/*  Navigation config per role                                         */
/* ------------------------------------------------------------------ */

const NAV_ITEMS: Record<Role, NavItem[]> = {
  superadmin: [
    { icon: '📊', label: 'Dashboard', path: '/super-admin' },
    { icon: '🏢', label: 'Tenants', path: '/super-admin/tenants' },
    { icon: '👥', label: 'Usuarios', path: '/super-admin/users' },
    { icon: '💰', label: 'Revenue', path: '/super-admin/revenue' },
  ],
  admin: [
    { icon: '📊', label: 'Dashboard', path: '/admin/dashboard' },
    { icon: '👨‍⚕️', label: 'Doctores', path: '/admin/doctors' },
    { icon: '📅', label: 'Citas', path: '/admin/bookings', badge: 5 },
    { icon: '🧪', label: 'Laboratorio', path: '/admin/lab' },
    { icon: '📈', label: 'Analytics', path: '/admin/analytics' },
    { icon: '⚙️', label: 'Especialidades', path: '/admin/specialties' },
    { icon: '🔍', label: 'Auditoría', path: '/admin/audit' },
  ],
  doctor: [
    { icon: '📊', label: 'Dashboard', path: '/doctor' },
    { icon: '📅', label: 'Citas del día', path: '/doctor/bookings', badge: 3 },
    { icon: '📋', label: 'Disponibilidad', path: '/doctor/availability' },
    { icon: '📁', label: 'Historiales', path: '/doctor/records' },
    { icon: '🧪', label: 'Resultados Lab', path: '/doctor/lab' },
  ],
  lab_technician: [
    { icon: '📊', label: 'Dashboard', path: '/lab' },
    { icon: '🧪', label: 'Solicitudes', path: '/lab/requests', badge: 8 },
    { icon: '📦', label: 'Muestras', path: '/lab/samples' },
    { icon: '✅', label: 'Control Calidad', path: '/lab/qc' },
    { icon: '🔬', label: 'Equipos', path: '/lab/equipment' },
  ],
  patient: [
    { icon: '📊', label: 'Inicio', path: '/patient' },
    { icon: '📅', label: 'Mis Citas', path: '/patient/bookings' },
    { icon: '📁', label: 'Mi Historial', path: '/patient/records' },
    { icon: '🧪', label: 'Mis Resultados', path: '/patient/lab' },
    { icon: '💳', label: 'Mis Facturas', path: '/patient/billing' },
  ],
  user: [
    { icon: '📊', label: 'Dashboard', path: '/dashboard' },
  ],
  guest: [],
};

/* ------------------------------------------------------------------ */
/*  Role display labels                                                */
/* ------------------------------------------------------------------ */

const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  doctor: 'Doctor',
  lab_technician: 'Técnico Lab',
  patient: 'Paciente',
  user: 'Usuario',
  guest: 'Invitado',
};

/* ------------------------------------------------------------------ */
/*  Sidebar component                                                  */
/* ------------------------------------------------------------------ */

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const role: Role = (user?.role as Role) ?? 'guest';
  const navItems = useMemo(() => NAV_ITEMS[role] ?? [], [role]);

  /* ----------------------------- helpers ------------------------------ */

  const getInitials = useCallback(() => {
    const name = user?.name;
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0]?.[0] ?? '';
      const last = parts[parts.length - 1]?.[0] ?? '';
      return `${first}${last}`.toUpperCase() || '??';
    }
    return parts[0] ? parts[0].slice(0, 2).toUpperCase() : '??';
  }, [user?.name]);

  const isActive = useCallback(
    (path: string) => {
      if (path === '/') return location.pathname === '/';
      return location.pathname === path || location.pathname.startsWith(path + '/');
    },
    [location.pathname],
  );

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      onClose(); // close mobile sidebar on navigation
    },
    [navigate, onClose],
  );

  const handleLogout = useCallback(() => {
    // Placeholder – wire to real auth logout
    navigate('/login');
  }, [navigate]);

  /* ----------------------------- render ------------------------------ */

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="sb-overlay" onClick={onClose} aria-hidden="true" />}

      <aside className={`sb ${isOpen ? 'sb--open' : ''}`}>
        {/* ---------- Brand ---------- */}
        <div className="sb-brand">
          <div className="sb-brand__icon">💚</div>
          <div className="sb-brand__text">
            <span className="sb-brand__name">Salud Vital</span>
            <span className="sb-brand__role">{ROLE_LABELS[role]}</span>
          </div>
        </div>

        {/* ---------- Navigation ---------- */}
        <nav className="sb-nav" role="navigation" aria-label="Sidebar">
          {navItems.length === 0 ? (
            <p className="sb-nav__empty">{'Sin opciones de menu'}</p>
          ) : (
            navItems.map((item) => (
              <button
                key={item.path}
                type="button"
                className={`sb-nav__item ${isActive(item.path) ? 'sb-nav__item--active' : ''}`}
                onClick={() => handleNavigate(item.path)}
                aria-current={isActive(item.path) ? 'page' : undefined}
              >
                <span className="sb-nav__icon">{item.icon}</span>
                <span className="sb-nav__label">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="sb-nav__badge">{item.badge}</span>
                )}
              </button>
            ))
          )}
        </nav>

        {/* ---------- Footer ---------- */}
        <div className="sb-footer">
          {/* User info */}
          <div className="sb-footer__user">
            <div className="sb-footer__avatar">{getInitials()}</div>
            <div className="sb-footer__info">
              <span className="sb-footer__name">{user?.name ?? 'Sin sesión'}</span>
              <span className="sb-footer__email">{user?.email ?? ''}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="sb-footer__controls">
            {/* Language toggle */}
            <button
              type="button"
              className="sb-footer__toggle"
              onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
              title={locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}
              aria-label="Toggle language"
            >
              <span className={`sb-lang__opt ${locale === 'es' ? 'sb-lang__opt--active' : ''}`}>
                ES
              </span>
              <span className="sb-lang__divider">|</span>
              <span className={`sb-lang__opt ${locale === 'en' ? 'sb-lang__opt--active' : ''}`}>
                EN
              </span>
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              className="sb-footer__toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Logout */}
          <button type="button" className="sb-footer__logout" onClick={handleLogout}>
            🚪 {'Cerrar sesion'}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
