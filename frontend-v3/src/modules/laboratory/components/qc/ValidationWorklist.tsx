import { memo, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Tabs,
  Tab,
  Skeleton,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import VerifiedIcon from '@mui/icons-material/Verified';
import MedicationIcon from '@mui/icons-material/Medication';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { StatusBadge } from '../shared/StatusBadge';
import { LAB_STATUS_LABELS, type LabRequestItem, type LabRequestStatus } from '../../types/lab.types';

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
  const [tabIndex, setTabIndex] = useState(0);

  const techItems = useMemo(
    () => items.filter((item) => TECH_STATUSES.includes(item.status)),
    [items],
  );

  const doctorItems = useMemo(
    () => items.filter((item) => DOCTOR_STATUSES.includes(item.status)),
    [items],
  );

  const activeItems = tabIndex === 0 ? techItems : doctorItems;
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
          border: '1px solid #e5e7eb',
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

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '14px',
        border: '1px solid #e5e7eb',
      }}
    >
      {/* Header */}
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937', mb: 2 }}>
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
            backgroundColor: '#0d9488',
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
                      : '#f3f4f6',
                  color: techItems.length > 0 ? theme.palette.warning.dark : '#9ca3af',
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
                      : '#f3f4f6',
                  color: doctorItems.length > 0 ? theme.palette.info.dark : '#9ca3af',
                }}
              />
            </Box>
          }
          sx={{ opacity: 1 }}
        />
      </Tabs>

      {/* Empty state */}
      {displayItems.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 6,
            gap: 1.5,
          }}
        >
          <InboxOutlinedIcon sx={{ fontSize: 48, color: '#d1d5db' }} />
          <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 500 }}>
            No hay resultados pendientes de validación
          </Typography>
        </Box>
      ) : (
        <TableContainer
          sx={{
            border: '1px solid #f3f4f6',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Paciente', 'Test', 'Resultado', 'Referencia', 'Estado', 'Acciones'].map(
                  (col) => (
                    <TableCell key={col}>{col}</TableCell>
                  ),
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayItems.map((item) => {
                const isTechTab = tabIndex === 0;
                const canValidate =
                  isTechTab
                    ? item.status === 'result_entered'
                    : item.status === 'validated_tech';

                return (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{
                      '&:last-child td': { borderBottom: 0 },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#1f2937' }}>
                        {item.test?.name ?? `Test #${item.lab_test_id}`}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Solicitud #{item.lab_request_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#374151' }}>
                        {item.test_name ?? item.test?.name ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                        {item.result_value ?? '—'}
                      </Typography>
                      {item.unit && (
                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                          {item.unit}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {item.reference_range ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      {canValidate && (
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
                            background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                            fontSize: '0.75rem',
                            px: 2,
                            py: 0.5,
                            '&:hover': {
                              background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                            },
                          }}
                        >
                          {isTechTab ? 'Validar Técnico' : 'Validar Médico'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
});

export default ValidationWorklist;
