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
              <Link to="/admin/analytics" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.analytics')}</Link>
            </>
          )}

          {user?.role === 'doctor' && (
            <>
              <Link to="/doctor" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.doctor_panel')}</Link>
              <Link to="/doctor/calendar" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.calendar')}</Link>
              <Link to="/doctor/clinical-records" className="nav-link" onClick={() => setMobileOpen(false)}>{t('nav.clinical_records')}</Link>
            </>
          )}

          {user?.role === 'admin' && (
            <>
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
                <span className="user-email">
                  {user.email}
                  {user.tenant_id && user.tenant_id !== 'default' && (
                    <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>· {user.tenant_id}</span>
                  )}
                </span>
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
