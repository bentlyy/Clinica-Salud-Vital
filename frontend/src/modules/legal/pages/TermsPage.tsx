import { useTranslation } from 'react-i18next';
import { LegalLayout, LegalSection } from '../components/LegalLayout';

export default function TermsPage() {
  const { t } = useTranslation('legal');

  return (
    <LegalLayout title={t('terms.title')} updated="2026-09-22">
      <p>{t('terms.intro')}</p>
      <LegalSection title={t('terms.serviceTitle')}>
        <p>{t('terms.serviceBody')}</p>
      </LegalSection>
      <LegalSection title={t('terms.accountTitle')}>
        <p>{t('terms.accountBody')}</p>
      </LegalSection>
      <LegalSection title={t('terms.contentTitle')}>
        <p>{t('terms.contentBody')}</p>
      </LegalSection>
      <LegalSection title={t('terms.billingTitle')}>
        <p>{t('terms.billingBody')}</p>
      </LegalSection>
      <LegalSection title={t('terms.liabilityTitle')}>
        <p>{t('terms.liabilityBody')}</p>
      </LegalSection>
      <LegalSection title={t('terms.terminationTitle')}>
        <p>{t('terms.terminationBody')}</p>
      </LegalSection>
    </LegalLayout>
  );
}