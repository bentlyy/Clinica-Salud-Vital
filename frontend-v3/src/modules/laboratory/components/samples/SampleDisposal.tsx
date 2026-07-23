import { memo, useState, useCallback, useMemo } from 'react';
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  CircularProgress,
} from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LabSample } from '../../types/lab.types';
import { SAMPLE_TYPE_OPTIONS } from '../../types/lab.types';

// ── Schema ──────────────────────────────────────────────────────────────────

const disposalSchema = z.object({
  notes: z.string().min(10, 'Las notas deben tener al menos 10 caracteres'),
});

type DisposalFormValues = z.infer<typeof disposalSchema>;

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysStored(receptionTime: string | null): number {
  if (!receptionTime) return 0;
  const now = new Date();
  const received = new Date(receptionTime);
  return Math.floor((now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
}

function daysColor(days: number): { bg: string; text: string } {
  if (days < 7) return { bg: '#dcfce7', text: '#16a34a' };
  if (days <= 30) return { bg: '#fef3c7', text: '#d97706' };
  return { bg: '#fef2f2', text: '#dc2626' };
}

// ── Stats ───────────────────────────────────────────────────────────────────

interface DisposalStatsProps {
  disposedThisMonth: number;
  pendingCount: number;
}

const DisposalStats = memo(function DisposalStats({
  disposedThisMonth,
  pendingCount,
}: DisposalStatsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 2,
          backgroundColor: '#f0fdfa',
          borderRadius: '10px',
          border: '1px solid #0d948820',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: '10px',
            backgroundColor: '#0d948815',
            color: '#0d9488',
          }}
        >
          <DeleteSweepIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0d9488', lineHeight: 1.2 }}>
            {disposedThisMonth}
          </Typography>
          <Typography variant="caption" sx={{ color: '#0d9488', opacity: 0.8 }}>
            Dispuestas este mes
          </Typography>
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 2,
          backgroundColor: '#fef3c7',
          borderRadius: '10px',
          border: '1px solid #f59e0b20',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: '10px',
            backgroundColor: '#f59e0b15',
            color: '#f59e0b',
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#d97706', lineHeight: 1.2 }}>
            {pendingCount}
          </Typography>
          <Typography variant="caption" sx={{ color: '#d97706', opacity: 0.8 }}>
            Pendientes de disposición
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
});

// ── Props ───────────────────────────────────────────────────────────────────

interface SampleDisposalProps {
  samples?: LabSample[];
  onDispose: (id: number, notes: string) => void;
  isLoading?: boolean;
}

// ── Component ───────────────────────────────────────────────────────────────

export const SampleDisposal = memo(function SampleDisposal({
  samples = [],
  onDispose,
  isLoading = false,
}: SampleDisposalProps) {
  const [disposalDialog, setDisposalDialog] = useState<{
    open: boolean;
    sample: LabSample | null;
  }>({ open: false, sample: null });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DisposalFormValues>({
    resolver: zodResolver(disposalSchema),
    defaultValues: { notes: '' },
  });

  const eligibleSamples = useMemo(
    () =>
      samples.filter(
        (s) => s.status !== 'disposed' && s.status !== 'processing' && s.status !== 'assigned'
      ),
    [samples]
  );

  const disposedThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return samples.filter(
      (s) =>
        s.status === 'disposed' &&
        s.disposal_date &&
        new Date(s.disposal_date) >= startOfMonth
    ).length;
  }, [samples]);

  const pendingCount = eligibleSamples.filter((s) => daysStored(s.reception_time) > 7).length;

  const handleOpenDialog = useCallback((sample: LabSample) => {
    setDisposalDialog({ open: true, sample });
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDisposalDialog({ open: false, sample: null });
    reset();
  }, [reset]);

  const handleDisposeSubmit = (data: DisposalFormValues) => {
    if (disposalDialog.sample) {
      onDispose(disposalDialog.sample.id, data.notes);
      handleCloseDialog();
    }
  };

  const getSampleTypeLabel = (value: string) =>
    SAMPLE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: '14px',
          border: '1px solid #e5e7eb',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
            Disposición de Muestras
          </Typography>
          {isLoading && <CircularProgress size={20} sx={{ color: '#0d9488' }} />}
        </Box>

        <DisposalStats disposedThisMonth={disposedThisMonth} pendingCount={pendingCount} />

        {eligibleSamples.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 5,
              backgroundColor: '#f9fafb',
              borderRadius: '10px',
              border: '1px dashed #e5e7eb',
            }}
          >
            <DeleteSweepIcon sx={{ fontSize: 40, color: '#d1d5db', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              No hay muestras elegibles para disposición
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Fecha Recepción</TableCell>
                  <TableCell>Días Almacenada</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eligibleSamples.map((sample) => {
                  const days = daysStored(sample.reception_time);
                  const colors = daysColor(days);

                  return (
                    <TableRow
                      key={sample.id}
                      sx={{
                        '&:hover': { backgroundColor: '#f9fafb' },
                      }}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: '#1f2937', fontFamily: 'monospace' }}
                        >
                          {sample.sample_code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                          {getSampleTypeLabel(sample.sample_type)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                          {sample.reception_time
                            ? new Date(sample.reception_time).toLocaleDateString('es-CL')
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<ScheduleIcon sx={{ fontSize: 12 }} />}
                          label={`${days} días`}
                          size="small"
                          sx={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sample.status}
                          size="small"
                          sx={{
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                            fontWeight: 500,
                            fontSize: '0.7rem',
                            textTransform: 'capitalize',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DeleteForeverIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleOpenDialog(sample)}
                          disabled={isLoading}
                          sx={{
                            borderColor: '#ef4444',
                            color: '#ef4444',
                            fontSize: '0.75rem',
                            '&:hover': {
                              backgroundColor: '#fef2f2',
                              borderColor: '#dc2626',
                            },
                          }}
                        >
                          Disponer
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ── Disposal Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={disposalDialog.open}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '14px' },
        }}
      >
        <Box component="form" onSubmit={handleSubmit(handleDisposeSubmit)}>
          <DialogTitle sx={{ fontWeight: 700, color: '#1f2937', pb: 1 }}>
            Confirmar Disposición de Muestra
          </DialogTitle>

          <DialogContent sx={{ pt: 0 }}>
            {disposalDialog.sample && (
              <>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 2,
                    backgroundColor: '#fef2f2',
                    borderRadius: '10px',
                    border: '1px solid #fecaca',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <WarningAmberIcon sx={{ fontSize: 18, color: '#dc2626' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#dc2626' }}>
                      Esta acción es irreversible
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Código
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937', fontFamily: 'monospace' }}>
                        {disposalDialog.sample.sample_code}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Tipo
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
                        {getSampleTypeLabel(disposalDialog.sample.sample_type)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Recibida
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
                        {disposalDialog.sample.reception_time
                          ? new Date(disposalDialog.sample.reception_time).toLocaleDateString('es-CL')
                          : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Días Almacenada
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
                        {daysStored(disposalDialog.sample.reception_time)} días
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Notas de Disposición (obligatorio)"
                      fullWidth
                      multiline
                      rows={3}
                      error={!!errors.notes}
                      helperText={errors.notes?.message}
                      placeholder="Motivo de disposición, procedimiento aplicado, etc."
                    />
                  )}
                />
              </>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button
              onClick={handleCloseDialog}
              variant="text"
              sx={{ color: '#6b7280' }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : <DeleteForeverIcon sx={{ fontSize: 16 }} />}
              sx={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                },
              }}
            >
              Confirmar Disposición
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
});
