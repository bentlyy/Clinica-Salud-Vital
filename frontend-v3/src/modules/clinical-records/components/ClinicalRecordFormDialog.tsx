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
  Autocomplete,
} from '@mui/material';
import Close from '@mui/icons-material/Close';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ClinicalRecord, CreateClinicalRecordInput } from '../types/clinical-record.types';
import type { ClinicalTemplate } from '@/modules/clinical-templates/types/template.types';
import { useClinicalTemplates } from '@/modules/clinical-templates/hooks/useClinicalTemplates';

const vitalsSchema = z.object({
  temperature: z.string().optional(),
  blood_pressure: z.string().optional(),
  heart_rate: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  oxygen_saturation: z.string().optional(),
});

const clinicalRecordSchema = z.object({
  patient_name: z.string().min(1, 'El nombre del paciente es requerido'),
  patient_id: z.number().min(1, 'Seleccione un paciente'),
  doctor_name: z.string().optional(),
  template_id: z.number().optional(),
  chief_complaint: z.string().min(1, 'La consulta principal es requerida'),
  diagnosis: z.string().min(1, 'El diagnóstico es requerido'),
  treatment: z.string().min(1, 'El tratamiento es requerido'),
  notes: z.string().optional(),
  vitals: vitalsSchema,
});

type ClinicalRecordFormData = z.infer<typeof clinicalRecordSchema>;

interface ClinicalRecordFormDialogProps {
  open: boolean;
  onClose: () => void;
  record?: ClinicalRecord | null;
  onSave: (input: CreateClinicalRecordInput) => void;
  isSaving: boolean;
  patientId?: number;
  patientName?: string;
}

const VITAL_FIELDS = [
  { key: 'temperature' as const, label: 'Temperatura (°C)' },
  { key: 'blood_pressure' as const, label: 'Presión Arterial (mmHg)' },
  { key: 'heart_rate' as const, label: 'Frec. Cardíaca (lpm)' },
  { key: 'weight' as const, label: 'Peso (kg)' },
  { key: 'height' as const, label: 'Estatura (cm)' },
  { key: 'oxygen_saturation' as const, label: 'Saturación Oò (%)' },
];

export function ClinicalRecordFormDialog({
  open,
  onClose,
  record,
  onSave,
  isSaving,
  patientId,
  patientName,
}: ClinicalRecordFormDialogProps) {
  const isEditing = !!record;
  const { data: templatesData } = useClinicalTemplates();
  const templates = templatesData?.data ?? [];

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ClinicalRecordFormData>({
    resolver: zodResolver(clinicalRecordSchema),
    defaultValues: {
      patient_name: patientName || '',
      patient_id: patientId || 0,
      doctor_name: '',
      template_id: undefined,
      chief_complaint: '',
      diagnosis: '',
      treatment: '',
      notes: '',
      vitals: {},
    },
  });

  useEffect(() => {
    if (open) {
      if (record) {
        reset({
          patient_name: record.patient_name || '',
          patient_id: record.patient_id,
          doctor_name: record.doctor_name || '',
          template_id: record.template_id,
          chief_complaint: record.chief_complaint,
          diagnosis: record.diagnosis,
          treatment: record.treatment,
          notes: record.notes || '',
          vitals: record.vitals || {},
        });
      } else {
        reset({
          patient_name: patientName || '',
          patient_id: patientId || 0,
          doctor_name: '',
          template_id: undefined,
          chief_complaint: '',
          diagnosis: '',
          treatment: '',
          notes: '',
          vitals: {},
        });
      }
    }
  }, [open, record, patientId, patientName, reset]);

  const handleTemplateChange = (template: ClinicalTemplate | null) => {
    if (!template) {
      setValue('template_id', undefined);
      return;
    }
    setValue('template_id', template.id);
    if (template.fields && template.fields.length > 0) {
      const templateNotes = template.fields
        .map((f) => `${f.name}: `)
        .join('\n');
      setValue('notes', templateNotes);
    }
  };

  const onSubmit = (data: ClinicalRecordFormData) => {
    const input: CreateClinicalRecordInput = {
      patient_id: data.patient_id,
      chief_complaint: data.chief_complaint,
      diagnosis: data.diagnosis,
      treatment: data.treatment,
      notes: data.notes || undefined,
      template_id: data.template_id || undefined,
      vitals: data.vitals && Object.values(data.vitals).some((v) => v)
        ? (Object.fromEntries(
            Object.entries(data.vitals).filter(([, v]) => v !== undefined && v !== ''),
          ) as Record<string, string>)
        : undefined,
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
        sx: { borderRadius: '16px', border: '1px solid #e5e7eb' },
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
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
          {isEditing ? 'Editar Expediente' : 'Nuevo Expediente'}
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: '#6b7280' }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        <Box component="form" id="clinical-record-form" onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
            {/* Patient selector (when not pre-set) */}
            {!patientId && (
              <Controller
                name="patient_name"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    freeSolo
                    options={[]}
                    {...field}
                    onChange={(_, value) => {
                      field.onChange(value || '');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Nombre del Paciente"
                        error={!!errors.patient_name}
                        helperText={errors.patient_name?.message}
                        fullWidth
                      />
                    )}
                  />
                )}
              />
            )}

            {patientId && (
              <TextField
                label="Paciente"
                value={patientName || `Paciente #${patientId}`}
                disabled
                fullWidth
              />
            )}

            {/* Template selector */}
            <Controller
              name="template_id"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={templates}
                  getOptionLabel={(option) =>
                    typeof option === 'object' && option !== null && 'name' in option
                      ? (option as ClinicalTemplate).name
                      : ''
                  }
                  isOptionEqualToValue={(option, value) => option.id === (typeof value === 'object' ? value?.id : value)}
                  value={templates.find((t) => t.id === field.value) || null}
                  onChange={(_, value) => handleTemplateChange(value as ClinicalTemplate | null)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Plantilla (opcional)"
                      fullWidth
                      placeholder="Seleccionar plantilla..."
                    />
                  )}
                />
              )}
            />
          </Box>

          {/* Chief Complaint */}
          <Controller
            name="chief_complaint"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Consulta Principal"
                error={!!errors.chief_complaint}
                helperText={errors.chief_complaint?.message}
                fullWidth
                multiline
                rows={2}
                sx={{ mb: 2 }}
              />
            )}
          />

          {/* Diagnosis */}
          <Controller
            name="diagnosis"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Diagnóstico"
                error={!!errors.diagnosis}
                helperText={errors.diagnosis?.message}
                fullWidth
                multiline
                rows={2}
                sx={{ mb: 2 }}
              />
            )}
          />

          {/* Treatment */}
          <Controller
            name="treatment"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Tratamiento"
                error={!!errors.treatment}
                helperText={errors.treatment?.message}
                fullWidth
                multiline
                rows={2}
                sx={{ mb: 2 }}
              />
            )}
          />

          {/* Vitals Section */}
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 1.5, mt: 1 }}>
            Signos Vitales
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
              gap: 2,
              mb: 3,
              p: 2,
              backgroundColor: '#f9fafb',
              borderRadius: '10px',
              border: '1px solid #f3f4f6',
            }}
          >
            {VITAL_FIELDS.map((vital) => (
              <Controller
                key={vital.key}
                name={`vitals.${vital.key}`}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value || ''}
                    label={vital.label}
                    fullWidth
                    size="small"
                    placeholder="---"
                  />
                )}
              />
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
                rows={3}
                placeholder="Observaciones, seguimiento, indicaciones especiales..."
              />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f3f4f6' }}>
        <Button onClick={onClose} variant="outlined" sx={{ mr: 1 }}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="clinical-record-form"
          variant="contained"
          disabled={isSaving}
        >
          {isSaving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Expediente'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
