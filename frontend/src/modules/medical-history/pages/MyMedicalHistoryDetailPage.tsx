import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Grid,
  Skeleton,
  Alert,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Science from '@mui/icons-material/Science';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { clinicalRecordService } from '../../clinical-records/services/clinical-record.service';
import { getLabRequests } from '../../laboratory/services/lab.service';
import type { ClinicalRecord } from '../../clinical-records/types/clinical-record.types';
import type { LabRequest } from '../../laboratory/types/lab.types';

export default function MyMedicalHistoryDetailPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<ClinicalRecord | null>(null);
  const [labResults, setLabResults] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLab, setShowLab] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const rec = await clinicalRecordService.getById(Number(id));
        setRecord(rec);
        const labs = await getLabRequests({ patient_id: rec.patient_id }).catch(() => ({ data: [] }));
        setLabResults(Array.isArray(labs) ? labs : labs.data || []);
      } catch {
        setError(t('medical_history_detail:errorLoading'));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return (
    <Box sx={{ p: 4 }}>
      <Skeleton variant="rounded" height={60} sx={{ mb: 2, borderRadius: '12px' }} />
      {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={120} sx={{ mb: 2, borderRadius: '12px' }} />)}
    </Box>
  );
  if (error) return <Box sx={{ p: 4 }}><Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert></Box>;
  if (!record) return <Box sx={{ p: 4 }}><Alert severity="info" sx={{ borderRadius: '10px' }}>{t('medical_history_detail:notFound')}</Alert></Box>;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Paper sx={{ p: 2.5, mb: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 1.5, fontSize: 12, letterSpacing: 0.5 }}>
        {title.toUpperCase()}
      </Typography>
      {children}
    </Paper>
  );

  return (
    <Box>
      <PageHeader
        title={t('medical_history_detail:title')}
        subtitle={`${record.created_at?.split('T')[0]} — ${t('medical_history_detail:doctorLabel', { name: record.doctor_name || t('medical_history_detail:unknownDoctor') })}`}
        action={
          <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ textTransform: 'none' }}>
            {t('medical_history_detail:back')}
          </Button>
        }
      />

      {record.chief_complaint && (
        <Section title={t('medical_history_detail:chiefComplaint')}>
          <Typography variant="body2">{record.chief_complaint}</Typography>
        </Section>
      )}

      {record.anamnesis && (
        <Section title={t('medical_history_detail:anamnesis')}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{record.anamnesis}</Typography>
        </Section>
      )}

      {record.vital_signs && typeof record.vital_signs === 'object' && Object.values(record.vital_signs as Record<string, unknown>).some(Boolean) && (
        <Section title={t('medical_history_detail:vitalSigns')}>
          <Grid container spacing={2}>
            {Object.entries(record.vital_signs as Record<string, string>).filter(([, v]) => v).map(([k, v]) => (
              <Grid xs={6} sm={4} md={3} key={k}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{v}</Typography>
              </Grid>
            ))}
          </Grid>
        </Section>
      )}

      {record.physical_exam && (
        <Section title={t('medical_history_detail:physicalExam')}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{record.physical_exam}</Typography>
        </Section>
      )}

      {record.diagnosis && (
        <Section title={t('medical_history_detail:diagnosis')}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{record.diagnosis}</Typography>
        </Section>
      )}

      {record.cie10_codes && record.cie10_codes.length > 0 && (
        <Section title={t('medical_history_detail:cie10Codes')}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {record.cie10_codes.map((c) => (
              <Chip key={c} label={c} size="small" sx={{ backgroundColor: theme.palette.custom.status.info.bg, color: theme.palette.info.dark }} />
            ))}
          </Box>
        </Section>
      )}

      {record.treatment_plan && (
        <Section title={t('medical_history_detail:treatmentPlan')}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{record.treatment_plan}</Typography>
        </Section>
      )}

      {record.notes && (
        <Section title={t('medical_history_detail:notes')}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: theme.palette.text.secondary }}>{record.notes}</Typography>
        </Section>
      )}

      {/* Lab Results */}
      <Paper sx={{ p: 2.5, mb: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Science sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, fontSize: 12 }}>
                {t('medical_history_detail:labResultsTitle')}
              </Typography>
          </Box>
          {labResults.length > 0 && (
            <Button size="small" onClick={() => setShowLab(!showLab)} sx={{ textTransform: 'none', fontSize: 12 }}>
              {showLab ? t('medical_history_detail:hide') : t('medical_history_detail:show', { count: labResults.length })}
            </Button>
          )}
        </Box>
        {showLab && labResults.map((req) => (
          <Box key={req.id} sx={{ p: 1.5, mb: 1, border: `1px solid ${theme.palette.custom.surface.sunken}`, borderRadius: '8px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{req.request_number || `Solicitud #${req.id}`}</Typography>
              <Chip label={req.status} size="small" sx={{ fontSize: 10, height: 20 }} />
            </Box>
            {req.items?.map((item) => (
              <Typography key={item.id} variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', pl: 1 }}>
                {item.test_name || `Test #${item.lab_test_id}`}: {item.result_value || t('medical_history_detail:pending')}
              </Typography>
            ))}
          </Box>
        ))}
        {labResults.length === 0 && (
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{t('medical_history_detail:noLabResults')}</Typography>
        )}
      </Paper>
    </Box>
  );
}
