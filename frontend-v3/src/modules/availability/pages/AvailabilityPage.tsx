import { useState, useCallback } from 'react';
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
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import Schedule from '@mui/icons-material/Schedule';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import {
  useAvailabilityRules,
  useCreateAvailabilityRule,
  useDeleteAvailabilityRule,
} from '../hooks/useAvailability';
import { AvailabilityGrid } from '../components/AvailabilityGrid';
import { DAY_NAMES, WEEK_DAYS_ORDER } from '../types/availability.types';

const MotionBox = motion(Box);

const ruleSchema = z
  .object({
    day_of_week: z
      .array(z.number().min(0).max(6))
      .min(1, 'Selecciona al menos un día'),
    start_time: z.string().min(1, 'Selecciona hora de inicio'),
    end_time: z.string().min(1, 'Selecciona hora de fin'),
  })
  .refine(
    (data) => {
      if (!data.start_time || !data.end_time) return true;
      return data.start_time < data.end_time;
    },
    {
      message: 'La hora de fin debe ser posterior a la hora de inicio',
      path: ['end_time'],
    },
  );

type RuleFormData = z.infer<typeof ruleSchema>;

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

export default function AvailabilityPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: rules, isLoading, isError, error, refetch } = useAvailabilityRules();
  const createMutation = useCreateAvailabilityRule();
  const deleteMutation = useDeleteAvailabilityRule();

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

  if (isLoading) return <LoadingState message="Cargando horarios..." />;
  if (isError) return <ErrorState error={error as Error} onRetry={refetch} />;

  const rulesList = rules ?? [];

  return (
    <MotionBox
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title="Mis Horarios"
        subtitle="Configura tu disponibilidad semanal para citas"
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenDialog}
            sx={{
              background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
              },
              px: 3,
              py: 1,
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            Agregar Horario
          </Button>
        }
      />

      {rulesList.length === 0 ? (
        <EmptyState
          icon={<Schedule sx={{ fontSize: 48, color: '#d1d5db' }} />}
          title="Sin horarios configurados"
          message="Agrega tus horarios de disponibilidad para que los pacientes puedan agendar citas contigo."
          action={{
            label: 'Agregar Horario',
            onClick: handleOpenDialog,
          }}
        />
      ) : (
        <Box
          sx={{
            p: 3,
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            backgroundColor: '#fff',
          }}
        >
          <AvailabilityGrid rules={rulesList} onDelete={(id) => setDeleteConfirmId(id)} />
        </Box>
      )}

      {/* Create dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', border: '1px solid #e5e7eb' } }}
      >
        <DialogTitle>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
            Nuevo Horario
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
                    <InputLabel>Días de la semana</InputLabel>
                    <Select
                      multiple
                      value={field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(typeof value === 'string' ? value.split(',').map(Number) : value);
                      }}
                      input={<OutlinedInput label="Días de la semana" />}
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
                            sx={{ color: '#d1d5db', '&.Mui-checked': { color: '#0d9488' } }}
                          />
                          <ListItemText primary={DAY_NAMES[dayIndex]} />
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.day_of_week && (
                      <Typography variant="caption" sx={{ color: '#ef4444', mt: 0.5 }}>
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
                    label="Hora de inicio"
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
                    label="Hora de fin"
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
              sx={{ borderColor: '#d1d5db', color: '#374151', '&:hover': { borderColor: '#9ca3af' } }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending}
              sx={{
                background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                },
                px: 4,
              }}
            >
              {createMutation.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        PaperProps={{ sx: { borderRadius: '16px', border: '1px solid #e5e7eb' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteOutline sx={{ color: '#ef4444' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
              Eliminar Horario
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#374151' }}>
            ¿Estás seguro de que deseas eliminar este horario de disponibilidad? Los pacientes no podrán agendar citas en este horario.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirmId(null)} sx={{ color: '#6b7280' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </MotionBox>
  );
}
