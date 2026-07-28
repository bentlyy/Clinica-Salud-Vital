import { useState, memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
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
import LocalShipping from '@mui/icons-material/LocalShipping';
import Science from '@mui/icons-material/Science';
import Edit from '@mui/icons-material/Edit';
import { formatDateTime } from '@/shared/utils/localeUtils';
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
  const { t } = useTranslation('lab_request_detail');
  const { user } = useAuth();
  const theme = useTheme();
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

  if (requestLoading) return <LoadingState message={t('loading')} />;
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
        title={request.request_number || t('request_number', { id: request.id })}
        subtitle={`${request.patient_name || ''} — ${request.doctor_name || ''}`}
        action={
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/laboratory/requests')}
            sx={{ color: theme.palette.text.secondary }}
          >
            {t('back')}
          </Button>
        }
      />

      {/* Status Timeline */}
      <Paper sx={{ p: 3, mb: 3, border: `1px solid ${theme.palette.divider}`, overflowX: 'auto' }}>
        <Stepper
          activeStep={currentStepIndex >= 0 ? currentStepIndex : 0}
          alternativeLabel
          sx={{
            '& .MuiStepLabel-label': {
              fontSize: '0.7rem',
              fontWeight: 500,
              color: theme.palette.text.secondary,
            },
            '& .MuiStepLabel-label.Mui-active': {
              color: theme.palette.primary.main,
              fontWeight: 700,
            },
            '& .MuiStepLabel-label.Mui-completed': {
              color: theme.palette.custom.status.success.text,
            },
            '& .MuiStepIcon-root': {
              color: theme.palette.divider,
            },
            '& .MuiStepIcon-root.Mui-active': {
              color: theme.palette.primary.main,
            },
            '& .MuiStepIcon-root.Mui-completed': {
              color: theme.palette.custom.status.success.text,
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
        <Grid xs={12} md={8}>
          <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
              {t('info_title')}
            </Typography>
            <Grid container spacing={2}>
              <Grid xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase' }}>
                  {t('patient')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                  {request.patient_name || t('patient_fallback', { id: request.patient_id })}
                </Typography>
              </Grid>
              <Grid xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase' }}>
                  {t('doctor')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                  {request.doctor_name || t('doctor_fallback', { id: request.doctor_id })}
                </Typography>
              </Grid>
              <Grid xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase' }}>
                  {t('status')}
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
              <Grid xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase' }}>
                  {t('priority')}
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
              <Grid xs={12}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase' }}>
                  {t('notes')}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.primary, mt: 0.5 }}>
                  {request.notes || t('no_notes')}
                </Typography>
              </Grid>
              <Grid xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase' }}>
                  {t('created_at')}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                  {formatDateTime(request.created_at)}
                </Typography>
              </Grid>
              <Grid xs={12} sm={6}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase' }}>
                  {t('updated_at')}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                  {formatDateTime(request.updated_at)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Actions */}
        <Grid xs={12} md={4}>
          <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
              {t('actions')}
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
                  {t('add_results')}
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
                  {validateTechMutation.isPending ? t('validating') : t('validate_tech')}
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
                  sx={{ justifyContent: 'flex-start', background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.custom.brand.darker} 100%)`, '&:hover': { background: `linear-gradient(135deg, ${theme.palette.custom.brand.darker} 0%, ${theme.palette.custom.brand.darker} 100%)` } }}
                >
                  {validateDoctorMutation.isPending ? t('validating') : t('validate_doctor')}
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
                    background: `linear-gradient(135deg, ${theme.palette.custom.status.success.text} 0%, ${theme.palette.success.dark} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.success.dark} 0%, ${theme.palette.custom.status.success.text} 100%)`,
                    },
                  }}
                >
                  {deliverMutation.isPending ? t('delivering') : t('mark_delivered')}
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Sample Management */}
      <Paper sx={{ p: 3, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
          {t('samples')}
        </Typography>
        {samplesLoading ? (
          <LoadingState message={t('loading_samples')} />
        ) : activeSamples.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('col_code')}</TableCell>
                  <TableCell>{t('col_type')}</TableCell>
                  <TableCell>{t('col_status')}</TableCell>
                  <TableCell>{t('col_reception')}</TableCell>
                  <TableCell>{t('col_location')}</TableCell>
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
                      <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
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
                          backgroundColor: sample.status === 'completed' ? theme.palette.custom.status.success.bg : theme.palette.custom.status.info.bg,
                          color: sample.status === 'completed' ? theme.palette.custom.status.success.text : theme.palette.info.dark,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {sample.reception_time
                          ? formatDateTime(sample.reception_time)
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {sample.storage_location || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3, border: `2px dashed ${theme.palette.divider}`, borderRadius: '14px' }}>
            <Science sx={{ fontSize: 32, color: theme.palette.divider, mb: 1 }} />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              {t('no_samples')}
            </Typography>
          </Box>
        )}
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Results Table */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
        {t('results_title')}
      </Typography>

      {itemsLoading ? (
        <LoadingState message={t('loading_items')} />
      ) : activeItems && activeItems.length > 0 ? (
        <TableContainer component={Paper} sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('col_test')}</TableCell>
                <TableCell>{t('col_value')}</TableCell>
                <TableCell>{t('col_unit')}</TableCell>
                <TableCell>{t('col_reference')}</TableCell>
                <TableCell>{t('col_status')}</TableCell>
                <TableCell>{t('col_validation')}</TableCell>
                <TableCell>{t('col_notes')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeItems.map((item: LabRequestItem) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                      {item.test_name || item.test?.name || `Test #${item.lab_test_id}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      {item.result_value || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                      {item.unit || item.test?.unit || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                      {item.reference_range || item.test?.reference_min != null ? `${item.test?.reference_min ?? ''}–${item.test?.reference_max ?? ''}` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={LAB_STATUS_LABELS[item.status] || item.status || t('pending')}
                      size="small"
                      sx={{
                        backgroundColor: item.status === 'validated_doctor' || item.status === 'delivered' ? theme.palette.custom.status.success.bg : item.status === 'result_entered' ? theme.palette.custom.status.info.bg : theme.palette.custom.status.warning.bg,
                        color: item.status === 'validated_doctor' || item.status === 'delivered' ? theme.palette.custom.status.success.text : item.status === 'result_entered' ? theme.palette.info.dark : theme.palette.warning.dark,
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {item.validated_at_tech && (
                        <Chip
                          label={t('validated_tech')}
                          size="small"
                          icon={<Verified sx={{ fontSize: 14 }} />}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            backgroundColor: theme.palette.custom.status.success.bg,
                            color: theme.palette.custom.status.success.text,
                          }}
                        />
                      )}
                      {item.validated_at_doctor && (
                        <Chip
                          label={t('validated_doctor')}
                          size="small"
                          icon={<Medication sx={{ fontSize: 14 }} />}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            backgroundColor: theme.palette.custom.status.info.bg,
                            color: theme.palette.info.dark,
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
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
            border: `2px dashed ${theme.palette.divider}`,
          }}
        >
          <Science sx={{ fontSize: 40, color: theme.palette.divider, mb: 1 }} />
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {t('no_results')}
          </Typography>
          {canAddResults && (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setResultsDialogOpen(true)}
              sx={{ mt: 2 }}
            >
              {t('add_results')}
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
          {t('dialog_title', { number: request.request_number || `#${request.id}` })}
        </DialogTitle>
        <DialogContent>
          <LabResultsForm
            onSubmit={handleAddResults}
            isLoading={enterResultMutation.isPending}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResultsDialogOpen(false)} sx={{ color: theme.palette.text.secondary }}>
            {t('cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const LabRequestDetailPage = memo(LabRequestDetailPageInner);
export default LabRequestDetailPage;
