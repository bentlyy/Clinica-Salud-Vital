import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Divider, Chip } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Edit from '@mui/icons-material/Edit';
import Print from '@mui/icons-material/Print';
import CalendarToday from '@mui/icons-material/CalendarToday';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useClinicalRecordDetail } from '../hooks/useClinicalRecords';
import { VitalsDisplay } from '../components/VitalsDisplay';

export default function ClinicalRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('clinicalRecords', 'edit');

  const recordId = id ? parseInt(id, 10) : null;
  const { data: record, isLoading, error, refetch } = useClinicalRecordDetail(recordId);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return <LoadingState message="Cargando expediente..." />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;
  if (!record) return <ErrorState variant="notFound" />;

  return (
    <Box>
      <PageHeader
        title={`Expediente #${record.id}`}
        subtitle={record.patient_name || `Paciente #${record.patient_id}`}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate(-1)}
              sx={{ textTransform: 'none' }}
            >
              Volver
            </Button>
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => navigate(`/clinical-records/${record.id}/edit`)}
                sx={{ textTransform: 'none' }}
              >
                Editar
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={handlePrint}
              sx={{ textTransform: 'none' }}
            >
              Imprimir
            </Button>
          </Box>
        }
      />

      <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {/* Patient & Doctor Info */}
        <Paper sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            <InfoBlock label="Paciente" value={record.patient_name || `Paciente #${record.patient_id}`} />
            <InfoBlock label="Doctor" value={record.doctor_name || `Doctor #${record.doctor_id}`} />
            <InfoBlock
              label="Fecha de Creación"
              value={format(new Date(record.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              icon={<CalendarToday sx={{ fontSize: 14 }} />}
            />
          </Box>
        </Paper>

        {/* Vitals */}
        {record.vitals && Object.keys(record.vitals).length > 0 && (
          <Paper sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
              Signos Vitales
            </Typography>
            <VitalsDisplay vitals={record.vitals} />
          </Paper>
        )}

        {/* Clinical Content */}
        <Paper sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
          <ClinicalSection title="Consulta Principal" content={record.chief_complaint} />
          <Divider sx={{ my: 2 }} />
          <ClinicalSection title="Diagnóstico" content={record.diagnosis} />
          <Divider sx={{ my: 2 }} />
          <ClinicalSection title="Tratamiento" content={record.treatment} />
          {record.notes && (
            <>
              <Divider sx={{ my: 2 }} />
              <ClinicalSection title="Notas Adicionales" content={record.notes} />
            </>
          )}
        </Paper>

        {/* Attachments */}
        {record.attachments && record.attachments.length > 0 && (
          <Paper sx={{ p: 3, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
              Adjuntos
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
  return (
    <Box>
      <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1f2937', mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {icon} {value}
      </Typography>
    </Box>
  );
}

function ClinicalSection({ title, content }: { title: string; content: string }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
        {content}
      </Typography>
    </Box>
  );
}
