import { Box, Tabs, Tab } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import NotificationsPage from '@/modules/notifications/pages/NotificationsPage';
import SettingsPage from '@/modules/settings/pages/SettingsPage';

export default function SystemPage() {
  const { t } = useTranslation('dashboard');
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: t('tabNotifications'), content: <NotificationsPage /> },
    { label: t('tabSettings'), content: <SettingsPage /> },
  ];

  return (
    <Box>
      <PageHeader title={t('tabSystem')} />
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          {tabs.map((tb, i) => (
            <Tab key={i} label={tb.label} />
          ))}
        </Tabs>
      </Box>
      <Box>{tabs[tab]?.content}</Box>
    </Box>
  );
}
