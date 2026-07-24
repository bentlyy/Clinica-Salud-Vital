import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Switch,
  FormControlLabel,
  Paper,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AddLabResultsInput } from '../types/lab.types';

const resultRowSchema = z.object({
  test_name: z.string().min(1, 'Nombre del test requerido'),
  value: z.string().min(1, 'Valor requerido'),
  unit: z.string().optional(),
  reference_range: z.string().optional(),
  is_normal: z.boolean(),
  notes: z.string().optional(),
});

const resultsFormSchema = z.object({
  results: z.array(resultRowSchema).min(1, 'Agrega al menos un resultado'),
});

type ResultsFormValues = z.infer<typeof resultsFormSchema>;

interface LabResultsFormProps {
  onSubmit: (data: AddLabResultsInput) => void;
  isLoading?: boolean;
}

const defaultRow = {
  test_name: '',
  value: '',
  unit: '',
  reference_range: '',
  is_normal: true,
  notes: '',
};

export function LabResultsForm({ onSubmit, isLoading }: LabResultsFormProps) {
  const theme = useTheme();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResultsFormValues>({
    resolver: zodResolver(resultsFormSchema),
    defaultValues: {
      results: [{ ...defaultRow }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'results',
  });

  const onFormSubmit = (data: ResultsFormValues) => {
    onSubmit(data);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onFormSubmit)}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
          Resultados de Laboratorio
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Add />}
          onClick={() => append({ ...defaultRow })}
          sx={{ borderColor: theme.palette.divider, color: theme.palette.text.primary }}
        >
          Agregar Resultado
        </Button>
      </Box>

      {errors.results && (
        <Typography variant="body2" sx={{ color: theme.palette.error.main, mb: 1 }}>
          {errors.results.message}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {fields.map((field, index) => (
          <Paper
            key={field.id}
            elevation={0}
            sx={{
              p: 2,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '10px',
              backgroundColor: theme.palette.custom.surface.muted,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                Test #{index + 1}
              </Typography>
              {fields.length > 1 && (
                <IconButton
                  size="small"
                  onClick={() => remove(index)}
                  sx={{ color: theme.palette.error.main }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              )}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 1 }}>
              <Controller
                name={`results.${index}.test_name`}
                control={control}
                render={({ field: f }) => (
                  <TextField
                    {...f}
                    label="Nombre del Test"
                    size="small"
                    error={!!errors.results?.[index]?.test_name}
                    helperText={errors.results?.[index]?.test_name?.message}
                  />
                )}
              />
              <Controller
                name={`results.${index}.value`}
                control={control}
                render={({ field: f }) => (
                  <TextField
                    {...f}
                    label="Valor"
                    size="small"
                    error={!!errors.results?.[index]?.value}
                    helperText={errors.results?.[index]?.value?.message}
                  />
                )}
              />
              <Controller
                name={`results.${index}.unit`}
                control={control}
                render={({ field: f }) => (
                  <TextField {...f} label="Unidad (ej: mg/dL)" size="small" />
                )}
              />
              <Controller
                name={`results.${index}.reference_range`}
                control={control}
                render={({ field: f }) => (
                  <TextField {...f} label="Rango de Referencia" size="small" />
                )}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Controller
                name={`results.${index}.is_normal`}
                control={control}
                render={({ field: f }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={f.value}
                        onChange={f.onChange}
                        size="small"
                        color="success"
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ color: f.value ? theme.palette.success.dark : theme.palette.error.main, fontWeight: 500 }}>
                        {f.value ? 'Normal' : 'Anormal'}
                      </Typography>
                    }
                  />
                )}
              />
              <Controller
                name={`results.${index}.notes`}
                control={control}
                render={({ field: f }) => (
                  <TextField {...f} label="Notas" size="small" sx={{ flex: 1 }} />
                )}
              />
            </Box>
          </Paper>
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Button
        type="submit"
        variant="contained"
        disabled={isLoading}
        sx={{ mt: 1 }}
      >
        {isLoading ? 'Guardando...' : 'Guardar Resultados'}
      </Button>
    </Box>
  );
}
