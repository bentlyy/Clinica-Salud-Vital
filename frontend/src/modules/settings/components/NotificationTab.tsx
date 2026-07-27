import { useTranslation } from 'react-i18next';
import PlaceholderPage from '@/shared/components/ui/PlaceholderPage';

export function NotificationTab() {
  const { t } = useTranslation('settings');
  return (
    <PlaceholderPage title={t('notifications_placeholder')} />
  );
}
