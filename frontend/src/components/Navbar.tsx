import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/useTheme';
import { useI18n, setStoredLocale } from '../i18n/useI18n';
import { useFeature } from '../context/useFeature';

const locales = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
  { code: 'fr', label: 'FR' },
];

function NavLabLink({ to, label, enabled }: { to: string; label: string; enabled: boolean }) {
  return (
    <Link
      to={enabled ? to : '#'}
      className={`nav-link${!enabled ? ' nav-link-disabled' : ''}`}
      onClick={(e) => { if (!enabled) e.preventDefault(); }}
    >
      {label}
      {!enabled && <span className="lock-badge">🔒</span>}
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, t } = useI18n();
  const { hasFeature, loading: featureLoading } = useFeature();
  const navigate = useNavigate();
  const [localeOpen, setLocaleOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [user]);

  const labEnabled = featureLoading || hasFeature('laboratory');

  return (
    <header className="clinic-navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" onClick={() => setMobileOpen(false)}>
          <span className="brand-icon">+</span>
          <span className="brand-text">
            <span className="brand-name">{t('app.name')}</span>
            <span className="brand-sub">{t('app.subtitle')}</span>
          </span>
        </Link>

        <button
          className={`navbar-hamburger ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav ref={menuRef} className={`navbar-nav${mobileOpen ? ' navbar-nav-open' : ''}`}>
          {user && user.role !== 'admin' && (
            <>
              <Link to="/booking" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.booking')}</Link>
            </>
          )}

          {user?.role === 'doctor' && (
            <>
              <Link to="/doctor" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.doctor_panel')}</Link>
              <Link to="/doctor/calendar" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.calendar')}</Link>
              <Link to="/doctor/clinical-records" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.clinical_records')}</Link>
              <NavLabLink to="/doctor/lab-results" label={t('nav.doctor_lab_results')} enabled={labEnabled} />
            </>
          )}

          {user?.role === 'lab_technician' && (
            <>
              <Link to="/lab" className="nav-link" onClick={() => setMobileOpen(false)}>🔬 Laboratorio</Link>
              <NavLabLink to="/my-lab-results" label="Mis Resultados" enabled={labEnabled} />
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <Link to="/admin/demo-data" className="nav-link" onClick={() => setMobileOpen(false)}>Demo Data</Link>
              <Link to="/admin/specialties" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.specialties')}</Link>
              <NavLabLink to="/admin/lab-tests" label={t('nav.lab_tests')} enabled={labEnabled} />
              <Link to="/admin/register-doctor" className="nav-link nav-link-accent" onClick={() => setMobileOpen(false)}>{t('nav.register_doctor')}</Link>
            </>
          )}

          {user?.role === 'superadmin' && (
            <>
              <Link to="/super-admin" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.dashboard')}</Link>
              <Link to="/super-admin/tenants" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.tenants')}</Link>
              <Link to="/super-admin/demo-data" className="nav-link" onClick={() => setMobileOpen(false)}>Demo Data</Link>
            </>
          )}

          {!user && (
            <>
              <Link to="/specialists" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.specialists')}</Link>
              <Link to="/booking" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.booking')}</Link>
              <Link to="/login" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.login')}</Link>
            </>
          )}

          <div className="navbar-actions">
            <div className="navbar-locale-wrapper">
              <button onClick={() => setLocaleOpen(!localeOpen)} className="btn btn-ghost btn-sm navbar-locale-btn">
                {locale.toUpperCase()}
              </button>
              {localeOpen && (
                <div className="navbar-locale-menu">
                  {locales.map((l) => (
                    <button key={l.code} className="btn btn-ghost btn-sm btn-block"
                      onClick={() => { setStoredLocale(l.code); setLocaleOpen(false); setMobileOpen(false); }}>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {localeOpen && <div className="navbar-locale-backdrop" onClick={() => setLocaleOpen(false)} />}

            <button onClick={toggleTheme} className="btn btn-ghost btn-sm theme-toggle" aria-label="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {user && (
              <div className="navbar-user">
                <div className="user-info">
                  <span className="user-name">{user.name || user.email}</span>
                  {user.name && <span className="user-email">{user.email}</span>}
                </div>
                <button onClick={async () => { await logout(); navigate('/'); }} className="btn btn-ghost btn-sm">
                  {t('nav.logout')}
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
