import { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Paper, Chip } from '@mui/material';
import Grid from '@mui/material/Grid';
import MedicationIcon from '@mui/icons-material/Medication';
import Assignment from '@mui/icons-material/Assignment';
import { useTranslation } from 'react-i18next';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { apiClient } from '@/shared/services/api-client';
import { format } from 'date-fns';

interface Medication {
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
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiClient
      .get<PatientPrescription[]>('/clinical-records/prescriptions/mine')
      .then(({ data }) => {
        if (active) setPrescriptions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setError(t('prescriptions:error_loading', 'Error al cargar las recetas'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  if (loading) {
    return <LoadingState message={t('prescriptions:loading', 'Cargando recetas...')} />;
  }

  if (error) {
    return <EmptyState title={error} message="" />;
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

      <Grid container spacing={2} sx={{ mb: 3 }}>
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
                {prescription.medications.length > 0 && (
                  <Box display="flex" gap={0.5} flexWrap="wrap" mt={1}>
                    {prescription.medications.map((med) => (
                      <Chip
                        key={`${med.name}-${med.dosage}`}
                        size="small"
                        label={`${med.name} ${med.dosage}`}
                        sx={{ fontSize: 11 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
    </MotionDiv>
  );
}
