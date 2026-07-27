import { memo, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  TextField,
  IconButton,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import ScienceIcon from '@mui/icons-material/Science';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LabSample } from '../../types/lab.types';
import { SAMPLE_TYPE_OPTIONS } from '../../types/lab.types';

// ── Schema ──────────────────────────────────────────────────────────────────

const storageSchema = z.object({
  storage_location: z.string().min(1, 'Ubicación requerida').max(100, 'Máximo 100 caracteres'),
});

type StorageFormValues = z.infer<typeof storageSchema>;

// ── Props ───────────────────────────────────────────────────────────────────

interface SampleStorageProps {
  samples?: LabSample[];
  onUpdateStorage: (id: number, location: string) => void;
  isLoading?: boolean;
}

// ── Component ───────────────────────────────────────────────────────────────

export const SampleStorage = memo(function SampleStorage({
  samples = [],
  onUpdateStorage,
  isLoading = false,
}: SampleStorageProps) {
  const theme = useTheme();
  const [editingId, setEditingId] = useState<number | null>(null);

  const unlocatedSamples = useMemo(
    () => samples.filter((s) => !s.storage_location && s.status !== 'disposed'),
    [samples]
  );

  const locatedSamples = useMemo(
    () => samples.filter((s) => !!s.storage_location && s.status !== 'disposed'),
    [samples]
  );

  const handleEdit = useCallback((id: number) => {
    setEditingId((prev) => (prev === id ? null : id));
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
            Almacenamiento de Muestras
          </Typography>
          <Chip
            label={`${unlocatedSamples.length} sin ubicación`}
            size="small"
            sx={{
              backgroundColor: unlocatedSamples.length > 0 ? theme.palette.custom.status.warning.bg : theme.palette.custom.status.success.bg,
              color: unlocatedSamples.length > 0 ? theme.palette.warning.dark : theme.palette.success.main,
              fontWeight: 500,
              fontSize: '0.7rem',
            }}
          />
        </Box>
        {isLoading && <CircularProgress size={20} sx={{ color: theme.palette.primary.main }} />}
      </Box>

      {/* ── Section: Sin Ubicación ───────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <ScienceIcon sx={{ fontSize: 18, color: theme.palette.warning.main }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.warning.dark }}>
            Sin Ubicación
          </Typography>
          <Chip
            label={unlocatedSamples.length}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: theme.palette.custom.status.warning.bg,
              color: theme.palette.warning.dark,
            }}
          />
        </Box>

        {unlocatedSamples.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 3,
              backgroundColor: theme.palette.custom.surface.muted,
              borderRadius: '10px',
              border: `1px dashed ${theme.palette.divider}`,
            }}
          >
            <WarehouseIcon sx={{ fontSize: 32, color: theme.palette.divider, mb: 0.5 }} />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}>
              Todas las muestras tienen ubicación asignada
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Fecha Recibimiento</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unlocatedSamples.map((sample) => (
                  <UnlocatedRow
                    key={sample.id}
                    sample={sample}
                    isEditing={editingId === sample.id}
                    onEdit={handleEdit}
                    onSubmit={onUpdateStorage}
                    isLoading={isLoading}
                    getSampleTypeLabel={getSampleTypeLabel}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* ── Section: Almacenadas ─────────────────────────────────────────── */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <WarehouseIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
            Almacenadas
          </Typography>
          <Chip
            label={locatedSamples.length}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: theme.palette.custom.brand.lightest,
              color: theme.palette.primary.main,
            }}
          />
        </Box>

        {locatedSamples.length === 0 ? (
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textAlign: 'center', py: 3 }}>
            No hay muestras almacenadas
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Ubicación</TableCell>
                  <TableCell>Temperatura</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {locatedSamples.map((sample) => (
                  <LocatedRow
                    key={sample.id}
                    sample={sample}
                    isEditing={editingId === sample.id}
                    onEdit={handleEdit}
                    onSubmit={onUpdateStorage}
                    isLoading={isLoading}
                    getSampleTypeLabel={getSampleTypeLabel}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Paper>
  );
});

// ── Unlocated Row ───────────────────────────────────────────────────────────

interface RowProps {
  sample: LabSample;
  isEditing: boolean;
  onEdit: (id: number) => void;
  onSubmit: (id: number, location: string) => void;
  isLoading: boolean;
  getSampleTypeLabel: (value: string) => string;
}

const UnlocatedRow = memo(function UnlocatedRow({
  sample,
  isEditing,
  onEdit,
  onSubmit,
  isLoading,
  getSampleTypeLabel,
}: RowProps) {
  const theme = useTheme();
  const { t } = useTranslation('lab');
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<StorageFormValues>({
    resolver: zodResolver(storageSchema),
    defaultValues: { storage_location: '' },
  });

  const handleFormSubmit = (data: StorageFormValues) => {
    onSubmit(sample.id, data.storage_location);
  };

  return (
    <>
      <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.custom.status.warning.bg } }}>
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
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {sample.reception_time
              ? new Date(sample.reception_time).toLocaleDateString('es-CL')
              : '—'}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <IconButton
            size="small"
            onClick={() => onEdit(sample.id)}
            disabled={isLoading}
            sx={{
              color: theme.palette.primary.main,
              '&:hover': { backgroundColor: theme.palette.custom.brand.lightest },
            }}
            title={t('assign_location')}
          >
            {isEditing ? <SaveIcon fontSize="small" /> : <EditIcon fontSize="small" />}
          </IconButton>
        </TableCell>
      </TableRow>

      {isEditing && (
        <TableRow>
          <TableCell colSpan={4} sx={{ p: 0, border: 'none' }}>
            <Box
              component="form"
              onSubmit={handleSubmit(handleFormSubmit)}
              sx={{
                p: 2,
                mx: 1,
                mb: 1,
                backgroundColor: theme.palette.custom.surface.muted,
                borderRadius: '10px',
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                gap: 1.5,
                alignItems: 'flex-end',
              }}
            >
              <Controller
                name="storage_location"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('storage_location')}
                    size="small"
                    placeholder={t('storage_location_placeholder')}
                    error={!!errors.storage_location}
                    helperText={errors.storage_location?.message}
                    sx={{ flex: 1 }}
                  />
                )}
              />
              <Button
                type="submit"
                variant="contained"
                size="small"
                disabled={isLoading}
                startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
              >
                Guardar
              </Button>
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

// ── Located Row ─────────────────────────────────────────────────────────────

const LocatedRow = memo(function LocatedRow({
  sample,
  isEditing,
  onEdit,
  onSubmit,
  isLoading,
  getSampleTypeLabel,
}: RowProps) {
  const theme = useTheme();
  const { t } = useTranslation('lab');
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<StorageFormValues>({
    resolver: zodResolver(storageSchema),
    defaultValues: { storage_location: sample.storage_location ?? '' },
  });

  const handleFormSubmit = (data: StorageFormValues) => {
    onSubmit(sample.id, data.storage_location);
  };

  const isColdStorage =
    sample.sample_type === 'blood' ||
    sample.sample_type === 'csf' ||
    sample.container_type === 'tube';

  return (
    <>
      <TableRow sx={{ '&:hover': { backgroundColor: theme.palette.custom.brand.lightest } }}>
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
          <Chip
            icon={<WarehouseIcon sx={{ fontSize: 12 }} />}
            label={sample.storage_location}
            size="small"
            sx={{
              backgroundColor: theme.palette.custom.brand.lightest,
              color: theme.palette.primary.main,
              fontWeight: 500,
              fontSize: '0.7rem',
            }}
          />
        </TableCell>
        <TableCell>
          <Chip
            icon={isColdStorage ? <AcUnitIcon sx={{ fontSize: 12 }} /> : <ThermostatIcon sx={{ fontSize: 12 }} />}
            label={isColdStorage ? '2-8 °C' : 'Ambiente'}
            size="small"
            sx={{
              backgroundColor: isColdStorage ? theme.palette.custom.status.info.bg : theme.palette.custom.status.success.bg,
              color: isColdStorage ? theme.palette.info.dark : theme.palette.success.main,
              fontWeight: 500,
              fontSize: '0.7rem',
            }}
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}>
            {sample.reception_time
              ? new Date(sample.reception_time).toLocaleDateString('es-CL')
              : '—'}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <IconButton
            size="small"
            onClick={() => onEdit(sample.id)}
            disabled={isLoading}
            sx={{
              color: theme.palette.primary.main,
              '&:hover': { backgroundColor: theme.palette.custom.brand.lightest },
            }}
            title={t('edit_location')}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>

      {isEditing && (
        <TableRow>
          <TableCell colSpan={6} sx={{ p: 0, border: 'none' }}>
            <Box
              component="form"
              onSubmit={handleSubmit(handleFormSubmit)}
              sx={{
                p: 2,
                mx: 1,
                mb: 1,
                backgroundColor: theme.palette.custom.surface.muted,
                borderRadius: '10px',
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                gap: 1.5,
                alignItems: 'flex-end',
              }}
            >
              <Controller
                name="storage_location"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('new_location')}
                    size="small"
                    error={!!errors.storage_location}
                    helperText={errors.storage_location?.message}
                    sx={{ flex: 1 }}
                  />
                )}
              />
              <Button
                type="submit"
                variant="contained"
                size="small"
                disabled={isLoading}
                startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
              >
                Actualizar
              </Button>
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});
