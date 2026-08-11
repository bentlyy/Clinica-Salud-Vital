import { Box, Tabs, Tab } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useAuth } from '@/shared/providers/AuthProvider';
import BookingsPage from '@/modules/bookings/pages/BookingsPage';
import ClinicalRecordsPage from '@/modules/clinical-records/pages/ClinicalRecordsPage';
import PrescriptionsPage from '@/modules/prescriptions/pages/PrescriptionsPage';
import MedicalHistoryPage from '@/modules/medical-history/pages/MedicalHistoryPage';
import PatientsPage from '@/modules/patients/pages/PatientsPage';
import AvailabilityPage from '@/modules/availability/pages/AvailabilityPage';

export default function ClinicalPage() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const [tab, setTab] = useState(0);

  const baseTabs = [
    { label: t('tabBookings'), content: <BookingsPage /> },
    { label: t('tabClinicalRecords'), content: <ClinicalRecordsPage /> },
    { label: t('tabPrescriptions'), content: <PrescriptionsPage /> },
    { label: t('tabMedicalHistory'), content: <MedicalHistoryPage /> },
  ];

  const doctorTabs = [
    { label: t('tabBookings'), content: <BookingsPage /> },
    { label: t('tabPatients'), content: <PatientsPage /> },
    { label: t('tabClinicalRecords'), content: <ClinicalRecordsPage /> },
    { label: t('tabPrescriptions'), content: <PrescriptionsPage /> },
    { label: t('tabMedicalHistory'), content: <MedicalHistoryPage /> },
    { label: t('tabAvailability'), content: <AvailabilityPage /> },
  ];

  const tabs = user?.role === 'doctor' ? doctorTabs : baseTabs;

  return (
    <Box>
      <PageHeader title={t('tabClinical')} />
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
