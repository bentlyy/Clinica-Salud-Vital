import { memo, useState, useCallback, useMemo } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  CircularProgress,
} from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LabSample } from '../../types/lab.types';
import { formatDate } from '@/shared/utils/localeUtils';
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

function getDaysColor(days: number, theme: Theme): { bg: string; text: string } {
  if (days < 7) return { bg: theme.palette.success.light, text: theme.palette.success.dark };
  if (days <= 30) return { bg: theme.palette.warning.light, text: theme.palette.warning.dark };
  return { bg: theme.palette.error.light, text: theme.palette.error.dark };
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
  const theme = useTheme();
  const { t } = useTranslation('lab');

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
          backgroundColor: theme.palette.custom.brand.light,
          borderRadius: '10px',
          border: `1px solid ${theme.palette.custom.brand.alpha8}`,
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
            backgroundColor: theme.palette.custom.brand.alpha12,
            color: theme.palette.primary.main,
          }}
        >
          <DeleteSweepIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main, lineHeight: 1.2 }}>
            {disposedThisMonth}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.primary.main, opacity: 0.8 }}>
            {t('disposedThisMonth')}
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
          backgroundColor: theme.palette.warning.light,
          borderRadius: '10px',
          border: `1px solid ${theme.palette.custom.status.warning.border}`,
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
            backgroundColor: theme.palette.custom.status.warning.bg,
            color: theme.palette.warning.main,
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.warning.dark, lineHeight: 1.2 }}>
            {pendingCount}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.warning.dark, opacity: 0.8 }}>
            {t('pendingDisposal')}
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
  const theme = useTheme();
  const { t } = useTranslation('lab');
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
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {t('sampleDisposal')}
          </Typography>
          {isLoading && <CircularProgress size={20} sx={{ color: theme.palette.primary.main }} />}
        </Box>

        <DisposalStats disposedThisMonth={disposedThisMonth} pendingCount={pendingCount} />

        {eligibleSamples.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 5,
              backgroundColor: theme.palette.action.hover,
              borderRadius: '10px',
              border: `1px dashed ${theme.palette.divider}`,
            }}
          >
            <DeleteSweepIcon sx={{ fontSize: 40, color: theme.palette.text.disabled, mb: 1 }} />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              {t('noEligibleSamples')}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
              <TableRow>
                <TableCell>{t('code')}</TableCell>
                <TableCell>{t('type')}</TableCell>
                <TableCell>{t('receptionDateLabel')}</TableCell>
                <TableCell>{t('daysStoredLabel')}</TableCell>
                <TableCell>{t('status')}</TableCell>
                <TableCell align="right">{t('actionsLabel')}</TableCell>
              </TableRow>
              </TableHead>
              <TableBody>
                {eligibleSamples.map((sample) => {
                  const days = daysStored(sample.reception_time);
                  const colors = getDaysColor(days, theme);

                  return (
                    <TableRow
                      key={sample.id}
                      sx={{
                        '&:hover': { backgroundColor: theme.palette.action.hover },
                      }}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: theme.palette.text.primary, fontFamily: 'monospace' }}
                        >
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
                          {sample.reception_time
                            ? formatDate(sample.reception_time)
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<ScheduleIcon sx={{ fontSize: 12 }} />}
                          label={`${days} ${t('days')}`}
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
                            backgroundColor: theme.palette.action.hover,
                            color: theme.palette.text.secondary,
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
                            borderColor: theme.palette.error.main,
                            color: theme.palette.error.main,
                            fontSize: '0.75rem',
                            '&:hover': {
                              backgroundColor: theme.palette.error.light,
                              borderColor: theme.palette.error.dark,
                            },
                          }}
                        >
                          {t('dispose')}
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
          <DialogTitle sx={{ fontWeight: 700, color: theme.palette.text.primary, pb: 1 }}>
            {t('confirmDisposalTitle')}
          </DialogTitle>

          <DialogContent sx={{ pt: 0 }}>
            {disposalDialog.sample && (
              <>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 2,
                    backgroundColor: theme.palette.error.light,
                    borderRadius: '10px',
                    border: `1px solid ${theme.palette.custom.status.error.border}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <WarningAmberIcon sx={{ fontSize: 18, color: theme.palette.error.dark }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.error.dark }}>
                      {t('irreversibleAction')}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {t('code')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary, fontFamily: 'monospace' }}>
                        {disposalDialog.sample.sample_code}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {t('type')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                        {getSampleTypeLabel(disposalDialog.sample.sample_type)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {t('receivedLabel')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                        {disposalDialog.sample.reception_time
                          ? formatDate(disposalDialog.sample.reception_time)
                          : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {t('daysStoredLabel')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                        {daysStored(disposalDialog.sample.reception_time)} {t('days')}
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
                      label={t('disposal_notes_required')}
                      fullWidth
                      multiline
                      rows={3}
                      error={!!errors.notes}
                      helperText={errors.notes?.message}
                      placeholder={t('disposal_notes_placeholder')}
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
              sx={{ color: theme.palette.text.secondary }}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : <DeleteForeverIcon sx={{ fontSize: 16 }} />}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.dark} 100%)`,
                },
              }}
            >
              {t('confirmDisposal')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
});
