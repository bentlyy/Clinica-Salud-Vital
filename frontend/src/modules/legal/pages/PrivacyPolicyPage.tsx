import { useTranslation } from 'react-i18next';
import { LegalLayout, LegalSection } from '../components/LegalLayout';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation('legal');

  return (
    <LegalLayout title={t('privacy.title')} updated="2026-09-22">
      <p>{t('privacy.intro')}</p>
      <LegalSection title={t('privacy.dataTitle')}>
        <p>{t('privacy.dataBody')}</p>
      </LegalSection>
      <LegalSection title={t('privacy.useTitle')}>
        <p>{t('privacy.useBody')}</p>
      </LegalSection>
      <LegalSection title={t('privacy.shareTitle')}>
        <p>{t('privacy.shareBody')}</p>
      </LegalSection>
      <LegalSection title={t('privacy.securityTitle')}>
        <p>{t('privacy.securityBody')}</p>
      </LegalSection>
      <LegalSection title={t('privacy.rightsTitle')}>
        <p>{t('privacy.rightsBody')}</p>
      </LegalSection>
      <LegalSection title={t('privacy.retentionTitle')}>
        <p>{t('privacy.retentionBody')}</p>
      </LegalSection>
    </LegalLayout>
  );
}