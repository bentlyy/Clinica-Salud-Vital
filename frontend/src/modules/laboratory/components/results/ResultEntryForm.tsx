import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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

const resultEntrySchema = (t: TFunction) =>
  z.object({
    result_value: z.string().min(1, t('lab:validation.resultRequired', 'El valor del resultado es requerido')),
    unit: z.string().optional(),
    notes: z.string().optional(),
  });

type ResultEntryValues = z.infer<ReturnType<typeof resultEntrySchema>>;

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
  const { t } = useTranslation('lab');

  const defaultUnit = item.unit || item.test?.unit || '';

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResultEntryValues>({
    resolver: zodResolver(resultEntrySchema(t)),
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
      : t('lab:noRange', 'Sin rango definido'));

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
            border: `1px solid ${theme.palette.custom.status.error.border}`,
            backgroundColor: theme.palette.error.light,
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.error.dark }}>
            {t('criticalRange')}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.error.dark }}>
            {t('criticalRangeDetail', { value: watchedValue })}
          </Typography>
        </Alert>
      )}

      {/* Test Info */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '12px',
          backgroundColor: theme.palette.action.hover,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t('testNameLabel')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              {displayTestName}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t('referenceRange')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
              {displayRange}
            </Typography>
          </Box>

          {item.test?.sample_type && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                color: theme.palette.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t('sampleTypeLabel')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
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
            label={t('resultValueLabel')}
            placeholder={t('resultValuePlaceholder')}
            fullWidth
            disabled={disabled}
            error={!!errors.result_value}
            helperText={errors.result_value?.message}
            InputProps={{
              endAdornment: defaultUnit ? (
                <InputAdornment position="end">
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
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
            label={t('unitOverride')}
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
            label={t('notesLabel')}
            placeholder={t('notesPlaceholder')}
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
              color: theme.palette.text.secondary,
              fontWeight: 600,
              '&:hover': { backgroundColor: theme.palette.action.hover },
            }}
          >
            {t('cancel')}
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={disabled || isSubmitting}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            fontWeight: 600,
            px: 3,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.custom.brand.darker} 100%)`,
            },
          }}
        >
          {isSubmitting
            ? t('saving')
            : isEditing
              ? t('updateResult')
              : t('saveResult')}
        </Button>
      </Box>
    </Box>
  );
});

export default ResultEntryForm;
