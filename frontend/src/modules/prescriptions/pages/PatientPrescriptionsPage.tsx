import { useTheme } from '@mui/material/styles';
import { Box, Typography, Paper, Chip, Button, Stack } from '@mui/material';
import Grid from '@mui/material/Grid';
import MedicationIcon from '@mui/icons-material/Medication';
import Assignment from '@mui/icons-material/Assignment';
import PictureAsPdf from '@mui/icons-material/PictureAsPdf';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { apiClient } from '@/shared/services/api-client';
import { prescriptionService } from '../services/prescription.service';
import { format } from 'date-fns';

interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PatientPrescription {
  clinical_record_id: number;
  patient_id: number;
  doctor_id: number;
  patient_name?: string;
  doctor_name?: string;
  created_at: string;
  medications: Medication[];
}

export default function PatientPrescriptionsPage() {
  const { t } = useTranslation();
  const theme = useTheme();

  const { data: prescriptions = [], isLoading, error } = useQuery<PatientPrescription[]>({
    queryKey: ['prescriptions', 'mine'],
    queryFn: async () => {
      const { data } = await apiClient.get<PatientPrescription[]>('/clinical-records/prescriptions/mine');
      return Array.isArray(data) ? data : [];
    },
  });

  if (isLoading) {
    return <LoadingState message={t('prescriptions:loading', 'Cargando recetas...')} />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (prescriptions.length === 0) {
    return (
      <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <PageHeader
          title={t('prescriptions:title', 'Mis Recetas')}
          subtitle={t('prescriptions:subtitle', 'Consulta tus recetas médicas')}
        />
        <EmptyState
          icon={<MedicationIcon sx={{ fontSize: 48, color: theme.palette.divider }} />}
          title={t('prescriptions:empty_title', 'Sin recetas')}
          message={t('prescriptions:empty_desc', 'Aún no tienes recetas disponibles.')}
        />
      </MotionDiv>
    );
  }

  const withMeds = prescriptions.filter((p) => p.medications.length > 0);
  const totalMeds = prescriptions.reduce((s, p) => s + p.medications.length, 0);

  const statCards = [
    {
      label: t('prescriptions:total', 'Total Recetas'),
      value: prescriptions.length,
      icon: <Assignment sx={{ fontSize: 20, color: theme.palette.primary.main }} />,
      bg: theme.palette.custom.status.info.bg,
    },
    {
      label: t('prescriptions:with_medications', 'Con Medicamentos'),
      value: withMeds.length,
      icon: <MedicationIcon sx={{ fontSize: 20, color: theme.palette.success.main }} />,
      bg: theme.palette.custom.status.success.bg,
    },
    {
      label: t('prescriptions:total_medications', 'Medicamentos'),
      value: totalMeds,
      icon: <MedicationIcon sx={{ fontSize: 20, color: theme.palette.warning.main }} />,
      bg: theme.palette.custom.status.warning.bg,
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title={t('prescriptions:title', 'Mis Recetas')}
        subtitle={t('prescriptions:subtitle', 'Consulta tus recetas médicas')}
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statCards.map((stat) => (
          <Grid key={stat.label} xs={12} sm={4}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    textTransform="uppercase"
                    letterSpacing="0.3px"
                  >
                    {stat.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stat.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: stat.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {stat.icon}
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box display="flex" flexDirection="column" gap={1.5}>
        {prescriptions.map((prescription) => (
          <Paper
            key={prescription.clinical_record_id}
            sx={{
              p: 2,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              '&:hover': { boxShadow: 2 },
              transition: 'all 0.15s',
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Box flex={1}>
                <Typography fontWeight={600} gutterBottom>
                  {prescription.doctor_name
                    ? t('prescriptions:by_doctor', 'Receta — Dr. {{name}}', { name: prescription.doctor_name })
                    : t('prescriptions:by_doctor', 'Receta')}
                </Typography>
                <Box display="flex" gap={2} color="text.secondary" fontSize={13}>
                  <span>📅 {prescription.created_at ? format(new Date(prescription.created_at), 'dd MMM yyyy') : '-'}</span>
                </Box>
              </Box>
            </Box>

            {prescription.medications.length > 0 && (
              <Stack spacing={1} mt={2}>
                {prescription.medications.map((med) => (
                  <Paper
                    key={med.id ?? `${med.name}-${med.dosage}`}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      borderColor: theme.palette.divider,
                      backgroundColor: theme.palette.custom.surface.muted,
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                      <Box>
                        <Typography fontWeight={600} fontSize={14}>
                          {med.name}
                        </Typography>
                        <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                          <Chip size="small" label={`Dosis: ${med.dosage}`} sx={{ fontSize: 11 }} />
                          <Chip size="small" label={`Frecuencia: ${med.frequency}`} sx={{ fontSize: 11 }} />
                          {med.duration && (
                            <Chip size="small" label={`Duración: ${med.duration}`} sx={{ fontSize: 11 }} />
                          )}
                        </Box>
                        {med.instructions && (
                          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                            {t('prescriptions:instructions_label', 'Instrucciones')}: {med.instructions}
                          </Typography>
                        )}
                      </Box>
                      {med.id && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PictureAsPdf sx={{ color: theme.palette.error.main }} />}
                          onClick={() => prescriptionService.downloadPdf(med.id)}
                          sx={{ textTransform: 'none', borderColor: theme.palette.grey[300] }}
                        >
                          {t('prescriptions:download_pdf', 'Descargar PDF')}
                        </Button>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        ))}
      </Box>
    </MotionDiv>
  );
}