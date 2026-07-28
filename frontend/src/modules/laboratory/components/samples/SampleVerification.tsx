import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useTheme } from '@mui/material/styles';
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
  const theme = useTheme();
  const { t } = useTranslation('lab');
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
      {[
        {
          icon: <BiotechIcon sx={{ fontSize: 20 }} />,
          label: t('total'),
          value: total,
          bg: theme.palette.custom.brand.lightest,
          color: theme.palette.primary.main,
        },
        {
          icon: <VerifiedIcon sx={{ fontSize: 20 }} />,
          label: t('verified'),
          value: verified,
          bg: theme.palette.custom.status.success.bg,
          color: theme.palette.success.main,
        },
        {
          icon: <HourglassEmptyIcon sx={{ fontSize: 20 }} />,
          label: t('pendingVerification'),
          value: pending,
          bg: theme.palette.custom.status.warning.bg,
          color: theme.palette.warning.dark,
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
  const theme = useTheme();
  const { t } = useTranslation('lab');
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
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {t('verification')}
          </Typography>
          {isLoading && <CircularProgress size={20} sx={{ color: theme.palette.primary.main }} />}
        </Box>

        <StatsBar total={samples.length} verified={verifiedSamples.length} pending={pendingCount} />

        {receivedSamples.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 5,
              backgroundColor: theme.palette.custom.surface.muted,
              borderRadius: '10px',
              border: `1px dashed ${theme.palette.divider}`,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 40, color: theme.palette.divider, mb: 1 }} />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              {t('noPendingVerification')}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
              <TableRow>
                <TableCell>{t('code')}</TableCell>
                <TableCell>{t('type')}</TableCell>
                <TableCell>{t('container')}</TableCell>
                <TableCell>{t('volume')}</TableCell>
                <TableCell>{t('status')}</TableCell>
                <TableCell align="right">{t('actionsLabel')}</TableCell>
              </TableRow>
              </TableHead>
              <TableBody>
                {receivedSamples.map((sample) => (
                  <TableRow
                    key={sample.id}
                    sx={{ '&:hover': { backgroundColor: theme.palette.custom.surface.muted } }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary, fontFamily: 'monospace' }}>
                        {sample.sample_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {getSampleTypeLabel(sample.sample_type)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {getContainerTypeLabel(sample.container_type)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {sample.volume ? `${sample.volume} ml` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t('received')}
                        size="small"
                        sx={{
                          backgroundColor: theme.palette.custom.status.info.bg,
                          color: theme.palette.info.dark,
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
                            color: theme.palette.success.main,
                            '&:hover': { backgroundColor: theme.palette.custom.status.success.bg },
                          }}
                           title={t('verify')}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenReject(sample.id)}
                          disabled={isLoading}
                          sx={{
                            color: theme.palette.error.main,
                            '&:hover': { backgroundColor: theme.palette.custom.status.error.bg },
                          }}
                           title={t('reject')}
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
          <DialogTitle sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {t('rejectSampleDialog')}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
              {t('rejectReasonText')}
            </Typography>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('rejectReasonLabel')}
                  fullWidth
                  multiline
                  rows={3}
                  error={!!errors.reason}
                  helperText={errors.reason?.message}
                  placeholder={t('rejectReasonPlaceholder')}
                />
              )}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button
              onClick={handleCloseReject}
              variant="text"
              sx={{ color: theme.palette.text.secondary }}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.custom.status.error.text} 100%)`,
                },
              }}
            >
              {t('reject')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
});
