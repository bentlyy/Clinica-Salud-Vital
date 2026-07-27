import { memo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Collapse,
  TextField,
  MenuItem,
  IconButton,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import AddIcon from '@mui/icons-material/Add';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LabSample } from '../../types/lab.types';
import { SAMPLE_TYPE_OPTIONS, CONTAINER_TYPE_OPTIONS } from '../../types/lab.types';

// ── Schema ──────────────────────────────────────────────────────────────────

const aliquotSchema = z.object({
  container_type: z.string().min(1, 'Tipo de contenedor requerido'),
  volume: z.number().min(0.1, 'Volumen debe ser mayor a 0'),
  label: z.string().min(1, 'Etiqueta requerida').max(50, 'Máximo 50 caracteres'),
});

type AliquotFormValues = z.infer<typeof aliquotSchema>;

// ── Props ───────────────────────────────────────────────────────────────────

interface SampleAliquotProps {
  samples?: LabSample[];
  onAliquot: (data: {
    parentSampleId: number;
    containerType: string;
    volume: number;
    label: string;
  }) => void;
  isLoading?: boolean;
}

// ── Component ───────────────────────────────────────────────────────────────

export const SampleAliquot = memo(function SampleAliquot({
  samples = [],
  onAliquot,
  isLoading = false,
}: SampleAliquotProps) {
  const theme = useTheme();
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const verifiedSamples = samples.filter(
    (s) => s.status === 'verified' || s.status === 'assigned' || s.status === 'processing'
  );

  const handleToggleRow = useCallback((sampleId: number) => {
    setExpandedRow((prev) => (prev === sampleId ? null : sampleId));
  }, []);

  const getSampleTypeLabel = (value: string) =>
    SAMPLE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '14px',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            Alicuotado
          </Typography>
          <Chip
            label={`${verifiedSamples.length} disponibles`}
            size="small"
            sx={{
              backgroundColor: theme.palette.custom.brand.light,
              color: theme.palette.primary.main,
              fontWeight: 500,
              fontSize: '0.7rem',
            }}
          />
        </Box>
        {isLoading && <CircularProgress size={20} sx={{ color: theme.palette.primary.main }} />}
      </Box>

      {verifiedSamples.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 5,
            backgroundColor: theme.palette.action.hover,
            borderRadius: '10px',
            border: `1px dashed ${theme.palette.divider}`,
          }}
        >
          <ContentPasteIcon sx={{ fontSize: 40, color: theme.palette.text.disabled, mb: 1 }} />
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            No hay muestras verificadas disponibles para alicuotar
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Código Original</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Volumen Disponible</TableCell>
                <TableCell>Alicuotas</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {verifiedSamples.map((sample) => {
                const aliquotCount = samples.filter(
                  (s) => s.repeated_from_id === sample.id
                ).length;

                return (
                  <AliquotRow
                    key={sample.id}
                    sample={sample}
                    aliquotCount={aliquotCount}
                    expanded={expandedRow === sample.id}
                    onToggle={handleToggleRow}
                    onSubmit={onAliquot}
                    isLoading={isLoading}
                    getSampleTypeLabel={getSampleTypeLabel}
                  />
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
});

// ── Row Sub-Component ───────────────────────────────────────────────────────

interface AliquotRowProps {
  sample: LabSample;
  aliquotCount: number;
  expanded: boolean;
  onToggle: (id: number) => void;
  onSubmit: SampleAliquotProps['onAliquot'];
  isLoading: boolean;
  getSampleTypeLabel: (value: string) => string;
}

const AliquotRow = memo(function AliquotRow({
  sample,
  aliquotCount,
  expanded,
  onToggle,
  onSubmit,
  isLoading,
  getSampleTypeLabel,
}: AliquotRowProps) {
  const theme = useTheme();
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AliquotFormValues>({
    resolver: zodResolver(aliquotSchema),
    defaultValues: {
      container_type: '',
      volume: undefined as unknown as number,
      label: '',
    },
  });

  const watchedVolume = watch('volume');
  const maxVolume = sample.volume ?? 0;
  const volumePercent = maxVolume > 0 ? Math.min((watchedVolume / maxVolume) * 100, 100) : 0;

  const handleFormSubmit = (data: AliquotFormValues) => {
    onSubmit({
      parentSampleId: sample.id,
      containerType: data.container_type,
      volume: data.volume,
      label: data.label,
    });
    reset();
  };

  const handleCancel = () => {
    reset();
    onToggle(sample.id);
  };

  return (
    <>
      <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.action.hover } }}>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary, fontFamily: 'monospace' }}>
            {sample.sample_code}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {getSampleTypeLabel(sample.sample_type)}
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
              {sample.volume ? `${sample.volume} ml` : '—'}
            </Typography>
            {maxVolume > 0 && (
              <LinearProgress
                variant="determinate"
                value={volumePercent}
                sx={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.palette.divider,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: volumePercent > 80 ? theme.palette.warning.main : theme.palette.primary.main,
                    borderRadius: 2,
                  },
                }}
              />
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={aliquotCount}
            size="small"
            sx={{
              backgroundColor: aliquotCount > 0 ? theme.palette.success.light : theme.palette.action.hover,
              color: aliquotCount > 0 ? theme.palette.success.dark : theme.palette.text.secondary,
              fontWeight: 600,
              fontSize: '0.75rem',
              minWidth: 28,
            }}
          />
        </TableCell>
        <TableCell align="right">
          <IconButton
            size="small"
            onClick={() => onToggle(sample.id)}
            disabled={isLoading}
            sx={{
              color: theme.palette.primary.main,
              '&:hover': { backgroundColor: theme.palette.custom.brand.light },
            }}
          >
            {expanded ? <ExpandLessIcon /> : <AddIcon />}
          </IconButton>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={5} sx={{ p: 0, border: 'none' }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box
              component="form"
              onSubmit={handleSubmit(handleFormSubmit)}
              sx={{
                p: 2.5,
                mx: 1,
                mb: 1.5,
                backgroundColor: theme.palette.action.hover,
                borderRadius: '10px',
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 0.5 }}>
                Nueva Alicuota — {sample.sample_code}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 2 }}>
                Volumen disponible: {maxVolume} ml
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5, mb: 2 }}>
                <Controller
                  name="container_type"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Tipo de Contenedor"
                      size="small"
                      error={!!errors.container_type}
                      helperText={errors.container_type?.message}
                    >
                      {CONTAINER_TYPE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />

                <Controller
                  name="volume"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Volumen (ml)"
                      type="number"
                      size="small"
                      inputProps={{ min: 0.1, max: maxVolume, step: 0.1 }}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      error={!!errors.volume}
                      helperText={errors.volume?.message ?? (watchedVolume > maxVolume ? `Máximo: ${maxVolume} ml` : '')}
                    />
                  )}
                />

                <Controller
                  name="label"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Etiqueta"
                      size="small"
                      error={!!errors.label}
                      helperText={errors.label?.message}
                      placeholder="Ej: Aliquota #1 - Glucosa"
                    />
                  )}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={handleCancel}
                  disabled={isLoading}
                  sx={{ color: theme.palette.text.secondary }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  size="small"
                  disabled={isLoading || (watchedVolume != null && watchedVolume > maxVolume)}
                  startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
                >
                  Crear
                </Button>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
});
