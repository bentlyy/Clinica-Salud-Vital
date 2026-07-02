import { useI18n } from '../i18n/useI18n';

export default function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="page-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h1 style={{ fontSize: '4rem', margin: '0 0 8px', color: 'var(--text-muted)' }}>404</h1>
      <h2 style={{ margin: '0 0 12px' }}>{t('not_found.title')}</h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px' }}>{t('not_found.message')}</p>
      <a href="/" className="btn btn-primary">{t('not_found.go_home')}</a>
    </div>
  );
}
