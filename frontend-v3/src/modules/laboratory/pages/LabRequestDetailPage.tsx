import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ArrowBack from '@mui/icons-material/ArrowBack';
import CheckCircle from '@mui/icons-material/CheckCircle';
import LocalShipping from '@mui/icons-material/LocalShipping';
import Science from '@mui/icons-material/Science';
import Edit from '@mui/icons-material/Edit';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { useAuth } from '@/shared/providers/AuthProvider';
import {
  useLabRequestDetail,
  useUpdateItemResult,
  useValidateItemTech,
  useValidateItemDoctor,
  useDeliverItem,
} from '../hooks/useLab';
import { LabResultsForm } from '../components/LabResultsForm';
import { LAB_STATUS_CONFIG, LAB_PRIORITY_CONFIG } from '../types/lab.types';
import type { AddLabResultsInput } from '../types/lab.types';

export default function LabRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const requestId = Number(id);

  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);

  const {
    data: request,
    isLoading: requestLoading,
    error: requestError,
    refetch: refetchRequest,
  } = useLabRequestDetail(requestId);

  const addResultsMutation = useUpdateItemResult();
  const validateTechMutation = useValidateItemTech();
  const validateDoctorMutation = useValidateItemDoctor();
  const deliverMutation = useDeliverItem();

  const isDoctor = user?.role === 'doctor';
  const validateMutation = isDoctor ? validateDoctorMutation : validateTechMutation;

  if (requestLoading) return <LoadingState message="Cargando solicitud..." />;
  if (requestError) return <ErrorState error={requestError as Error} onRetry={() => void refetchRequest()} />;
  if (!request) return <ErrorState variant="notFound" />;

  const statusCfg = LAB_STATUS_CONFIG[request.status];
  const priorityCfg = LAB_PRIORITY_CONFIG[request.priority];

  const canAddResults = user && (user.role === 'doctor' || user.role === 'lab_technician' || user.role === 'admin' || user.role === 'superadmin');
  const canValidate = user && (user.role === 'doctor' || user.role === 'admin' || user.role === 'superadmin');
  const canDeliver = user && (user.role === 'lab_technician' || user.role === 'admin' || user.role === 'superadmin');

  const handleAddResults = (_data: AddLabResultsInput) => {
    setResultsDialogOpen(false);
  };

  const handleValidate = () => {
    if (request?.items?.[0]) {
      validateMutation.mutate(request.items[0].id);
    }
  };

  const handleDeliver = () => {
    if (request?.items?.[0]) {
      deliverMutation.mutate(request.items[0].id);
    }
  };

  return (
    <Box>
      <PageHeader
        title={request.request_number || `Solicitud #${request.id}`}
        subtitle={`${request.patient_name || ''} — ${request.doctor_name || ''}`}
        action={
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/laboratory')}
            sx={{ color: '#6b7280' }}
          >
            Volver
          </Button>
        }
      />

      {/* Request Info */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, border: '1px solid #e5e7eb' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1f2937' }}>
              Información de la Solicitud
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase' }}>
                  Paciente
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#1f2937' }}>
                  {request.patient_name || `Paciente #${request.patient_id}`}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase' }}>
                  Doctor
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#1f2937' }}>
                  {request.doctor_name || `Doctor #${request.doctor_id}`}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase' }}>
                  Estado
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={statusCfg.label}
                    sx={{
                      backgroundColor: statusCfg.bgColor,
                      color: statusCfg.color,
                      fontWeight: 500,
                    }}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase' }}>
                  Prioridad
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={priorityCfg.label}
                    sx={{
                      backgroundColor: priorityCfg.bgColor,
                      color: priorityCfg.color,
                      fontWeight: 500,
                    }}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase' }}>
                  Notas
                </Typography>
                <Typography variant="body2" sx={{ color: '#374151', mt: 0.5 }}>
                  {request.notes || 'Sin notas'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase' }}>
                  Fecha de Creación
                </Typography>
                <Typography variant="body2" sx={{ color: '#374151' }}>
                  {new Date(request.created_at).toLocaleString('es-CL')}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase' }}>
                  Última Actualización
                </Typography>
                <Typography variant="body2" sx={{ color: '#374151' }}>
                  {new Date(request.updated_at).toLocaleString('es-CL')}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Actions */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, border: '1px solid #e5e7eb' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1f2937' }}>
              Acciones
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {canAddResults && request.status !== 'cancelled' && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Science />}
                  onClick={() => setResultsDialogOpen(true)}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Agregar Resultados
                </Button>
              )}
              {canValidate && request.status === 'completed' && (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<CheckCircle />}
                  onClick={handleValidate}
                  disabled={validateMutation.isPending}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  {validateMutation.isPending ? 'Validando...' : 'Validar Resultados'}
                </Button>
              )}
              {canDeliver && request.status === 'completed' && (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<LocalShipping />}
                  onClick={handleDeliver}
                  disabled={deliverMutation.isPending}
                  sx={{
                    justifyContent: 'flex-start',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
                    },
                  }}
                >
                  {deliverMutation.isPending ? 'Entregando...' : 'Marcar como Entregado'}
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Results Table */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
        Resultados de Laboratorio
      </Typography>

      {request.items && request.items.length > 0 ? (
        <TableContainer component={Paper} sx={{ border: '1px solid #e5e7eb' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Test</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Unidad</TableCell>
                <TableCell>Rango Ref.</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Notas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {request.items.map((item: any) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#1f2937' }}>
                      {item.test_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                      {item.result_value || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      {item.unit || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      {item.reference_ranges ? (typeof item.reference_ranges === 'string' ? item.reference_ranges : JSON.stringify(item.reference_ranges)) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.status || 'Pendiente'}
                      size="small"
                      sx={{
                        backgroundColor: item.status === 'completed' ? '#ecfdf5' : '#fffbeb',
                        color: item.status === 'completed' ? '#059669' : '#d97706',
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      {item.result_notes || '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            border: '2px dashed #e5e7eb',
          }}
        >
          <Science sx={{ fontSize: 40, color: '#d1d5db', mb: 1 }} />
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            No hay resultados registrados para esta solicitud
          </Typography>
          {canAddResults && (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setResultsDialogOpen(true)}
              sx={{ mt: 2 }}
            >
              Agregar Resultados
            </Button>
          )}
        </Paper>
      )}

      {/* Add Results Dialog */}
      <Dialog
        open={resultsDialogOpen}
        onClose={() => setResultsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Agregar Resultados — {request.request_number || `#${request.id}`}
        </DialogTitle>
        <DialogContent>
          <LabResultsForm
            onSubmit={handleAddResults}
            isLoading={addResultsMutation.isPending}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResultsDialogOpen(false)} sx={{ color: '#6b7280' }}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
