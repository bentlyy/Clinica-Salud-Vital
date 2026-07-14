import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useI18n, setStoredLocale } from '../i18n/useI18n';

export default function Topbar() {
  const { user, logout } = useAuth();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [showLang, setShowLang] = useState(false);

  return (
    <header className="ds-topbar">
      <div className="ds-topbar-left">
        <input className="ds-search-input" type="text" placeholder={t('common.search')} />
      </div>
      <div className="ds-topbar-right">
        <button className="ds-icon-btn" title={t('common.notifications')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
        </button>

        <div className="ds-lang-selector">
          <button className="ds-icon-btn" onClick={() => setShowLang((v) => !v)}>
            {locale === 'es' ? '🇪🇸' : '🇺🇸'}
          </button>
          {showLang && (
            <div className="ds-lang-dropdown">
              <button onClick={() => { setStoredLocale('es'); setShowLang(false); }}>{t('language.es')}</button>
              <button onClick={() => { setStoredLocale('en'); setShowLang(false); }}>{t('language.en')}</button>
            </div>
          )}
        </div>

        <button className="ds-icon-btn" onClick={async () => { await logout(); navigate('/'); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </button>

        <div className="ds-sidebar-avatar" style={{ cursor: 'pointer', width: 36, height: 36, fontSize: 13 }} onClick={async () => { await logout(); navigate('/'); }}>
          {((user?.name as string) || (user?.email as string) || '??').trim().split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase()}
        </div>
      </div>
    </header>
  );
}
