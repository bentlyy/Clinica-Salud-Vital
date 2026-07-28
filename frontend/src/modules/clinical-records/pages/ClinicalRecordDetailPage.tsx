import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Paper, Typography, Button, Divider, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Edit from '@mui/icons-material/Edit';
import Print from '@mui/icons-material/Print';
import CalendarToday from '@mui/icons-material/CalendarToday';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { useAuth } from '@/shared/providers/AuthProvider';
import { getDateFnsLocale } from '@/shared/utils/localeUtils';
import { useClinicalRecordDetail } from '../hooks/useClinicalRecords';
import { VitalsDisplay } from '../components/VitalsDisplay';

export default function ClinicalRecordDetailPage() {
  const { t } = useTranslation('clinical_record_detail');
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('clinicalRecords', 'edit');
  const [dateFnsLocale, setDateFnsLocale] = useState<Locale | undefined>(undefined);

  useEffect(() => {
    getDateFnsLocale().then(setDateFnsLocale);
  }, []);

  const recordId = id ? parseInt(id, 10) : null;
  const { data: record, isLoading, error, refetch } = useClinicalRecordDetail(recordId);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return <LoadingState message={t('loading_record')} />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;
  if (!record) return <ErrorState variant="notFound" />;

  return (
    <Box>
      <PageHeader
        title={t('record_title', { id: record.id })}
        subtitle={record.patient_name || t('patient_fallback', { id: record.patient_id })}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate(-1)}
              sx={{ textTransform: 'none' }}
            >
              {t('back_button')}
            </Button>
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => navigate(`/clinical-records/${record.id}/edit`)}
                sx={{ textTransform: 'none' }}
              >
                {t('edit_button')}
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={handlePrint}
              sx={{ textTransform: 'none' }}
            >
              {t('print_button')}
            </Button>
          </Box>
        }
      />

      <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {/* Patient & Doctor Info */}
        <Paper sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            <InfoBlock label={t('label_patient')} value={record.patient_name || t('patient_fallback', { id: record.patient_id })} />
            <InfoBlock label={t('label_doctor')} value={record.doctor_name || t('doctor_fallback', { id: record.doctor_id })} />
            <InfoBlock
              label={t('label_created_at')}
              value={format(new Date(record.created_at), "dd 'de' MMMM 'de' yyyy", { locale: dateFnsLocale })}
              icon={<CalendarToday sx={{ fontSize: 14 }} />}
            />
          </Box>
        </Paper>

        {/* Vitals */}
        {record.vitals && Object.keys(record.vitals).length > 0 && (
          <Paper sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
              {t('section_vitals')}
            </Typography>
            <VitalsDisplay vitals={record.vitals} />
          </Paper>
        )}

        {/* Clinical Content */}
        <Paper sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
          <ClinicalSection title={t('section_chief_complaint')} content={record.chief_complaint} />
          <Divider sx={{ my: 2 }} />
          <ClinicalSection title={t('section_diagnosis')} content={record.diagnosis} />
          <Divider sx={{ my: 2 }} />
          <ClinicalSection title={t('section_treatment')} content={record.treatment} />
          {record.notes && (
            <>
              <Divider sx={{ my: 2 }} />
              <ClinicalSection title={t('section_additional_notes')} content={record.notes} />
            </>
          )}
        </Paper>

        {/* Attachments */}
        {record.attachments && record.attachments.length > 0 && (
          <Paper sx={{ p: 3, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
              {t('section_attachments')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {record.attachments.map((attachment, i) => (
                <Chip key={i} label={attachment} variant="outlined" size="small" />
              ))}
            </Box>
          </Paper>
        )}
      </MotionDiv>
    </Box>
  );
}

function InfoBlock({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Box>
      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary, mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {icon} {value}
      </Typography>
    </Box>
  );
}

function ClinicalSection({ title, content }: { title: string; content: string }) {
  const theme = useTheme();
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ color: theme.palette.text.secondary, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
        {content}
      </Typography>
    </Box>
  );
}
