import { memo, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  Divider,
  InputAdornment,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LabRequestItem } from '../../types/lab.types';

// ── Schema ───────────────────────────────────────────────────────────────────

const resultEntrySchema = z.object({
  result_value: z
    .string()
    .min(1, 'El valor del resultado es requerido'),
  unit: z.string().optional(),
  notes: z.string().optional(),
});

type ResultEntryValues = z.infer<typeof resultEntrySchema>;

// ── Props ────────────────────────────────────────────────────────────────────

interface ResultEntryFormProps {
  item: LabRequestItem;
  onSubmit: (data: {
    result_value: string;
    unit?: string;
    notes?: string;
  }) => void;
  onCancel?: () => void;
  isEditing?: boolean;
  disabled?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isResultCritical(
  value: string,
  test: LabRequestItem['test'],
): boolean {
  if (!test) return false;
  const num = parseFloat(value);
  if (Number.isNaN(num)) return false;

  if (test.critical_min !== null && num < test.critical_min) return true;
  if (test.critical_max !== null && num > test.critical_max) return true;

  if (test.reference_min !== null && num < test.reference_min) return true;
  if (test.reference_max !== null && num > test.reference_max) return true;

  return false;
}

// ── Component ────────────────────────────────────────────────────────────────

export const ResultEntryForm = memo(function ResultEntryForm({
  item,
  onSubmit,
  onCancel,
  isEditing = false,
  disabled = false,
}: ResultEntryFormProps) {
  const theme = useTheme();

  const defaultUnit = item.unit || item.test?.unit || '';

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResultEntryValues>({
    resolver: zodResolver(resultEntrySchema),
    defaultValues: {
      result_value: item.result_value ?? '',
      unit: item.unit ?? '',
      notes: item.notes ?? '',
    },
  });

  const watchedValue = watch('result_value');
  const isCritical = useMemo(
    () => isResultCritical(watchedValue, item.test),
    [watchedValue, item.test],
  );

  const displayTestName = item.test_name || item.test?.name || `Test #${item.lab_test_id}`;
  const displayRange =
    item.reference_range ||
    (item.test?.reference_min != null && item.test?.reference_max != null
      ? `${item.test.reference_min} – ${item.test.reference_max} ${item.test?.unit ?? ''}`
      : 'Sin rango definido');

  const handleFormSubmit = (data: ResultEntryValues) => {
    onSubmit({
      result_value: data.result_value,
      unit: data.unit || undefined,
      notes: data.notes || undefined,
    });
  };

  return (
    <Box
      component="form"
      onSubmit={(e: React.FormEvent) => void handleSubmit(handleFormSubmit)(e)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
    >
      {/* Critical Alert */}
      {isCritical && watchedValue && (
        <Alert
          severity="error"
          icon={<WarningAmberIcon />}
          sx={{
            borderRadius: '10px',
            border: '1px solid #fecaca',
            backgroundColor: '#fef2f2',
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#991b1b' }}>
            Resultado fuera de rango crítico
          </Typography>
          <Typography variant="caption" sx={{ color: '#b91c1c' }}>
            El valor {watchedValue} está por fuera de los límites críticos del test.
            Revise antes de guardar.
          </Typography>
        </Alert>
      )}

      {/* Test Info */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          backgroundColor: '#f9fafb',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Nombre del Test
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
              {displayTestName}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="caption"
              sx={{
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Rango de Referencia
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
              {displayRange}
            </Typography>
          </Box>

          {item.test?.sample_type && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Tipo de Muestra
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
                {item.test.sample_type}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Result Value */}
      <Controller
        name="result_value"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Valor del Resultado"
            placeholder="Ingrese el valor"
            fullWidth
            disabled={disabled}
            error={!!errors.result_value}
            helperText={errors.result_value?.message}
            InputProps={{
              endAdornment: defaultUnit ? (
                <InputAdornment position="end">
                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                    {defaultUnit}
                  </Typography>
                </InputAdornment>
              ) : undefined,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: isCritical
                    ? theme.palette.error.main
                    : theme.palette.primary.main,
                  borderWidth: 2,
                },
              },
            }}
          />
        )}
      />

      {/* Unit Override */}
      <Controller
        name="unit"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Unidad (override)"
            placeholder={defaultUnit || 'Ej: mg/dL'}
            fullWidth
            disabled={disabled}
            size="small"
          />
        )}
      />

      {/* Notes */}
      <Controller
        name="notes"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Notas / Observaciones"
            placeholder="Observaciones adicionales sobre el resultado..."
            fullWidth
            multiline
            rows={3}
            disabled={disabled}
          />
        )}
      />

      <Divider sx={{ my: 0.5 }} />

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
        {onCancel && (
          <Button
            variant="text"
            onClick={onCancel}
            disabled={disabled || isSubmitting}
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
          disabled={disabled || isSubmitting}
          sx={{
            background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
            fontWeight: 600,
            px: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
            },
          }}
        >
          {isSubmitting
            ? 'Guardando...'
            : isEditing
              ? 'Actualizar Resultado'
              : 'Guardar Resultado'}
        </Button>
      </Box>
    </Box>
  );
});

export default ResultEntryForm;
