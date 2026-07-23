import { memo, useMemo, useState } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Skeleton,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BuildIcon from '@mui/icons-material/Build';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import type { LabEquipment, LabArea } from '../../types/lab.types';

// ── Props ────────────────────────────────────────────────────────────────────

interface EquipmentInventoryProps {
  equipment?: LabEquipment[];
  onAdd?: () => void;
  onEdit?: (item: LabEquipment) => void;
  isLoading?: boolean;
  areas?: LabArea[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  LabEquipment['status'],
  { label: string; color: string; bgColor: string }
> = {
  online: { label: 'Online', color: '#059669', bgColor: '#ecfdf5' },
  offline: { label: 'Offline', color: '#dc2626', bgColor: '#fef2f2' },
  maintenance: { label: 'Mantenimiento', color: '#d97706', bgColor: '#fffbeb' },
  calibration: { label: 'Calibración', color: '#2563eb', bgColor: '#eff6ff' },
};

const CONNECTION_LABELS: Record<LabEquipment['connection_type'], string> = {
  manual: 'Manual',
  hl7: 'HL7',
  astm: 'ASTM',
  serial: 'Serial',
  file: 'Archivo',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMaintenanceColor(
  dateStr: string | null,
  theme: ReturnType<typeof useTheme>,
): { color: string; label: string } {
  if (!dateStr) return { color: '#9ca3af', label: '—' };

  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { color: theme.palette.error.main, label: 'Vencido' };
  }
  if (diffDays <= 30) {
    return { color: theme.palette.warning.main, label: `${diffDays}d` };
  }
  return { color: theme.palette.success.main, label: date.toLocaleDateString('es-CL') };
}

// ── Component ────────────────────────────────────────────────────────────────

export const EquipmentInventory = memo(function EquipmentInventory({
  equipment = [],
  onAdd,
  onEdit,
  isLoading = false,
  areas = [],
}: EquipmentInventoryProps) {
  const theme = useTheme();
  const [areaFilter, setAreaFilter] = useState<number | ''>('');

  const filtered = useMemo(() => {
    if (areaFilter === '') return equipment;
    return equipment.filter((eq) => eq.lab_area_id === areaFilter);
  }, [equipment, areaFilter]);

  const stats = useMemo(
    () => ({
      total: equipment.length,
      online: equipment.filter((e) => e.status === 'online').length,
      maintenanceNeeded: equipment.filter((e) => {
        if (!e.next_maintenance) return false;
        const diff = Math.ceil(
          (new Date(e.next_maintenance).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        return diff <= 14;
      }).length,
    }),
    [equipment],
  );

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
        <Skeleton variant="rectangular" width="100%" height={44} sx={{ mt: 2, borderRadius: '10px' }} />
        <Skeleton variant="rectangular" width="100%" height={240} sx={{ mt: 2, borderRadius: '10px' }} />
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
          Inventario de Equipos
        </Typography>
        {onAdd && (
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={onAdd}
            sx={{
              background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
              },
            }}
          >
            Agregar Equipo
          </Button>
        )}
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Equipos', value: stats.total, color: '#374151' },
          { label: 'Online', value: stats.online, color: '#059669' },
          { label: 'Mto. Próximo', value: stats.maintenanceNeeded, color: '#d97706' },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              px: 2,
              py: 1,
              border: '1px solid #f3f4f6',
              borderRadius: '10px',
              backgroundColor: '#f9fafb',
            }}
          >
            <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500 }}>
              {stat.label}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: stat.color, lineHeight: 1.2 }}>
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Filter */}
      {areas.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
          <InputLabel id="area-filter-label">Filtrar por área</InputLabel>
          <Select
            labelId="area-filter-label"
            value={areaFilter}
            label="Filtrar por área"
            onChange={(e) => setAreaFilter(e.target.value === '' ? '' : Number(e.target.value))}
            sx={{ borderRadius: '10px' }}
          >
            <MenuItem value="">
              <em>Todas las áreas</em>
            </MenuItem>
            {areas.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 6,
            gap: 1.5,
          }}
        >
          <InboxOutlinedIcon sx={{ fontSize: 48, color: '#d1d5db' }} />
          <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 500 }}>
            No hay equipos registrados
          </Typography>
        </Box>
      ) : (
        <TableContainer
          sx={{
            border: '1px solid #f3f4f6',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  'Nombre',
                  'Modelo',
                  'Serial',
                  'Área',
                  'Estado',
                  'Conexión',
                  'Último Mant.',
                  'Próx. Mant.',
                  'Acciones',
                ].map((col) => (
                  <TableCell key={col}>{col}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((eq) => {
                const statusCfg = STATUS_CONFIG[eq.status] ?? STATUS_CONFIG.offline;
                const nextMaint = getMaintenanceColor(eq.next_maintenance, theme);

                return (
                  <TableRow key={eq.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PrecisionManufacturingIcon sx={{ fontSize: 18, color: '#6b7280' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                          {eq.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#374151' }}>
                        {eq.model ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#6b7280', fontFamily: 'monospace' }}>
                        {eq.serial_number ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#374151' }}>
                        {eq.area?.name ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusCfg.label}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: statusCfg.bgColor,
                          color: statusCfg.color,
                          borderRadius: '6px',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={CONNECTION_LABELS[eq.connection_type]}
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          borderRadius: '6px',
                          borderColor: '#e5e7eb',
                          color: '#6b7280',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {eq.last_maintenance
                          ? new Date(eq.last_maintenance).toLocaleDateString('es-CL')
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{ color: nextMaint.color, fontWeight: 500 }}
                      >
                        {eq.next_maintenance
                          ? new Date(eq.next_maintenance).toLocaleDateString('es-CL')
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {onEdit && (
                        <Tooltip title="Editar" arrow>
                          <IconButton
                            size="small"
                            onClick={() => onEdit(eq)}
                            sx={{
                              color: '#6b7280',
                              '&:hover': {
                                color: '#0d9488',
                                backgroundColor: '#f0fdfa',
                              },
                            }}
                          >
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
});

export default EquipmentInventory;
