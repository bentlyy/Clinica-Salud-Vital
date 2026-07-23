import { memo, useState, useCallback, useMemo } from 'react';
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
        border: '1px solid #e5e7eb',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
            Almacenamiento de Muestras
          </Typography>
          <Chip
            label={`${unlocatedSamples.length} sin ubicación`}
            size="small"
            sx={{
              backgroundColor: unlocatedSamples.length > 0 ? '#fef3c7' : '#dcfce7',
              color: unlocatedSamples.length > 0 ? '#d97706' : '#16a34a',
              fontWeight: 500,
              fontSize: '0.7rem',
            }}
          />
        </Box>
        {isLoading && <CircularProgress size={20} sx={{ color: '#0d9488' }} />}
      </Box>

      {/* ── Section: Sin Ubicación ───────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <ScienceIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#d97706' }}>
            Sin Ubicación
          </Typography>
          <Chip
            label={unlocatedSamples.length}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: '#fef3c7',
              color: '#d97706',
            }}
          />
        </Box>

        {unlocatedSamples.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 3,
              backgroundColor: '#f9fafb',
              borderRadius: '10px',
              border: '1px dashed #e5e7eb',
            }}
          >
            <WarehouseIcon sx={{ fontSize: 32, color: '#d1d5db', mb: 0.5 }} />
            <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>
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
          <WarehouseIcon sx={{ fontSize: 18, color: '#0d9488' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#0d9488' }}>
            Almacenadas
          </Typography>
          <Chip
            label={locatedSamples.length}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: '#f0fdfa',
              color: '#0d9488',
            }}
          />
        </Box>

        {locatedSamples.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 3 }}>
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
      <TableRow sx={{ '&:hover': { backgroundColor: '#fffbeb' } }}>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937', fontFamily: 'monospace' }}>
            {sample.sample_code}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            {getSampleTypeLabel(sample.sample_type)}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
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
              color: '#0d9488',
              '&:hover': { backgroundColor: '#f0fdfa' },
            }}
            title="Asignar ubicación"
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
                backgroundColor: '#f9fafb',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
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
                    label="Ubicación de Almacenamiento"
                    size="small"
                    placeholder="Ej: Refrigerador 2 - Nivel 3 - Posición A4"
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
      <TableRow sx={{ '&:hover': { backgroundColor: '#f0fdfa' } }}>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937', fontFamily: 'monospace' }}>
            {sample.sample_code}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            {getSampleTypeLabel(sample.sample_type)}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            icon={<WarehouseIcon sx={{ fontSize: 12 }} />}
            label={sample.storage_location}
            size="small"
            sx={{
              backgroundColor: '#f0fdfa',
              color: '#0d9488',
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
              backgroundColor: isColdStorage ? '#dbeafe' : '#dcfce7',
              color: isColdStorage ? '#2563eb' : '#16a34a',
              fontWeight: 500,
              fontSize: '0.7rem',
            }}
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.75rem' }}>
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
              color: '#0d9488',
              '&:hover': { backgroundColor: '#f0fdfa' },
            }}
            title="Editar ubicación"
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
                backgroundColor: '#f9fafb',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
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
                    label="Nueva Ubicación"
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
