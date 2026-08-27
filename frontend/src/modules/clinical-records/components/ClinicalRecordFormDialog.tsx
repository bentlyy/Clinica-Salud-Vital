import { useEffect, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';
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

function createClinicalRecordSchema(t: (key: string) => string) {
  return z.object({
    patient_name: z.string().min(1, t('patient_name_required')),
    patient_id: z.number().min(1, t('select_patient')),
    doctor_name: z.string().optional(),
    template_id: z.number().optional(),
    chief_complaint: z.string().min(1, t('chief_complaint_required')),
    diagnosis: z.string().min(1, t('diagnosis_required')),
    treatment_plan: z.string().min(1, t('treatment_required')),
    notes: z.string().optional(),
    vitals: vitalsSchema,
  });
}

type ClinicalRecordFormData = z.infer<ReturnType<typeof createClinicalRecordSchema>>;

interface ClinicalRecordFormDialogProps {
  open: boolean;
  onClose: () => void;
  record?: ClinicalRecord | null;
  onSave: (input: CreateClinicalRecordInput) => void;
  isSaving: boolean;
  patientId?: number;
  patientName?: string;
}

function getVitalFields(t: (key: string) => string) {
  return [
    { key: 'temperature' as const, label: t('temperature') },
    { key: 'blood_pressure' as const, label: t('blood_pressure') },
    { key: 'heart_rate' as const, label: t('heart_rate') },
    { key: 'weight' as const, label: t('weight') },
    { key: 'height' as const, label: t('height') },
    { key: 'oxygen_saturation' as const, label: t('oxygen_saturation') },
  ];
}

export function ClinicalRecordFormDialog({
  open,
  onClose,
  record,
  onSave,
  isSaving,
  patientId,
  patientName,
}: ClinicalRecordFormDialogProps) {
  const { t } = useTranslation('clinical_records');
  const isEditing = !!record;
  const { data: templatesData } = useClinicalTemplates();
  const templates = templatesData?.data ?? [];

  const clinicalRecordSchema = useMemo(() => createClinicalRecordSchema(t), [t]);

  const VITAL_FIELDS = useMemo(() => getVitalFields(t), [t]);

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
      treatment_plan: '',
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
          treatment_plan: record.treatment_plan,
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
          treatment_plan: '',
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
      treatment_plan: data.treatment_plan,
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
          {isEditing ? t('edit_record') : t('new_record')}
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
                        label={t('patient_name')}
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
                label={t('patient')}
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
                      label={t('template_optional')}
                      fullWidth
                      placeholder={t('select_template')}
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
                label={t('chief_complaint')}
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
                label={t('diagnosis')}
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
            name="treatment_plan"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('treatment')}
                error={!!errors.treatment_plan}
                helperText={errors.treatment_plan?.message}
                fullWidth
                multiline
                rows={2}
                sx={{ mb: 2 }}
              />
            )}
          />

          {/* Vitals Section */}
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 1.5, mt: 1 }}>
            {t('vital_signs')}
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
                label={t('additional_notes')}
                fullWidth
                multiline
                rows={3}
                placeholder={t('notes_placeholder')}
              />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f3f4f6' }}>
        <Button onClick={onClose} variant="outlined" sx={{ mr: 1 }}>
          {t('cancel', { ns: 'common' })}
        </Button>
        <Button
          type="submit"
          form="clinical-record-form"
          variant="contained"
          disabled={isSaving}
        >
          {isSaving ? t('saving') : isEditing ? t('update') : t('create_record')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
