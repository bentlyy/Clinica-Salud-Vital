import { useI18n } from '../i18n/useI18n';
import Button from '../components/ui/Button';
import { PageContainer } from '../components/ui/PageContainer';

export default function NotFoundPage() {
  const { t } = useI18n();
  return (
    <PageContainer maxWidth="sm" style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 80 }}>
      <h1 style={{ fontSize: '4rem', margin: '0 0 8px', color: 'var(--ds-text-tertiary)' }}>404</h1>
      <h2 style={{ margin: '0 0 12px' }}>{t('not_found.title')}</h2>
      <p style={{ color: 'var(--ds-text-secondary)', margin: '0 0 24px' }}>{t('not_found.message')}</p>
      <a href="/" className="ds-btn ds-btn--primary">{t('not_found.go_home')}</a>
    </PageContainer>
  );
}
