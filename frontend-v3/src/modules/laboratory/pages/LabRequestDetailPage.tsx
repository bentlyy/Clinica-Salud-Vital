import { useState, memo, useCallback } from 'react';
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
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ArrowBack from '@mui/icons-material/ArrowBack';
import CheckCircle from '@mui/icons-material/CheckCircle';
import LocalShipping from '@mui/icons-material/LocalShipping';
import Science from '@mui/icons-material/Science';
import Edit from '@mui/icons-material/Edit';
import Verified from '@mui/icons-material/Verified';
import Medication from '@mui/icons-material/Medication';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { useAuth } from '@/shared/providers/AuthProvider';
import {
  useLabRequestDetail,
  useLabRequestItems,
  useEnterResult,
  useValidateTech,
  useValidateDoctor,
  useDeliverResult,
  useSamples,
} from '../hooks/useLab';
import { LabResultsForm } from '../components/LabResultsForm';
import { LAB_STATUS_CONFIG, LAB_PRIORITY_CONFIG, LAB_STATUS_FLOW, LAB_STATUS_LABELS } from '../types/lab.types';
import type { AddLabResultsInput, LabRequestItem, LabSample } from '../types/lab.types';

function LabRequestDetailPageInner() {
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

  const { data: items, isLoading: itemsLoading } = useLabRequestItems(requestId);
  const { data: samples, isLoading: samplesLoading } = useSamples({ requestId });

  const enterResultMutation = useEnterResult();
  const validateTechMutation = useValidateTech();
  const validateDoctorMutation = useValidateDoctor();
  const deliverMutation = useDeliverResult();

  const isDoctor = user?.role === 'doctor';

  const handleAddResults = useCallback((_data: AddLabResultsInput) => {
    setResultsDialogOpen(false);
  }, []);

  const handleValidateTech = useCallback(
    (itemId: number) => {
      validateTechMutation.mutate({ requestId, itemId });
    },
    [validateTechMutation, requestId],
  );

  const handleValidateDoctor = useCallback(
    (itemId: number) => {
      validateDoctorMutation.mutate({ requestId, itemId });
    },
    [validateDoctorMutation, requestId],
  );

  const handleDeliver = useCallback(
    (itemId: number) => {
      deliverMutation.mutate({ requestId, itemId });
    },
    [deliverMutation, requestId],
  );

  if (requestLoading) return <LoadingState message="Cargando solicitud..." />;
  if (requestError) return <ErrorState error={requestError as Error} onRetry={() => void refetchRequest()} />;
  if (!request) return <ErrorState variant="notFound" />;

  const statusCfg = LAB_STATUS_CONFIG[request.status];
  const priorityCfg = LAB_PRIORITY_CONFIG[request.priority];

  const canAddResults = user && (user.role === 'doctor' || user.role === 'lab_technician' || user.role === 'admin' || user.role === 'superadmin');
  const canValidateTech = user && (user.role === 'lab_technician' || user.role === 'admin' || user.role === 'superadmin');
  const canValidateDoctor = user && (user.role === 'doctor' || user.role === 'admin' || user.role === 'superadmin');
  const canDeliver = user && (user.role === 'lab_technician' || user.role === 'admin' || user.role === 'superadmin');

  const activeItems: LabRequestItem[] = items ?? request.items ?? [];
  const activeSamples: LabSample[] = samples ?? [];

  // Status timeline
  const currentStepIndex = LAB_STATUS_FLOW.indexOf(request.status);

  return (
    <Box>
      <PageHeader
        title={request.request_number || `Solicitud #${request.id}`}
        subtitle={`${request.patient_name || ''} — ${request.doctor_name || ''}`}
        action={
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/laboratory/requests')}
            sx={{ color: '#6b7280' }}
          >
            Volver
          </Button>
        }
      />

      {/* Status Timeline */}
      <Paper sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb', overflowX: 'auto' }}>
        <Stepper
          activeStep={currentStepIndex >= 0 ? currentStepIndex : 0}
          alternativeLabel
          sx={{
            '& .MuiStepLabel-label': {
              fontSize: '0.7rem',
              fontWeight: 500,
              color: '#6b7280',
            },
            '& .MuiStepLabel-label.Mui-active': {
              color: '#0d9488',
              fontWeight: 700,
            },
            '& .MuiStepLabel-label.Mui-completed': {
              color: '#059669',
            },
            '& .MuiStepIcon-root': {
              color: '#e5e7eb',
            },
            '& .MuiStepIcon-root.Mui-active': {
              color: '#0d9488',
            },
            '& .MuiStepIcon-root.Mui-completed': {
              color: '#059669',
            },
          }}
        >
          {LAB_STATUS_FLOW.map((status) => (
            <Step key={status}>
              <StepLabel>{LAB_STATUS_LABELS[status]}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Request Info + Actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, border: '1px solid #e5e7eb' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1f2937' }}>
              Informacion de la Solicitud
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
                  Fecha de Creacion
                </Typography>
                <Typography variant="body2" sx={{ color: '#374151' }}>
                  {new Date(request.created_at).toLocaleString('es-CL')}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase' }}>
                  Ultima Actualizacion
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
              {canValidateTech && activeItems.some((i) => i.status === 'result_entered') && (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Verified />}
                  onClick={() => {
                    const item = activeItems.find((i) => i.status === 'result_entered');
                    if (item) handleValidateTech(item.id);
                  }}
                  disabled={validateTechMutation.isPending}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  {validateTechMutation.isPending ? 'Validando...' : 'Validar Tecnico'}
                </Button>
              )}
              {canValidateDoctor && activeItems.some((i) => i.status === 'validated_tech') && (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Medication />}
                  onClick={() => {
                    const item = activeItems.find((i) => i.status === 'validated_tech');
                    if (item) handleValidateDoctor(item.id);
                  }}
                  disabled={validateDoctorMutation.isPending}
                  sx={{ justifyContent: 'flex-start', background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', '&:hover': { background: 'linear-gradient(135deg, #115e59 0%, #134e4a 100%)' } }}
                >
                  {validateDoctorMutation.isPending ? 'Validando...' : 'Validar Medico'}
                </Button>
              )}
              {canDeliver && activeItems.some((i) => i.status === 'validated_doctor' || i.status === 'signed') && (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<LocalShipping />}
                  onClick={() => {
                    const item = activeItems.find((i) => i.status === 'validated_doctor' || i.status === 'signed');
                    if (item) handleDeliver(item.id);
                  }}
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

      {/* Sample Management */}
      <Paper sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1f2937' }}>
          Muestras
        </Typography>
        {samplesLoading ? (
          <LoadingState message="Cargando muestras..." />
        ) : activeSamples.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Codigo</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Recepcion</TableCell>
                  <TableCell>Ubicacion</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activeSamples.map((sample) => (
                  <TableRow key={sample.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                        {sample.sample_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#374151' }}>
                        {sample.sample_type}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sample.status}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: sample.status === 'completed' ? '#ecfdf5' : '#eff6ff',
                          color: sample.status === 'completed' ? '#059669' : '#2563eb',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {sample.reception_time
                          ? new Date(sample.reception_time).toLocaleString('es-CL')
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {sample.storage_location || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3, border: '2px dashed #e5e7eb', borderRadius: '14px' }}>
            <Science sx={{ fontSize: 32, color: '#d1d5db', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              No hay muestras registradas para esta solicitud
            </Typography>
          </Box>
        )}
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Results Table */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
        Resultados de Laboratorio
      </Typography>

      {itemsLoading ? (
        <LoadingState message="Cargando items..." />
      ) : activeItems && activeItems.length > 0 ? (
        <TableContainer component={Paper} sx={{ border: '1px solid #e5e7eb' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Test</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Unidad</TableCell>
                <TableCell>Rango Ref.</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Validacion</TableCell>
                <TableCell>Notas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeItems.map((item: LabRequestItem) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#1f2937' }}>
                      {item.test_name || item.test?.name || `Test #${item.lab_test_id}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                      {item.result_value || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      {item.unit || item.test?.unit || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      {item.reference_range || item.test?.reference_min != null ? `${item.test?.reference_min ?? ''}–${item.test?.reference_max ?? ''}` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={LAB_STATUS_LABELS[item.status] || item.status || 'Pendiente'}
                      size="small"
                      sx={{
                        backgroundColor: item.status === 'validated_doctor' || item.status === 'delivered' ? '#ecfdf5' : item.status === 'result_entered' ? '#eff6ff' : '#fffbeb',
                        color: item.status === 'validated_doctor' || item.status === 'delivered' ? '#059669' : item.status === 'result_entered' ? '#2563eb' : '#d97706',
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {item.validated_at_tech && (
                        <Chip
                          label="Tecnico"
                          size="small"
                          icon={<Verified sx={{ fontSize: 14 }} />}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                          }}
                        />
                      )}
                      {item.validated_at_doctor && (
                        <Chip
                          label="Medico"
                          size="small"
                          icon={<Medication sx={{ fontSize: 14 }} />}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      {item.result_notes || item.notes || '—'}
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
            isLoading={enterResultMutation.isPending}
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

const LabRequestDetailPage = memo(LabRequestDetailPageInner);
export default LabRequestDetailPage;
