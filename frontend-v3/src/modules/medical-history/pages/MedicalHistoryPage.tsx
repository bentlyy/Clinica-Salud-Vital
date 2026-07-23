import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Divider,
  Autocomplete,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import Circle from '@mui/icons-material/Circle';
import LocalHospital from '@mui/icons-material/LocalHospital';
import FamilyRestroom from '@mui/icons-material/FamilyRestroom';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Chronic from '@mui/icons-material/HealthAndSafety';
import Edit from '@mui/icons-material/Edit';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useAuth } from '@/shared/providers/AuthProvider';
import { patientService } from '@/modules/patients/services/patient.service';
import {
  useMedicalHistory,
  useCreateMedicalHistory,
  useUpdateMedicalHistory,
} from '../hooks/useMedicalHistory';
import type {
  MedicalHistoryEntry,
  MedicalHistoryStatus,
  CreateMedicalHistoryInput,
} from '../types/medical-history.types';

const STATUS_CONFIG: Record<MedicalHistoryStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  active: {
    label: 'Activa',
    color: '#ef4444',
    bgColor: '#fef2f2',
    icon: <LocalHospital sx={{ fontSize: 16 }} />,
  },
  resolved: {
    label: 'Resuelta',
    color: '#059669',
    bgColor: '#ecfdf5',
    icon: <CheckCircle sx={{ fontSize: 16 }} />,
  },
  chronic: {
    label: 'Crónica',
    color: '#d97706',
    bgColor: '#fffbeb',
    icon: <Chronic sx={{ fontSize: 16 }} />,
  },
  family: {
    label: 'Familiar',
    color: '#6366f1',
    bgColor: '#f5f3ff',
    icon: <FamilyRestroom sx={{ fontSize: 16 }} />,
  },
};

const entrySchema = z.object({
  condition: z.string().min(1, 'La condición es requerida'),
  onset_date: z.string().optional(),
  status: z.enum(['active', 'resolved', 'chronic', 'family']),
  notes: z.string().optional(),
  patient_id: z.number().min(1, 'Selecciona un paciente'),
});

type EntryFormData = z.infer<typeof entrySchema>;

interface PatientOption {
  id: number;
  name: string;
  email: string;
}

export default function MedicalHistoryPage() {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('medicalHistory', 'create');
  const canEdit = hasPermission('medicalHistory', 'edit');
  const isPatient = user?.role === 'patient';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MedicalHistoryStatus | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MedicalHistoryEntry | null>(null);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);

  const params = useMemo(
    () => ({
      search: search || undefined,
      status: (statusFilter || undefined) as MedicalHistoryStatus | undefined,
      patient_id: isPatient ? user?.id : undefined,
    }),
    [search, statusFilter, isPatient, user?.id],
  );

  const { data, isLoading, error, refetch } = useMedicalHistory(params);
  const createMutation = useCreateMedicalHistory();
  const updateMutation = useUpdateMedicalHistory();

  const entries = data?.data ?? [];

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      condition: '',
      onset_date: '',
      status: 'active',
      notes: '',
      patient_id: 0,
    },
  });

  const selectedPatientId = watch('patient_id');

  useEffect(() => {
    if (formOpen && !isPatient && canCreate) {
      setPatientsLoading(true);
      patientService
        .list({ page: 1, limit: 200 })
        .then((res) => {
          const list = (res.data || []).map((p: any) => ({
            id: p.id,
            name: p.name || p.user_name || `Paciente #${p.id}`,
            email: p.email || '',
          }));
          setPatients(list);
        })
        .catch(() => setPatients([]))
        .finally(() => setPatientsLoading(false));
    }
  }, [formOpen, isPatient, canCreate]);

  const handleOpenForm = (entry?: MedicalHistoryEntry) => {
    if (entry) {
      setEditingEntry(entry);
      reset({
        condition: entry.condition,
        onset_date: entry.onset_date || '',
        status: entry.status,
        notes: entry.notes || '',
        patient_id: entry.patient_id,
      });
    } else {
      setEditingEntry(null);
      reset({
        condition: '',
        onset_date: '',
        status: 'active',
        notes: '',
        patient_id: isPatient ? (user?.id ?? 0) : 0,
      });
    }
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingEntry(null);
    reset();
  };

  const onSubmit = (formData: EntryFormData) => {
    const input: CreateMedicalHistoryInput = {
      patient_id: formData.patient_id,
      condition: formData.condition,
      onset_date: formData.onset_date || undefined,
      status: formData.status,
      notes: formData.notes || undefined,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, input }, { onSuccess: handleFormClose });
    } else {
      createMutation.mutate(input, { onSuccess: handleFormClose });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <LoadingState message="Cargando historial médico..." />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;

  return (
    <Box>
      <PageHeader
        title="Historial Médico"
        subtitle={isPatient ? `Tu historial: ${entries.length} entradas` : `Total: ${entries.length} entradas`}
        action={
          canCreate ? (
            <Box
              component="button"
              onClick={() => handleOpenForm()}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1.2,
                borderRadius: '10px',
                backgroundColor: '#0d9488',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                '&:hover': { backgroundColor: '#0f766e' },
              }}
            >
              <Add sx={{ fontSize: 20 }} />
              Nueva Entrada
            </Box>
          ) : undefined
        }
      />

      {/* Filters */}
      <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Paper sx={{ p: 2, mb: 3, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Buscar por condición..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#9ca3af', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              {(['', 'active', 'resolved', 'chronic', 'family'] as const).map((status) => {
                const config = status ? STATUS_CONFIG[status] : null;
                return (
                  <Chip
                    key={status}
                    label={config ? config.label : 'Todas'}
                    onClick={() => setStatusFilter(status as MedicalHistoryStatus | '')}
                    variant={statusFilter === status ? 'filled' : 'outlined'}
                    sx={{
                      fontWeight: 500,
                      cursor: 'pointer',
                      ...(statusFilter === status && config
                        ? {
                            backgroundColor: config.bgColor,
                            color: config.color,
                            border: `1px solid ${config.color}`,
                          }
                        : {}),
                      '&:hover': {
                        backgroundColor: status
                          ? STATUS_CONFIG[status]?.bgColor
                          : '#f3f4f6',
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        </Paper>
      </MotionDiv>

      {/* Timeline */}
      {entries.length === 0 ? (
        <EmptyState
          icon={<LocalHospital sx={{ fontSize: 48, color: '#d1d5db' }} />}
          title="No hay entradas"
          message="No se encontraron entradas en el historial médico."
          action={canCreate ? { label: 'Crear Entrada', onClick: () => handleOpenForm() } : undefined}
        />
      ) : (
        <Box sx={{ position: 'relative', pl: 4 }}>
          {/* Timeline line */}
          <Box
            sx={{
              position: 'absolute',
              left: 12,
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: '#e5e7eb',
            }}
          />

          {entries.map((entry, index) => {
            const config = STATUS_CONFIG[entry.status];
            if (!config) return null;
            const chipIcon = config.icon as React.ReactElement | undefined;
            return (
              <MotionDiv
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Box sx={{ position: 'relative', mb: 3 }}>
                  {/* Timeline dot */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -28,
                      top: 16,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: config.color,
                      border: '2px solid #ffffff',
                      boxShadow: `0 0 0 2px ${config.color}30`,
                      zIndex: 1,
                    }}
                  />

                  <Paper
                    sx={{
                      p: 2.5,
                      border: '1px solid #e5e7eb',
                      boxShadow: 'none',
                      '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
                      transition: 'box-shadow 0.2s',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
                            {entry.condition}
                          </Typography>
                          <Chip
                            icon={chipIcon}
                            label={config.label}
                            size="small"
                            sx={{
                              backgroundColor: config.bgColor,
                              color: config.color,
                              border: `1px solid ${config.color}30`,
                              fontWeight: 500,
                              fontSize: '0.7rem',
                              height: 22,
                            }}
                          />
                        </Box>

                        {!isPatient && (entry as any).patient_name && (
                          <Typography variant="body2" sx={{ color: '#6b7280', mb: 0.5 }}>
                            Paciente: {(entry as any).patient_name}
                          </Typography>
                        )}

                        {entry.onset_date && (
                          <Typography variant="body2" sx={{ color: '#9ca3af', mb: 0.5 }}>
                            Inicio: {format(new Date(entry.onset_date), 'dd MMM yyyy', { locale: es })}
                          </Typography>
                        )}

                        {entry.notes && (
                          <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                            {entry.notes}
                          </Typography>
                        )}
                      </Box>

                      {canEdit && (
                        <IconButton
                          size="small"
                          onClick={() => handleOpenForm(entry)}
                          sx={{ color: '#9ca3af', '&:hover': { color: '#0d9488' } }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    <Typography variant="caption" sx={{ color: '#d1d5db' }}>
                      {format(new Date(entry.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                    </Typography>
                  </Paper>
                </Box>
              </MotionDiv>
            );
          })}
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={formOpen}
        onClose={handleFormClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', border: '1px solid #e5e7eb' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
            {editingEntry ? 'Editar Entrada' : 'Nueva Entrada del Historial'}
          </Typography>
          <IconButton onClick={handleFormClose} size="small" sx={{ color: '#6b7280' }}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Box component="form" id="medical-history-form" onSubmit={handleSubmit(onSubmit)}>
            {/* Patient selector — only for non-patient roles */}
            {!isPatient && (
              <Controller
                name="patient_id"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={patients}
                    getOptionLabel={(option) => option.name || `Paciente #${option.id}`}
                    value={patients.find((p) => p.id === field.value) || null}
                    onChange={(_, newValue) => {
                      field.onChange(newValue?.id ?? 0);
                    }}
                    loading={patientsLoading}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{option.name}</Typography>
                          <Typography variant="caption" sx={{ color: '#9ca3af' }}>{option.email}</Typography>
                        </Box>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Paciente"
                        placeholder="Buscar paciente..."
                        error={!!errors.patient_id}
                        helperText={errors.patient_id?.message}
                        fullWidth
                      />
                    )}
                    sx={{ mb: 2 }}
                  />
                )}
              />
            )}

            <Controller
              name="condition"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Condición / Enfermedad"
                  error={!!errors.condition}
                  helperText={errors.condition?.message}
                  fullWidth
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="onset_date"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Fecha de Inicio (opcional)"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Estado"
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {(['active', 'resolved', 'chronic', 'family'] as const).map((s) => (
                    <MenuItem key={s} value={s}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Circle sx={{ fontSize: 10, color: STATUS_CONFIG[s].color }} />
                        {STATUS_CONFIG[s].label}
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Notas (opcional)"
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Detalles adicionales sobre la condición..."
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f3f4f6' }}>
          <Button onClick={handleFormClose} variant="outlined" sx={{ mr: 1 }}>
            Cancelar
          </Button>
          <Button type="submit" form="medical-history-form" variant="contained" disabled={isSaving}>
            {isSaving ? 'Guardando...' : editingEntry ? 'Actualizar' : 'Crear Entrada'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
