import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
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

function extractItems(res: PromiseFulfilledResult<{ data: unknown }>): unknown[] {
  const d = res.value.data as Record<string, unknown> | unknown[] | null | undefined;
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
  const [records, setRecords] = useState<FichaClinicalRecord[]>([]);
  const [labRequests, setLabRequests] = useState<FichaLabRequest[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<FichaMedicalHistoryEntry[]>([]);
  const [prescriptions, setPrescriptions] = useState<FichaPrescriptionRecord[]>([]);
  const [bookings, setBookings] = useState<FichaBooking[]>([]);
  const [patient, setPatient] = useState<FichaPatient | null>(null);
  const [loading, setLoading] = useState(true);

  const patientNumber = patientId ? Number(patientId) : null;
  const { data: attachments } = useAttachments('patient', patientNumber);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const [patientRes, recordsRes, labRes, medRes, rxRes, bookingsRes] = await Promise.allSettled([
          apiClient.get(`/patients/${patientId}`),
          apiClient.get('/clinical-records', { params: { patient_id: patientId, limit: 100 } }),
          apiClient.get('/laboratory/requests', { params: { patient_id: patientId, limit: 100 } }),
          apiClient.get(`/medical-history/patient/${patientId}`),
          apiClient.get('/clinical-records/prescriptions/all'),
          apiClient.get('/bookings/doctor', { params: { page: 1, limit: 100 } }),
        ]);

        if (patientRes.status === 'fulfilled') {
          setPatient(patientRes.value.data as FichaPatient);
        }

        if (recordsRes.status === 'fulfilled') {
          setRecords(extractItems(recordsRes) as FichaClinicalRecord[]);
        }

        if (labRes.status === 'fulfilled') {
          const all = extractItems(labRes) as FichaLabRequest[];
          setLabRequests(all.filter((r) => Number(r.patient_id) === patientNumber));
        }

        if (medRes.status === 'fulfilled') {
          setMedicalHistory(extractItems(medRes) as FichaMedicalHistoryEntry[]);
        }

        if (rxRes.status === 'fulfilled') {
          const all = extractItems(rxRes) as FichaPrescriptionRecord[];
          setPrescriptions(all.filter((r) => Number(r.patient_id) === patientNumber));
        }

        if (bookingsRes.status === 'fulfilled') {
          const all = extractItems(bookingsRes) as FichaBooking[];
          setBookings(all.filter((b) => Number(b.patient_id) === patientNumber));
        }
      } catch {
        setRecords([]);
        setLabRequests([]);
        setMedicalHistory([]);
        setPrescriptions([]);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId, patientNumber]);

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
