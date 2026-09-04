import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Button,
  Tabs,
  Tab,
  Skeleton,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DataTable, type DataTableColumn } from '@/shared/components/ui/DataTable';
import VerifiedIcon from '@mui/icons-material/Verified';
import MedicationIcon from '@mui/icons-material/Medication';
import { StatusBadge } from '../shared/StatusBadge';
import { type LabRequestItem, type LabRequestStatus } from '../../types/lab.types';

// ── Props ────────────────────────────────────────────────────────────────────

interface ValidationWorklistProps {
  items?: LabRequestItem[];
  onValidateTech?: (requestId: number, itemId: number) => void;
  onValidateDoctor?: (requestId: number, itemId: number) => void;
  currentRole?: 'technician' | 'doctor';
  isLoading?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const TECH_STATUSES: LabRequestStatus[] = ['result_entered'];
const DOCTOR_STATUSES: LabRequestStatus[] = ['validated_tech'];

// ── Component ────────────────────────────────────────────────────────────────

export const ValidationWorklist = memo(function ValidationWorklist({
  items = [],
  onValidateTech,
  onValidateDoctor,
  currentRole = 'technician',
  isLoading = false,
}: ValidationWorklistProps) {
  const theme = useTheme();
  const { t } = useTranslation('lab');
  const [tabIndex, setTabIndex] = useState(0);

  const techItems = useMemo(
    () => items.filter((item) => TECH_STATUSES.includes(item.status)),
    [items],
  );

  const doctorItems = useMemo(
    () => items.filter((item) => DOCTOR_STATUSES.includes(item.status)),
    [items],
  );

  const showTechTab = currentRole === 'technician';
  const showDoctorTab = currentRole === 'doctor';

  const displayItems = useMemo(() => {
    if (showTechTab && tabIndex === 0) return techItems;
    if (showDoctorTab && tabIndex === 1) return doctorItems;
    if (tabIndex === 0) return techItems;
    return doctorItems;
  }, [tabIndex, showTechTab, showDoctorTab, techItems, doctorItems]);

  if (isLoading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: '14px',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Skeleton variant="text" width="50%" height={28} />
        <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 2, borderRadius: '10px' }} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2, borderRadius: '10px' }} />
      </Paper>
    );
  }

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const columns: DataTableColumn<LabRequestItem>[] = [
    {
      key: 'test',
      header: t('lab:patientLabel', 'Paciente'),
      render: (item) => (
        <>
          <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
            {item.test?.name ?? `Test #${item.lab_test_id}`}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Solicitud #{item.lab_request_id}
          </Typography>
        </>
      ),
    },
    {
      key: 'test_name',
      header: t('lab:test', 'Test'),
      render: (item) => (
        <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
          {item.test_name ?? item.test?.name ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'result_value',
      header: t('lab:resultValue', 'Resultado'),
      render: (item) => (
        <>
          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {item.result_value ?? '—'}
          </Typography>
          {item.unit && (
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              {item.unit}
            </Typography>
          )}
        </>
      ),
    },
    {
      key: 'reference_range',
      header: t('lab:referenceRange', 'Referencia'),
      render: (item) => (
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          {item.reference_range ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: t('lab:status', 'Estado'),
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: t('lab:actions', 'Acciones'),
      render: (item) => {
        const isTechTab = tabIndex === 0;
        const canValidate =
          isTechTab
            ? item.status === 'result_entered'
            : item.status === 'validated_tech';

        if (!canValidate) return null;

        return (
          <Button
            variant="contained"
            size="small"
            startIcon={
              isTechTab ? <VerifiedIcon sx={{ fontSize: 16 }} /> : <MedicationIcon sx={{ fontSize: 16 }} />
            }
            onClick={() =>
              isTechTab
                ? onValidateTech?.(item.lab_request_id, item.id)
                : onValidateDoctor?.(item.lab_request_id, item.id)
            }
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              fontSize: '0.75rem',
              px: 2,
              py: 0.5,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.custom.brand.darker} 100%)`,
              },
            }}
          >
            {isTechTab ? 'Validar Técnico' : 'Validar Médico'}
          </Button>
        );
      },
    },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '14px',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Header */}
      <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 2 }}>
        Lista de Validación Pendiente
      </Typography>

      {/* Tabs */}
      <Tabs
        value={tabIndex}
        onChange={handleTabChange}
        sx={{
          mb: 2,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            minHeight: 44,
          },
          '& .MuiTabs-indicator': {
            backgroundColor: theme.palette.primary.main,
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        }}
      >
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VerifiedIcon sx={{ fontSize: 18 }} />
              Validación Técnica
              <Chip
                label={techItems.length}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor:
                    techItems.length > 0
                      ? `${theme.palette.warning.main}20`
                      : theme.palette.custom.surface.sunken,
                  color: techItems.length > 0 ? theme.palette.warning.dark : theme.palette.text.secondary,
                }}
              />
            </Box>
          }
          sx={{ opacity: 1 }}
        />
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicationIcon sx={{ fontSize: 18 }} />
              Validación Médica
              <Chip
                label={doctorItems.length}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor:
                    doctorItems.length > 0
                      ? `${theme.palette.info.main}20`
                      : theme.palette.custom.surface.sunken,
                  color: doctorItems.length > 0 ? theme.palette.info.dark : theme.palette.text.secondary,
                }}
              />
            </Box>
          }
          sx={{ opacity: 1 }}
        />
      </Tabs>

      {/* Table */}
      <DataTable<LabRequestItem>
        columns={columns}
        data={displayItems}
        keyExtractor={(item) => item.id}
        emptyTitle="No hay resultados pendientes de validación"
        rowsPerPage={displayItems.length || 1}
      />
    </Paper>
  );
});

export default ValidationWorklist;
