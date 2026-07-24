import { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Close from '@mui/icons-material/Close';
import Add from '@mui/icons-material/Add';
import Remove from '@mui/icons-material/Remove';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Prescription, CreatePrescriptionInput } from '../types/prescription.types';

const medicationSchema = z.object({
  name: z.string().min(1, 'El nombre del medicamento es requerido'),
  dosage: z.string().min(1, 'La dosis es requerida'),
  frequency: z.string().min(1, 'La frecuencia es requerida'),
  duration: z.string().min(1, 'La duración es requerida'),
  instructions: z.string().optional(),
});

const prescriptionSchema = z.object({
  patient_name: z.string().min(1, 'El nombre del paciente es requerido'),
  patient_id: z.number().min(1, 'Seleccione un paciente'),
  notes: z.string().optional(),
  medications: z.array(medicationSchema).min(1, 'Agregue al menos un medicamento'),
});

type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

interface PrescriptionFormDialogProps {
  open: boolean;
  onClose: () => void;
  prescription?: Prescription | null;
  onSave: (input: CreatePrescriptionInput) => void;
  isSaving: boolean;
  patientId?: number;
  patientName?: string;
}

export function PrescriptionFormDialog({
  open,
  onClose,
  prescription,
  onSave,
  isSaving,
  patientId,
  patientName,
}: PrescriptionFormDialogProps) {
  const theme = useTheme();
  const isEditing = !!prescription;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      patient_name: patientName || '',
      patient_id: patientId || 0,
      notes: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'medications',
  });

  const resetForm = () => {
    if (prescription) {
      reset({
        patient_name: prescription.patient_name || '',
        patient_id: prescription.patient_id,
        notes: prescription.notes || '',
        medications: prescription.medications.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions || '',
        })),
      });
    } else {
      reset({
        patient_name: patientName || '',
        patient_id: patientId || 0,
        notes: '',
        medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
      });
    }
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const onSubmit = (data: PrescriptionFormData) => {
    const input: CreatePrescriptionInput = {
      patient_id: data.patient_id,
      notes: data.notes || undefined,
      medications: data.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions || undefined,
      })),
    };
    onSave(input);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '16px', border: `1px solid ${theme.palette.divider}` },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
          {isEditing ? 'Editar Receta' : 'Nueva Receta'}
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: theme.palette.text.secondary }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        <Box component="form" id="prescription-form" onSubmit={handleSubmit(onSubmit)}>
          {/* Patient info */}
          {patientId ? (
            <TextField
              label="Paciente"
              value={patientName || `Paciente #${patientId}`}
              disabled
              fullWidth
              sx={{ mb: 3 }}
            />
          ) : (
            <Controller
              name="patient_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nombre del Paciente"
                  error={!!errors.patient_name}
                  helperText={errors.patient_name?.message}
                  fullWidth
                  sx={{ mb: 3 }}
                />
              )}
            />
          )}

          {/* Medications */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              Medicamentos
            </Typography>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => append({ name: '', dosage: '', frequency: '', duration: '', instructions: '' })}
              sx={{ color: theme.palette.primary.main, fontWeight: 600 }}
            >
              Agregar
            </Button>
          </Box>

          {errors.medications?.message && (
            <Typography variant="caption" sx={{ color: theme.palette.error.main, mb: 1, display: 'block' }}>
              {errors.medications.message}
            </Typography>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            {fields.map((field, index) => (
              <Box
                key={field.id}
                sx={{
                  p: 2,
                  backgroundColor: theme.palette.custom.surface.muted,
                  borderRadius: '10px',
                  border: `1px solid ${theme.palette.divider}`,
                  position: 'relative',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>
                    Medicamento {index + 1}
                  </Typography>
                  {fields.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => remove(index)}
                      sx={{ color: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.custom.status.error.bg } }}
                    >
                      <Remove fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Controller
                    name={`medications.${index}.name`}
                    control={control}
                    render={({ field: f }) => (
                      <TextField
                        {...f}
                        label="Nombre"
                        error={!!errors.medications?.[index]?.name}
                        helperText={errors.medications?.[index]?.name?.message}
                        fullWidth
                        size="small"
                      />
                    )}
                  />
                  <Controller
                    name={`medications.${index}.dosage`}
                    control={control}
                    render={({ field: f }) => (
                      <TextField
                        {...f}
                        label="Dosis"
                        placeholder="ej. 500mg"
                        error={!!errors.medications?.[index]?.dosage}
                        helperText={errors.medications?.[index]?.dosage?.message}
                        fullWidth
                        size="small"
                      />
                    )}
                  />
                  <Controller
                    name={`medications.${index}.frequency`}
                    control={control}
                    render={({ field: f }) => (
                      <TextField
                        {...f}
                        label="Frecuencia"
                        placeholder="ej. 3 veces al día"
                        error={!!errors.medications?.[index]?.frequency}
                        helperText={errors.medications?.[index]?.frequency?.message}
                        fullWidth
                        size="small"
                      />
                    )}
                  />
                  <Controller
                    name={`medications.${index}.duration`}
                    control={control}
                    render={({ field: f }) => (
                      <TextField
                        {...f}
                        label="Duración"
                        placeholder="ej. 7 días"
                        error={!!errors.medications?.[index]?.duration}
                        helperText={errors.medications?.[index]?.duration?.message}
                        fullWidth
                        size="small"
                      />
                    )}
                  />
                  <Controller
                    name={`medications.${index}.instructions`}
                    control={control}
                    render={({ field: f }) => (
                      <TextField
                        {...f}
                        label="Instrucciones especiales"
                        placeholder="ej. Tomar con alimentos"
                        fullWidth
                        size="small"
                        sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}
                      />
                    )}
                  />
                </Box>
              </Box>
            ))}
          </Box>

          {/* Notes */}
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Notas Adicionales"
                fullWidth
                multiline
                rows={2}
                placeholder="Observaciones generales de la receta..."
              />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose} variant="outlined" sx={{ mr: 1 }}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="prescription-form"
          variant="contained"
          disabled={isSaving}
        >
          {isSaving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Receta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
