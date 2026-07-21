import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../i18n/useI18n';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0]?.slice(0, 2).toUpperCase() || '??';
}

interface NavItem {
  icon: string;
  label: string;
  path: string;
  badge?: string | number;
}

const sections: Record<string, { label: string; items: NavItem[] }> = {
  admin: {
    label: 'Principal',
    items: [
      { icon: '📊', label: 'Dashboard', path: '/' },
      { icon: '📈', label: 'Analytics', path: '/admin/analytics' },
      { icon: '🏥', label: 'Especialidades', path: '/admin/specialties' },
      { icon: '🧪', label: 'Catálogo Labs', path: '/admin/lab-tests' },
      { icon: '👨‍⚕️', label: 'Registrar Doctor', path: '/admin/register-doctor' },
      { icon: '🎯', label: 'Datos Demo', path: '/admin/demo-data' },
    ],
  },
  doctor: {
    label: 'Principal',
    items: [
      { icon: '📊', label: 'Dashboard', path: '/doctor' },
      { icon: '📅', label: 'Calendario', path: '/doctor/calendar' },
      { icon: '⏰', label: 'Disponibilidad', path: '/doctor/availability' },
      { icon: '📋', label: 'Fichas Clínicas', path: '/doctor/clinical-records' },
      { icon: '👤', label: 'Historial Pacientes', path: '/doctor/patient-history' },
      { icon: '🧪', label: 'Resultados Labs', path: '/doctor/lab-results' },
    ],
  },
  patient: {
    label: 'Principal',
    items: [
      { icon: '🏠', label: 'Inicio', path: '/' },
      { icon: '📅', label: 'Mis Reservas', path: '/my-bookings' },
      { icon: '📋', label: 'Historial Médico', path: '/my-medical-history' },
      { icon: '🧪', label: 'Mis Exámenes', path: '/my-lab-results' },
      { icon: '🔬', label: 'Catálogo Labs', path: '/lab-tests' },
    ],
  },
  lab_technician: {
    label: 'Laboratorio',
    items: [
      { icon: '📊', label: 'Dashboard', path: '/lab' },
      { icon: '📈', label: 'Analítica', path: '/lab/analytics' },
      { icon: '✅', label: 'Control Calidad', path: '/lab/qc' },
    ],
  },
  superadmin: {
    label: 'Plataforma',
    items: [
      { icon: '📊', label: 'Panel Principal', path: '/super-admin' },
      { icon: '🏢', label: 'Clínicas', path: '/super-admin/tenants' },
      { icon: '👥', label: 'Usuarios', path: '/super-admin/users' },
      { icon: '📈', label: 'Analíticas', path: '/super-admin/analytics' },
      { icon: '🎯', label: 'Datos Demo', path: '/super-admin/demo-data' },
    ],
  },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role as string | undefined;

  const roleSections = role ? sections[role] : null;
  if (!role || !roleSections) return null;

  const userName = user?.name as string || user?.email as string || '';
  const initials = getInitials(userName);

  return (
    <aside className="ds-sidebar">
      <div className="ds-sidebar-brand">
        <div className="ds-sidebar-brand-icon">+</div>
        <div>
          <div className="ds-sidebar-brand-text">{t('app.name')}</div>
          <div className="ds-sidebar-brand-role">{t('app.subtitle')}</div>
        </div>
      </div>

      <nav className="ds-sidebar-nav">
        <div className="ds-nav-section">
          <div className="ds-nav-section-label">{roleSections.label}</div>
          {roleSections.items.map((item) => (
            <a
              key={item.path}
              className={`ds-nav-item${location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)) ? ' active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="ds-nav-icon">{item.icon}</span>
              {item.label}
              {item.badge && <span className="ds-nav-badge">{item.badge}</span>}
            </a>
          ))}
        </div>
      </nav>

      <div className="ds-sidebar-footer">
        <div
          className="ds-sidebar-user"
          onClick={async () => { await logout(); navigate('/'); }}
        >
          <div className="ds-sidebar-avatar">{initials}</div>
          <div>
            <div className="ds-sidebar-user-name">{userName}</div>
            <div className="ds-sidebar-user-role">{role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
