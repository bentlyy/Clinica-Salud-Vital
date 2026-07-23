import { memo, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Grid,
  Divider,
  Skeleton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LabQCRecord, LabArea, LabTest, LabEquipment } from '../../types/lab.types';

// ── Schema ───────────────────────────────────────────────────────────────────

const qcSchema = z
  .object({
    lab_area_id: z.number({ required_error: 'El área es requerida' }).min(1, 'Seleccione un área'),
    lab_test_id: z.number({ required_error: 'El test es requerido' }).min(1, 'Seleccione un test'),
    qc_type: z.enum(['internal', 'external', 'calibration', 'proficiency'], {
      required_error: 'El tipo QC es requerido',
    }),
    control_name: z.string().min(1, 'El nombre del control es requerido'),
    lot_number: z.string().min(1, 'El número de lote es requerido'),
    expiration_date: z.string().min(1, 'La fecha de vencimiento es requerida'),
    expected_min: z.coerce
      .number({ required_error: 'Requerido' })
      .min(0, 'Debe ser positivo'),
    expected_max: z.coerce
      .number({ required_error: 'Requerido' })
      .min(0, 'Debe ser positivo'),
    measured_value: z.coerce
      .number({ required_error: 'El valor medido es requerido' }),
    equipment_id: z.number().nullable().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.expected_min < data.expected_max, {
    message: 'El mínimo debe ser menor que el máximo',
    path: ['expected_max'],
  });

type QCFormValues = z.infer<typeof qcSchema>;

// ── Props ────────────────────────────────────────────────────────────────────

interface QCFormProps {
  areas?: LabArea[];
  tests?: LabTest[];
  equipment?: LabEquipment[];
  onSubmit: (data: Partial<LabQCRecord>) => void;
  onCancel?: () => void;
  initialData?: Partial<LabQCRecord>;
  isLoading?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const QC_TYPE_OPTIONS = [
  { value: 'internal' as const, label: 'Control Interno' },
  { value: 'external' as const, label: 'Control Externo' },
  { value: 'calibration' as const, label: 'Calibración' },
  { value: 'proficiency' as const, label: 'Competencia / Proficiency' },
];

const QC_TYPE_LABELS: Record<string, string> = {
  internal: 'Control Interno',
  external: 'Control Externo',
  calibration: 'Calibración',
  proficiency: 'Competencia / Proficiency',
};

// ── Component ────────────────────────────────────────────────────────────────

export const QCForm = memo(function QCForm({
  areas = [],
  tests = [],
  equipment = [],
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: QCFormProps) {
  const theme = useTheme();
  const isEditing = !!initialData?.id;

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QCFormValues>({
    resolver: zodResolver(qcSchema),
    defaultValues: {
      lab_area_id: initialData?.lab_area_id ?? 0,
      lab_test_id: initialData?.lab_test_id ?? 0,
      qc_type: initialData?.qc_type ?? 'internal',
      control_name: initialData?.control_name ?? '',
      lot_number: initialData?.lot_number ?? '',
      expiration_date: initialData?.expiration_date ?? '',
      expected_min: initialData?.expected_min ?? 0,
      expected_max: initialData?.expected_max ?? 0,
      measured_value: initialData?.measured_value ?? 0,
      equipment_id: initialData?.equipment_id ?? null,
      notes: initialData?.notes ?? '',
    },
  });

  const watchedAreaId = watch('lab_area_id');
  const watchedMin = watch('expected_min');
  const watchedMax = watch('expected_max');
  const watchedMeasured = watch('measured_value');

  const filteredTests = useMemo(
    () =>
      watchedAreaId
        ? tests.filter((t) => t.lab_area_id === watchedAreaId)
        : tests,
    [tests, watchedAreaId],
  );

  const filteredEquipment = useMemo(
    () =>
      watchedAreaId
        ? equipment.filter((e) => e.lab_area_id === watchedAreaId)
        : equipment,
    [equipment, watchedAreaId],
  );

  // Auto-calculate status
  const autoStatus = useMemo(() => {
    if (!watchedMeasured || !watchedMin || !watchedMax) return null;
    if (watchedMeasured >= watchedMin && watchedMeasured <= watchedMax) {
      return { label: 'Dentro de rango (Pasó)', color: '#059669', bgColor: '#ecfdf5' };
    }
    return { label: 'Fuera de rango (Falló)', color: '#dc2626', bgColor: '#fef2f2' };
  }, [watchedMeasured, watchedMin, watchedMax]);

  const handleFormSubmit = (data: QCFormValues) => {
    onSubmit({
      lab_area_id: data.lab_area_id,
      lab_test_id: data.lab_test_id,
      qc_type: data.qc_type,
      control_name: data.control_name,
      lot_number: data.lot_number,
      expiration_date: data.expiration_date,
      expected_min: data.expected_min,
      expected_max: data.expected_max,
      measured_value: data.measured_value,
      equipment_id: data.equipment_id ?? null,
      notes: data.notes || null,
      status: autoStatus
        ? autoStatus.label.includes('Pasó')
          ? 'passed'
          : 'failed'
        : 'pending',
    });
  };

  if (isLoading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: '14px',
          border: '1px solid #e5e7eb',
        }}
      >
        <Skeleton variant="text" width="40%" height={28} />
        <Skeleton variant="rectangular" width="100%" height={400} sx={{ mt: 2, borderRadius: '10px' }} />
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '14px',
        border: '1px solid #e5e7eb',
      }}
    >
      {/* Header */}
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937', mb: 0.5 }}>
        {isEditing ? 'Editar Registro QC' : 'Nuevo Registro QC'}
      </Typography>
      <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
        {isEditing
          ? 'Modifique los datos del registro de control de calidad'
          : 'Complete los datos para registrar un nuevo control de calidad'}
      </Typography>

      <Box
        component="form"
        onSubmit={(e: React.FormEvent) => void handleSubmit(handleFormSubmit)(e)}
        noValidate
      >
        <Grid container spacing={2.5}>
          {/* Row 1: Area, Test, QC Type */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="lab_area_id"
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  size="small"
                  error={!!errors.lab_area_id}
                >
                  <InputLabel id="area-label">Área</InputLabel>
                  <Select
                    labelId="area-label"
                    {...field}
                    value={field.value || ''}
                    label="Área"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    sx={{ borderRadius: '10px' }}
                  >
                    <MenuItem value={0} disabled>
                      <em>Seleccione un área</em>
                    </MenuItem>
                    {areas.map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.lab_area_id && (
                    <FormHelperText>{errors.lab_area_id.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="lab_test_id"
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  size="small"
                  error={!!errors.lab_test_id}
                >
                  <InputLabel id="test-label">Test</InputLabel>
                  <Select
                    labelId="test-label"
                    {...field}
                    value={field.value || ''}
                    label="Test"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    sx={{ borderRadius: '10px' }}
                  >
                    <MenuItem value={0} disabled>
                      <em>Seleccione un test</em>
                    </MenuItem>
                    {filteredTests.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.lab_test_id && (
                    <FormHelperText>{errors.lab_test_id.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="qc_type"
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  size="small"
                  error={!!errors.qc_type}
                >
                  <InputLabel id="qc-type-label">Tipo QC</InputLabel>
                  <Select
                    labelId="qc-type-label"
                    {...field}
                    label="Tipo QC"
                    sx={{ borderRadius: '10px' }}
                  >
                    {QC_TYPE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.qc_type && (
                    <FormHelperText>{errors.qc_type.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Grid>

          {/* Row 2: Control Name, Lot Number, Expiration */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="control_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nombre del Control"
                  placeholder="Ej: Niveles Normales"
                  fullWidth
                  size="small"
                  error={!!errors.control_name}
                  helperText={errors.control_name?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="lot_number"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Número de Lote"
                  placeholder="Ej: LOT-2025-001"
                  fullWidth
                  size="small"
                  error={!!errors.lot_number}
                  helperText={errors.lot_number?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="expiration_date"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Fecha de Vencimiento"
                  type="date"
                  fullWidth
                  size="small"
                  error={!!errors.expiration_date}
                  helperText={errors.expiration_date?.message}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                  }}
                />
              )}
            />
          </Grid>

          {/* Row 3: Expected Min, Expected Max, Measured Value */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="expected_min"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Valor Esperado Mín."
                  type="number"
                  fullWidth
                  size="small"
                  error={!!errors.expected_min}
                  helperText={errors.expected_min?.message}
                  slotProps={{
                    htmlInput: { step: 'any' },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="expected_max"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Valor Esperado Máx."
                  type="number"
                  fullWidth
                  size="small"
                  error={!!errors.expected_max}
                  helperText={errors.expected_max?.message}
                  slotProps={{
                    htmlInput: { step: 'any' },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="measured_value"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Valor Medido"
                  type="number"
                  fullWidth
                  size="small"
                  error={!!errors.measured_value}
                  helperText={errors.measured_value?.message}
                  slotProps={{
                    htmlInput: { step: 'any' },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                  }}
                />
              )}
            />
          </Grid>

          {/* Row 4: Equipment, Notes */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="equipment_id"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small">
                  <InputLabel id="equipment-label">Equipo</InputLabel>
                  <Select
                    labelId="equipment-label"
                    {...field}
                    value={field.value ?? ''}
                    label="Equipo"
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : Number(e.target.value))
                    }
                    sx={{ borderRadius: '10px' }}
                  >
                    <MenuItem value="">
                      <em>Ninguno</em>
                    </MenuItem>
                    {filteredEquipment.map((eq) => (
                      <MenuItem key={eq.id} value={eq.id}>
                        {eq.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Notas"
                  placeholder="Observaciones adicionales..."
                  fullWidth
                  size="small"
                  multiline
                  rows={1}
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                  }}
                />
              )}
            />
          </Grid>
        </Grid>

        {/* Auto-calculated status */}
        {autoStatus && (
          <Box
            sx={{
              mt: 2.5,
              p: 1.5,
              borderRadius: '10px',
              backgroundColor: autoStatus.bgColor,
              border: `1px solid ${autoStatus.color}30`,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: autoStatus.color,
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600, color: autoStatus.color }}>
              Auto-evaluación: {autoStatus.label}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280', ml: 1 }}>
              (Rango aceptable: {watchedMin} – {watchedMax})
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2.5 }} />

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
          {onCancel && (
            <Button
              variant="text"
              onClick={onCancel}
              disabled={isSubmitting}
              sx={{
                color: '#6b7280',
                fontWeight: 600,
                '&:hover': { backgroundColor: '#f3f4f6' },
              }}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{
              background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
              },
            }}
          >
            {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
});

export default QCForm;
