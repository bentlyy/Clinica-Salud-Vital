import { Box, Tabs, Tab } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useAuth } from '@/shared/providers/AuthProvider';
import AdminAnalyticsPage from '@/modules/analytics/pages/AdminAnalyticsPage';
import ReportsPage from '@/modules/reports/pages/ReportsPage';
import AuditPage from '@/modules/audit/pages/AuditPage';
import BillingPage from '@/modules/billing/pages/BillingPage';

export default function ManagementPage() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const [tab, setTab] = useState(0);

  const adminTabs = [
    { label: t('tabAnalytics'), content: <AdminAnalyticsPage /> },
    { label: t('tabReports'), content: <ReportsPage /> },
    { label: t('tabAudit'), content: <AuditPage /> },
    { label: t('tabBilling'), content: <BillingPage /> },
  ];

  const doctorTabs = [
    { label: t('tabAnalytics'), content: <AdminAnalyticsPage /> },
    { label: t('tabReports'), content: <ReportsPage /> },
  ];

  const tabs = user?.role === 'doctor' ? doctorTabs : adminTabs;

  return (
    <Box>
      <PageHeader title={t('tabManagement')} />
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          {tabs.map((tb) => (
            <Tab key={tb.label} label={tb.label} />
          ))}
        </Tabs>
      </Box>
      <Box>{tabs[tab]?.content}</Box>
    </Box>
  );
}
