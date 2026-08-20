import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { useQueries } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import Person from '@mui/icons-material/Person';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { apiClient } from '@/shared/services/api-client';
import { useAttachments } from '@/modules/attachments/hooks/useAttachments';
import { SummaryTab, type SummaryTabId } from '../components/patient-ficha/SummaryTab';
import { BookingsTab } from '../components/patient-ficha/BookingsTab';
import { HistoryTab } from '../components/patient-ficha/HistoryTab';
import { PrescriptionsTab } from '../components/patient-ficha/PrescriptionsTab';
import { AttachmentsTab } from '../components/patient-ficha/AttachmentsTab';
import { LabTab } from '../components/patient-ficha/LabTab';
import type {
  FichaPatient,
  FichaClinicalRecord,
  FichaLabRequest,
  FichaMedicalHistoryEntry,
  FichaPrescriptionRecord,
  FichaBooking,
} from '../components/patient-ficha/types';

type TabValue = 'summary' | 'bookings' | 'history' | 'prescriptions' | 'attachments' | 'lab';

function extractItems(res: { data: unknown }): unknown[] {
  const d = res.data as Record<string, unknown> | unknown[] | null | undefined;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object') {
    const obj = d as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.data)) return obj.data as unknown[];
  }
  return [];
}

export default function DoctorPatientHistoryPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');

  const [tab, setTab] = useState<TabValue>('summary');
  const patientNumber = patientId ? Number(patientId) : null;
  const { data: attachments } = useAttachments('patient', patientNumber);

  const results = useQueries({
    queries: [
      { queryKey: ['patient', patientId], queryFn: () => apiClient.get(`/patients/${patientId}`), enabled: !!patientId },
      { queryKey: ['clinical-records', 'by-patient', patientId], queryFn: () => apiClient.get('/clinical-records', { params: { patient_id: patientId, limit: 100 } }), enabled: !!patientId },
      { queryKey: ['laboratory', 'requests', 'by-patient', patientId], queryFn: () => apiClient.get('/laboratory/requests', { params: { patient_id: patientId, limit: 100 } }), enabled: !!patientId },
      { queryKey: ['medical-history', 'patient', patientId], queryFn: () => apiClient.get(`/medical-history/patient/${patientId}`), enabled: !!patientId },
      { queryKey: ['prescriptions', 'all'], queryFn: () => apiClient.get('/clinical-records/prescriptions/all'), enabled: !!patientId },
      { queryKey: ['bookings', 'doctor', 'list'], queryFn: () => apiClient.get('/bookings/doctor', { params: { page: 1, limit: 100 } }), enabled: !!patientId },
    ],
  });

  const loading = results.some((r) => r.isLoading);

  const patient = (results[0].data?.data as FichaPatient) ?? null;
  const records = (extractItems(results[1]) as FichaClinicalRecord[]) ?? [];
  const allLab = (extractItems(results[2]) as FichaLabRequest[]) ?? [];
  const labRequests = allLab.filter((r) => Number(r.patient_id) === patientNumber);
  const medicalHistory = (extractItems(results[3]) as FichaMedicalHistoryEntry[]) ?? [];
  const allRx = (extractItems(results[4]) as FichaPrescriptionRecord[]) ?? [];
  const prescriptions = allRx.filter((r) => Number(r.patient_id) === patientNumber);
  const allBookings = (extractItems(results[5]) as FichaBooking[]) ?? [];
  const bookings = allBookings.filter((b) => Number(b.patient_id) === patientNumber);

  const handleNavigate = useCallback((target: SummaryTabId) => {
    setTab(target);
  }, []);

  if (!patientId) {
    return (
      <Box>
        <PageHeader title={t('patient_history:title')} />
        <EmptyState title={t('patient_history:selectPatient')} message={t('patient_history:selectPatientDesc')} />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: theme.palette.primary.main }} />
      </Box>
    );
  }

  const tabLabel = (key: string, count?: number) =>
    count === undefined ? t(key) : t(key, { count });

  return (
    <Box>
      <PageHeader
        title={t('patient_ficha:title')}
        subtitle={patient ? `${patient.name} — ${patient.rut || ''}` : t('patient_history:patientLabel', { id: patientId })}
      />

      {patient && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Person sx={{ fontSize: 40, color: theme.palette.primary.main }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {patient.name}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              {[patient.email, patient.phone].filter(Boolean).join(' · ') || '—'}
            </Typography>
          </Box>
        </Paper>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        <Tab value="summary" label={t('patient_ficha:tabSummary')} />
        <Tab value="bookings" label={tabLabel('patient_ficha:tabBookings', bookings.length)} />
        <Tab value="history" label={t('patient_ficha:tabHistory')} />
        <Tab value="prescriptions" label={tabLabel('patient_ficha:tabPrescriptions', prescriptions.length)} />
        <Tab value="attachments" label={t('patient_ficha:tabAttachments')} />
        <Tab value="lab" label={tabLabel('patient_ficha:tabLab', labRequests.length)} />
      </Tabs>

      {tab === 'summary' && patient && (
        <SummaryTab
          patient={patient}
          counts={{
            bookings: bookings.length,
            records: records.length,
            prescriptions: prescriptions.length,
            lab: labRequests.length,
            attachments: attachments?.length ?? 0,
          }}
          medicalHistory={medicalHistory}
          onNavigate={handleNavigate}
        />
      )}
      {tab === 'bookings' && <BookingsTab bookings={bookings} />}
      {tab === 'history' && <HistoryTab records={records} medicalHistory={medicalHistory} />}
      {tab === 'prescriptions' && <PrescriptionsTab prescriptions={prescriptions} />}
      {tab === 'attachments' && patientNumber !== null && <AttachmentsTab patientId={patientNumber} />}
      {tab === 'lab' && <LabTab labRequests={labRequests} />}
    </Box>
  );
}
