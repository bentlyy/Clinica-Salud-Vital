import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import Person from '@mui/icons-material/Person';
import Science from '@mui/icons-material/Science';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { apiClient } from '@/shared/services/api-client';
import { downloadLabOrderPdf } from '@/shared/utils/pdf';

interface ClinicalRecord {
  id: number;
  doctor_name: string;
  diagnosis: string;
  chief_complaint: string;
  anamnesis: string;
  treatment_plan: string;
  created_at: string;
  status: string;
}

interface LabRequest {
  id: number;
  request_number: string;
  test_type: string;
  status: string;
  priority: string;
  results?: string;
  created_at: string;
}

interface PatientInfo {
  id: number;
  name: string;
  email: string;
  rut: string;
  phone: string;
}

type TabValue = 'records' | 'lab';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  completed: { bg: '#d1fae5', color: '#059669' },
  pending: { bg: '#fef3c7', color: '#d97706' },
  in_progress: { bg: '#dbeafe', color: '#2563eb' },
  draft: { bg: '#f3f4f6', color: '#6b7280' },
};

export default function DoctorPatientHistoryPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');

  const [tab, setTab] = useState<TabValue>('records');
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [labRequests, setLabRequests] = useState<LabRequest[]>([]);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<ClinicalRecord | null>(null);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const [patientRes, recordsRes, labRes] = await Promise.allSettled([
          apiClient.get(`/patients/${patientId}`),
          apiClient.get('/clinical-records', { params: { patient_id: patientId, limit: 100 } }),
          apiClient.get('/laboratory/requests', { params: { patient_id: patientId, limit: 100 } }),
        ]);

        if (patientRes.status === 'fulfilled') setPatient(patientRes.value.data);

        const extractItems = (res: PromiseFulfilledResult<{ data: unknown }>) => {
          const d = res.value.data as Record<string, unknown>;
          if (Array.isArray(d)) return d;
          if (d && typeof d === 'object' && Array.isArray((d as Record<string, unknown>).items)) return (d as Record<string, unknown>).items;
          return [];
        };

        if (recordsRes.status === 'fulfilled') setRecords(extractItems(recordsRes) as ClinicalRecord[]);
        if (labRes.status === 'fulfilled') setLabRequests(extractItems(labRes) as LabRequest[]);
      } catch {
        setRecords([]);
        setLabRequests([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]);

  if (!patientId) {
    return (
      <Box>
        <PageHeader title={t('patient_history.title')} />
        <EmptyState title={t('patient_history.selectPatient')} message={t('patient_history.selectPatientDesc')} />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#0d9488' }} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={t('patient_history.title')}
        subtitle={patient ? `${patient.name} — ${patient.rut || ''}` : t('patient_history.patientLabel', { id: patientId })}
      />

      {patient && (
        <Paper sx={{ p: 2, mb: 3, border: '1px solid #e5e7eb', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Person sx={{ fontSize: 40, color: '#0d9488' }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{patient.name}</Typography>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              {patient.email} · {patient.phone || '—'}
            </Typography>
          </Box>
        </Paper>
      )}

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setSelectedRecord(null); }} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="records" label={t('patient_history.tabRecords', { count: records.length })} />
        <Tab value="lab" label={t('patient_history.tabExams', { count: labRequests.length })} />
      </Tabs>

      {/* Detail view */}
      {selectedRecord && (
        <Paper sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb', borderRadius: '12px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('patient_history.detailTitle', { date: selectedRecord.created_at?.split('T')[0] })}</Typography>
            <Chip label={selectedRecord.status} size="small" sx={{ backgroundColor: STATUS_COLORS[selectedRecord.status]?.bg || '#f3f4f6', color: STATUS_COLORS[selectedRecord.status]?.color || '#6b7280' }} />
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>{t('patient_history.chiefComplaint')}</Typography>
              <Typography variant="body2">{selectedRecord.chief_complaint || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>{t('patient_history.anamnesis')}</Typography>
              <Typography variant="body2">{selectedRecord.anamnesis || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>{t('patient_history.diagnosis')}</Typography>
              <Typography variant="body2">{selectedRecord.diagnosis || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>{t('patient_history.treatmentPlan')}</Typography>
              <Typography variant="body2">{selectedRecord.treatment_plan || '—'}</Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>Dr. {selectedRecord.doctor_name}</Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Chip label={t('patient_history.backToList')} onClick={() => setSelectedRecord(null)} clickable size="small" sx={{ cursor: 'pointer' }} />
          </Box>
        </Paper>
      )}

      {/* Records list */}
      {!selectedRecord && tab === 'records' && (
        <Paper sx={{ border: '1px solid #e5e7eb', borderRadius: '12px' }}>
          {records.length === 0 ? (
            <EmptyState title={t('patient_history.noRecords')} message={t('patient_history.noRecordsDesc')} />
          ) : (
            <List disablePadding>
              {records.map((r, idx) => {
                const st = STATUS_COLORS[r.status] || { bg: '#f3f4f6', color: '#6b7280' };
                return (
                  <Box key={r.id}>
                    {idx > 0 && <Divider />}
                    <ListItem
                      sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f0fdfa' } }}
                      onClick={() => setSelectedRecord(r)}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>{r.diagnosis || t('patient_history.noDiagnosis')}</Typography>
                            <Chip label={r.status} size="small" sx={{ backgroundColor: st.bg, color: st.color, fontSize: 11 }} />
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {r.created_at?.split('T')[0]} · Dr. {r.doctor_name}
                          </Typography>
                        }
                      />
                    </ListItem>
                  </Box>
                );
              })}
            </List>
          )}
        </Paper>
      )}

      {/* Lab list */}
      {!selectedRecord && tab === 'lab' && (
        <Paper sx={{ border: '1px solid #e5e7eb', borderRadius: '12px' }}>
          {labRequests.length === 0 ? (
            <EmptyState
              icon={<Science sx={{ fontSize: 48, color: '#d1d5db' }} />}
              title={t('patient_history.noExams')}
              message={t('patient_history.noExamsDesc')}
            />
          ) : (
            <List disablePadding>
              {labRequests.map((r, idx) => {
                const st = STATUS_COLORS[r.status] || { bg: '#f3f4f6', color: '#6b7280' };
                return (
                  <Box key={r.id}>
                    {idx > 0 && <Divider />}
                    <ListItem
                      secondaryAction={
                        r.status === 'completed' ? (
                          <Chip
                            label={t('patient_history.downloadPdf')}
                            size="small"
                            onClick={() => downloadLabOrderPdf(r.id)}
                            sx={{ cursor: 'pointer', backgroundColor: '#dbeafe', color: '#2563eb' }}
                          />
                        ) : undefined
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>{r.test_type || r.request_number}</Typography>
                            <Chip label={r.status} size="small" sx={{ backgroundColor: st.bg, color: st.color, fontSize: 11 }} />
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {r.created_at?.split('T')[0]} · {t('patient_history.priority')}: {r.priority}
                          </Typography>
                        }
                      />
                    </ListItem>
                  </Box>
                );
              })}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
}
