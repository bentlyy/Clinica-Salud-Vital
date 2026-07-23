import { memo, useState, useCallback } from 'react';
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
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VerifiedIcon from '@mui/icons-material/Verified';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import BiotechIcon from '@mui/icons-material/Biotech';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LabSample } from '../../types/lab.types';
import { SAMPLE_TYPE_OPTIONS, CONTAINER_TYPE_OPTIONS } from '../../types/lab.types';

// ── Schema ──────────────────────────────────────────────────────────────────

const rejectSchema = z.object({
  reason: z.string().min(5, 'El motivo debe tener al menos 5 caracteres'),
});

type RejectFormValues = z.infer<typeof rejectSchema>;

// ── Stats ───────────────────────────────────────────────────────────────────

interface StatsBarProps {
  total: number;
  verified: number;
  pending: number;
}

const StatsBar = memo(function StatsBar({ total, verified, pending }: StatsBarProps) {
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
      {[
        {
          icon: <BiotechIcon sx={{ fontSize: 20 }} />,
          label: 'Total',
          value: total,
          bg: '#f0fdfa',
          color: '#0d9488',
        },
        {
          icon: <VerifiedIcon sx={{ fontSize: 20 }} />,
          label: 'Verificadas',
          value: verified,
          bg: '#dcfce7',
          color: '#16a34a',
        },
        {
          icon: <HourglassEmptyIcon sx={{ fontSize: 20 }} />,
          label: 'Pendientes',
          value: pending,
          bg: '#fef3c7',
          color: '#d97706',
        },
      ].map((stat) => (
        <Paper
          key={stat.label}
          elevation={0}
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            backgroundColor: stat.bg,
            borderRadius: '10px',
            border: `1px solid ${stat.color}20`,
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
              backgroundColor: `${stat.color}15`,
              color: stat.color,
            }}
          >
            {stat.icon}
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color, lineHeight: 1.2 }}>
              {stat.value}
            </Typography>
            <Typography variant="caption" sx={{ color: stat.color, opacity: 0.8 }}>
              {stat.label}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  );
});

// ── Props ───────────────────────────────────────────────────────────────────

interface SampleVerificationProps {
  samples?: LabSample[];
  onVerify: (id: number) => void;
  onReject: (id: number, reason: string) => void;
  isLoading?: boolean;
}

// ── Component ───────────────────────────────────────────────────────────────

export const SampleVerification = memo(function SampleVerification({
  samples = [],
  onVerify,
  onReject,
  isLoading = false,
}: SampleVerificationProps) {
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; sampleId: number | null }>({
    open: false,
    sampleId: null,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: '' },
  });

  const receivedSamples = samples.filter((s) => s.status === 'received');
  const verifiedSamples = samples.filter((s) => s.status === 'verified');
  const pendingCount = receivedSamples.length;

  const handleOpenReject = useCallback((sampleId: number) => {
    setRejectDialog({ open: true, sampleId });
  }, []);

  const handleCloseReject = useCallback(() => {
    setRejectDialog({ open: false, sampleId: null });
    reset();
  }, [reset]);

  const handleRejectSubmit = (data: RejectFormValues) => {
    if (rejectDialog.sampleId !== null) {
      onReject(rejectDialog.sampleId, data.reason);
      handleCloseReject();
    }
  };

  const getSampleTypeLabel = (value: string) =>
    SAMPLE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;

  const getContainerTypeLabel = (value: string) =>
    CONTAINER_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;

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
            Verificación de Muestras
          </Typography>
          {isLoading && <CircularProgress size={20} sx={{ color: '#0d9488' }} />}
        </Box>

        <StatsBar total={samples.length} verified={verifiedSamples.length} pending={pendingCount} />

        {receivedSamples.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 5,
              backgroundColor: '#f9fafb',
              borderRadius: '10px',
              border: '1px dashed #e5e7eb',
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 40, color: '#d1d5db', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              No hay muestras pendientes de verificación
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Contenedor</TableCell>
                  <TableCell>Volumen</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receivedSamples.map((sample) => (
                  <TableRow
                    key={sample.id}
                    sx={{ '&:hover': { backgroundColor: '#f9fafb' } }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937', fontFamily: 'monospace' }}>
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
                        {getContainerTypeLabel(sample.container_type)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {sample.volume ? `${sample.volume} ml` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label="Recibida"
                        size="small"
                        sx={{
                          backgroundColor: '#dbeafe',
                          color: '#2563eb',
                          fontWeight: 500,
                          fontSize: '0.7rem',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <IconButton
                          size="small"
                          onClick={() => onVerify(sample.id)}
                          disabled={isLoading}
                          sx={{
                            color: '#16a34a',
                            '&:hover': { backgroundColor: '#dcfce7' },
                          }}
                          title="Verificar"
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenReject(sample.id)}
                          disabled={isLoading}
                          sx={{
                            color: '#ef4444',
                            '&:hover': { backgroundColor: '#fef2f2' },
                          }}
                          title="Rechazar"
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={handleCloseReject}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '14px' },
        }}
      >
        <Box component="form" onSubmit={handleSubmit(handleRejectSubmit)}>
          <DialogTitle sx={{ fontWeight: 700, color: '#1f2937' }}>
            Rechazar Muestra
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
              Ingrese el motivo del rechazo. Esta acción no se puede deshacer.
            </Typography>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Motivo del Rechazo"
                  fullWidth
                  multiline
                  rows={3}
                  error={!!errors.reason}
                  helperText={errors.reason?.message}
                  placeholder="Describa el motivo del rechazo..."
                />
              )}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button
              onClick={handleCloseReject}
              variant="text"
              sx={{ color: '#6b7280' }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                },
              }}
            >
              Rechazar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
});
