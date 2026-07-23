import { useI18n } from '@/i18n/I18nContext';
import { useTheme } from '@/context/useTheme';
import { useAuth } from '@/context/useAuth';
import { useState, useRef, useEffect } from 'react';
import './Topbar.css';

interface TopbarProps {
  title: string;
  onMenuToggle?: () => void;
}

export default function Topbar({ title, onMenuToggle }: TopbarProps) {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onMenuToggle && (
          <button className="topbar-menu-btn" onClick={onMenuToggle} aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-center">
        <div className="topbar-search-wrapper">
          <svg className="topbar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="topbar-search"
            type="text"
            placeholder={t('search') ?? 'Buscar...'}
            readOnly
          />
        </div>
      </div>

      <div className="topbar-right">
        <button
          className="topbar-pill"
          onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
          title="Toggle language"
        >
          <span className={locale === 'es' ? 'active' : ''}>ES</span>
          <span className="topbar-pill-divider">|</span>
          <span className={locale === 'en' ? 'active' : ''}>EN</span>
        </button>

        <button className="topbar-icon-btn" title={t('notifications') ?? 'Notificaciones'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="topbar-notif-dot" />
        </button>

        <button
          className="topbar-icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? (
            <span className="topbar-emoji">&#9728;&#65039;</span>
          ) : (
            <span className="topbar-emoji">&#127769;</span>
          )}
        </button>

        <div className="topbar-user-wrap" ref={dropdownRef}>
          <button
            className="topbar-user-trigger"
            onClick={() => setDropdownOpen((o) => !o)}
          >
            <div className="topbar-avatar">{initials}</div>
            <span className="topbar-username">{user?.name ?? '—'}</span>
            <svg className={`topbar-chevron ${dropdownOpen ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="topbar-dropdown">
              <button className="topbar-dropdown-item">{t('profile') ?? 'Perfil'}</button>
              <button className="topbar-dropdown-item">{t('settings') ?? 'Configuracion'}</button>
              <hr className="topbar-dropdown-divider" />
              <button className="topbar-dropdown-item topbar-dropdown-danger" onClick={logout}>
                {t('logout') ?? 'Cerrar sesion'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
