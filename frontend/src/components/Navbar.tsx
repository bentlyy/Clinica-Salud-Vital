import { useState, useRef, useEffect } from 'react';
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
  const { locale, t } = useI18n();
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
          {user && (
            <>
              <Link to="/booking" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.booking')}</Link>
              <Link to="/my-bookings" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.my_bookings')}</Link>
              <Link to="/my-medical-history" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.medical_history')}</Link>
              <Link to="/my-lab-results" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.lab_results')}</Link>
            </>
          )}

          {user?.role === 'doctor' && (
            <>
              <Link to="/doctor" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.doctor_panel')}</Link>
              <Link to="/doctor/calendar" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.calendar')}</Link>
              <Link to="/doctor/clinical-records" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.clinical_records')}</Link>
              <Link to="/doctor/lab-results" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.doctor_lab_results')}</Link>
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <Link to="/admin/medical-history" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.medical_history_admin')}</Link>
              <Link to="/admin/specialties" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.specialties')}</Link>
              <Link to="/admin/lab-tests" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.lab_tests')}</Link>
              <Link to="/admin/register-doctor" className="nav-link nav-link-accent" onClick={() => setMobileOpen(false)}>{t('nav.register_doctor')}</Link>
            </>
          )}

          {user?.role === 'superadmin' && (
            <>
              <Link to="/super-admin" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.dashboard')}</Link>
              <Link to="/super-admin/tenants" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.tenants')}</Link>
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
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button onClick={() => setLocaleOpen(!localeOpen)} className="btn btn-ghost btn-sm" style={{ minWidth: 40 }}>
                {locale.toUpperCase()}
              </button>
              {localeOpen && (
                <div className="navbar-locale-menu">
                  {locales.map((l) => (
                    <button key={l.code} className="btn btn-ghost btn-sm" style={{ width: '100%', borderRadius: 0 }}
                      onClick={() => { setStoredLocale(l.code); setLocaleOpen(false); setMobileOpen(false); }}>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {localeOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setLocaleOpen(false)} />}

            <button onClick={toggleTheme} className="btn btn-ghost btn-sm theme-toggle" aria-label="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {user && (
              <div className="navbar-user">
                <div className="user-info">
                  <span className="user-name">{user.name || user.email}</span>
                  {user.name && <span className="user-email">{user.email}</span>}
                </div>
                <button onClick={async () => { await logout(); window.location.href = '/'; }} className="btn btn-ghost btn-sm">
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
