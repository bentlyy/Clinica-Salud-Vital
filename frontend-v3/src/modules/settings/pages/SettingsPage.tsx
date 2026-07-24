import { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PersonOutline from '@mui/icons-material/PersonOutline';
import Security from '@mui/icons-material/Security';
import NotificationsActive from '@mui/icons-material/NotificationsActive';
import { useTranslation } from 'react-i18next';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { ProfileTab } from '../components/ProfileTab';
import { SecurityTab } from '../components/SecurityTab';
import { NotificationTab } from '../components/NotificationTab';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </Box>
  );
}

export default function SettingsPage() {
  const theme = useTheme();
  const { t } = useTranslation('settings');
  const [activeTab, setActiveTab] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <Paper sx={{ borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
        <Tabs
          value={activeTab}
          onChange={handleChange}
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            px: 3,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              minHeight: 56,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.primary.main,
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab
            icon={<PersonOutline sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={t('tab_profile')}
          />
          <Tab
            icon={<Security sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={t('tab_security')}
          />
          <Tab
            icon={<NotificationsActive sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={t('tab_notifications')}
          />
        </Tabs>

        <Box sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
          <TabPanel value={activeTab} index={0}>
            <ProfileTab />
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <SecurityTab />
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <NotificationTab />
          </TabPanel>
        </Box>
      </Paper>
    </MotionDiv>
  );
}
