import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import Schedule from '@mui/icons-material/Schedule';
import EventBusy from '@mui/icons-material/EventBusy';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/shared/utils/localeUtils';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import {
  useAvailabilityRules,
  useCreateAvailabilityRule,
  useDeleteAvailabilityRule,
  useAvailabilityExceptions,
  useCreateAvailabilityException,
  useDeleteAvailabilityException,
} from '../hooks/useAvailability';
import { AvailabilityGrid } from '../components/AvailabilityGrid';
import { DAY_NAMES, WEEK_DAYS_ORDER } from '../types/availability.types';

const MotionBox = motion(Box);

function createRuleSchema(t: (key: string) => string) {
  return z
    .object({
      day_of_week: z
        .array(z.number().min(0).max(6))
        .min(1, t('select_at_least_one_day')),
      start_time: z.string().min(1, t('select_start_time')),
      end_time: z.string().min(1, t('select_end_time')),
    })
    .refine(
      (data) => {
        if (!data.start_time || !data.end_time) return true;
        return data.start_time < data.end_time;
      },
      {
        message: t('end_time_after_start'),
        path: ['end_time'],
      },
    );
}

function createExceptionSchema(t: (key: string) => string) {
  return z.object({
    date: z.string().min(1, t('select_date')),
    reason: z.string().min(1, t('enter_reason')),
  });
}

type RuleFormData = z.infer<ReturnType<typeof createRuleSchema>>;
type ExceptionFormData = z.infer<ReturnType<typeof createExceptionSchema>>;

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

export default function AvailabilityPage() {
  const { t } = useTranslation('availability');
  const theme = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteExceptionConfirmId, setDeleteExceptionConfirmId] = useState<number | null>(null);

  const { data: rules, isLoading, isError, error, refetch } = useAvailabilityRules();
  const createMutation = useCreateAvailabilityRule();
  const deleteMutation = useDeleteAvailabilityRule();

  const { data: exceptions, isLoading: isLoadingExceptions } = useAvailabilityExceptions();
  const createExceptionMutation = useCreateAvailabilityException();
  const deleteExceptionMutation = useDeleteAvailabilityException();

  const ruleSchema = useMemo(() => createRuleSchema(t), [t]);
  const exceptionSchema = useMemo(() => createExceptionSchema(t), [t]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RuleFormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      day_of_week: [],
      start_time: '08:00',
      end_time: '12:00',
    },
  });

  const {
    control: exceptionControl,
    handleSubmit: handleExceptionSubmit,
    reset: resetException,
    formState: { errors: exceptionErrors },
  } = useForm<ExceptionFormData>({
    resolver: zodResolver(exceptionSchema),
    defaultValues: {
      date: '',
      reason: '',
    },
  });

  const handleOpenDialog = useCallback(() => {
    reset({ day_of_week: [], start_time: '08:00', end_time: '12:00' });
    setDialogOpen(true);
  }, [reset]);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    reset();
  }, [reset]);

  const onSubmit = useCallback(
    (data: RuleFormData) => {
      const promises = data.day_of_week.map((day) =>
        createMutation.mutateAsync({
          day_of_week: day,
          start_time: data.start_time,
          end_time: data.end_time,
        }),
      );

      void Promise.all(promises).then(() => {
        handleCloseDialog();
      });
    },
    [createMutation, handleCloseDialog],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirmId !== null) {
      deleteMutation.mutate(deleteConfirmId, {
        onSuccess: () => {
          setDeleteConfirmId(null);
        },
      });
    }
  }, [deleteConfirmId, deleteMutation]);

  const onSubmitException = useCallback(
    (data: ExceptionFormData) => {
      createExceptionMutation.mutate(
        { date: data.date, is_full_day: true, reason: data.reason },
        {
          onSuccess: () => {
            resetException();
            setExceptionDialogOpen(false);
          },
        },
      );
    },
    [createExceptionMutation, resetException],
  );

  const handleDeleteExceptionConfirm = useCallback(() => {
    if (deleteExceptionConfirmId !== null) {
      deleteExceptionMutation.mutate(deleteExceptionConfirmId, {
        onSuccess: () => {
          setDeleteExceptionConfirmId(null);
        },
      });
    }
  }, [deleteExceptionConfirmId, deleteExceptionMutation]);

  if (isLoading) return <LoadingState message={t('loading_schedules')} />;
  if (isError) return <ErrorState error={error as Error} onRetry={refetch} />;

  const rulesList = rules ?? [];

  return (
    <MotionBox
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title={t('my_schedules')}
        subtitle={t('config_subtitle')}
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenDialog}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.custom.brand.darker} 100%)`,
              },
              px: 3,
              py: 1,
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            {t('add_schedule')}
          </Button>
        }
      />

      {rulesList.length === 0 ? (
        <EmptyState
          icon={<Schedule sx={{ fontSize: 48, color: theme.palette.divider }} />}
          title={t('empty_title')}
          message={t('empty_message')}
          action={{
            label: t('add_schedule'),
            onClick: handleOpenDialog,
          }}
        />
      ) : (
        <Box
          sx={{
            p: 3,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '12px',
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <AvailabilityGrid rules={rulesList} onDelete={(id) => setDeleteConfirmId(id)} />
        </Box>
      )}

      {/* Exceptions section */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {t('exceptions_title')}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => {
              resetException({ date: '', reason: '' });
              setExceptionDialogOpen(true);
            }}
            sx={{ borderColor: theme.palette.divider, color: theme.palette.text.primary, textTransform: 'none' }}
          >
            {t('add_exception')}
          </Button>
        </Box>

        {isLoadingExceptions ? (
          <LoadingState message={t('loading_exceptions')} />
        ) : exceptions && exceptions.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {exceptions.map((ex) => (
              <Chip
                key={ex.id}
                icon={<EventBusy />}
                label={`${formatDate(new Date(ex.date + 'T00:00:00'), { weekday: 'short', day: 'numeric', month: 'short' })} — ${ex.reason}`}
                onDelete={() => setDeleteExceptionConfirmId(ex.id)}
                sx={{
                  backgroundColor: theme.palette.custom.status.error.bg,
                  color: theme.palette.error.dark,
                  '& .MuiChip-deleteIcon': { color: theme.palette.error.main },
                }}
              />
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>
            {t('no_exceptions')}
          </Typography>
        )}
      </Box>

      {/* Create dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '14px', border: `1px solid ${theme.palette.divider}` } }}
      >
        <DialogTitle>
          <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {t('new_schedule')}
          </Typography>
        </DialogTitle>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Day picker (multi-select) */}
              <Controller
                name="day_of_week"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.day_of_week}>
                    <InputLabel>{t('days_of_week')}</InputLabel>
                    <Select
                      multiple
                      value={field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(typeof value === 'string' ? value.split(',').map(Number) : value);
                      }}
                      input={<OutlinedInput label={t('days_of_week')} />}
                      renderValue={(selected) =>
                        (selected as number[])
                          .map((d) => DAY_NAMES[d])
                          .join(', ')
                      }
                    >
                      {WEEK_DAYS_ORDER.map((dayIndex) => (
                        <MenuItem key={dayIndex} value={dayIndex}>
                          <Checkbox
                            checked={field.value.includes(dayIndex)}
                            sx={{ color: theme.palette.divider, '&.Mui-checked': { color: theme.palette.primary.main } }}
                          />
                          <ListItemText primary={DAY_NAMES[dayIndex]} />
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.day_of_week && (
                      <Typography variant="caption" sx={{ color: theme.palette.error.main, mt: 0.5 }}>
                        {errors.day_of_week.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />

              {/* Start time */}
              <Controller
                name="start_time"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    fullWidth
                    label={t('start_time_label')}
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.start_time}
                    helperText={errors.start_time?.message}
                  >
                    {TIME_OPTIONS.map((time) => (
                      <MenuItem key={time} value={time}>
                        {time}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              {/* End time */}
              <Controller
                name="end_time"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    fullWidth
                    label={t('end_time_label')}
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.end_time}
                    helperText={errors.end_time?.message}
                  >
                    {TIME_OPTIONS.map((time) => (
                      <MenuItem key={time} value={time}>
                        {time}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
            <Button
              onClick={handleCloseDialog}
              variant="outlined"
              sx={{ borderColor: theme.palette.divider, color: theme.palette.text.primary, '&:hover': { borderColor: theme.palette.text.secondary } }}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.custom.brand.darker} 100%)`,
                },
                px: 4,
              }}
            >
              {createMutation.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                t('save')
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        PaperProps={{ sx: { borderRadius: '14px', border: `1px solid ${theme.palette.divider}` } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteOutline sx={{ color: theme.palette.error.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              {t('delete_schedule')}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
            {t('delete_schedule_confirm')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirmId(null)} sx={{ color: theme.palette.text.secondary }}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create exception dialog */}
      <Dialog
        open={exceptionDialogOpen}
        onClose={() => setExceptionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '14px', border: `1px solid ${theme.palette.divider}` } }}
      >
        <DialogTitle>
          <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {t('new_exception')}
          </Typography>
        </DialogTitle>
        <Box component="form" onSubmit={handleExceptionSubmit(onSubmitException)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Controller
                name="date"
                control={exceptionControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="date"
                    fullWidth
                    label={t('date_label')}
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={!!exceptionErrors.date}
                    helperText={exceptionErrors.date?.message}
                  />
                )}
              />
              <Controller
                name="reason"
                control={exceptionControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t('reason_label')}
                    placeholder={t('reason_placeholder')}
                    error={!!exceptionErrors.reason}
                    helperText={exceptionErrors.reason?.message}
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
            <Button
              onClick={() => setExceptionDialogOpen(false)}
              variant="outlined"
              sx={{ borderColor: theme.palette.divider, color: theme.palette.text.primary, '&:hover': { borderColor: theme.palette.text.secondary } }}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createExceptionMutation.isPending}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.custom.brand.darker} 100%)`,
                },
                px: 4,
              }}
            >
              {createExceptionMutation.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                t('save')
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete exception confirmation dialog */}
      <Dialog
        open={deleteExceptionConfirmId !== null}
        onClose={() => setDeleteExceptionConfirmId(null)}
        PaperProps={{ sx: { borderRadius: '14px', border: `1px solid ${theme.palette.divider}` } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteOutline sx={{ color: theme.palette.error.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              {t('delete_exception')}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
            {t('delete_exception_confirm')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteExceptionConfirmId(null)} sx={{ color: theme.palette.text.secondary }}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleDeleteExceptionConfirm}
            variant="contained"
            color="error"
            disabled={deleteExceptionMutation.isPending}
            startIcon={deleteExceptionMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </MotionBox>
  );
}
