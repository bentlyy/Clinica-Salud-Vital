import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
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
import type { Theme } from '@mui/material/styles';
import { DataTable, type DataTableColumn } from '@/shared/components/ui/DataTable';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import type { LabEquipment, LabArea } from '../../types/lab.types';
import { formatDate } from '@/shared/utils/localeUtils';

// ── Props ────────────────────────────────────────────────────────────────────

interface EquipmentInventoryProps {
  equipment?: LabEquipment[];
  onAdd?: () => void;
  onEdit?: (item: LabEquipment) => void;
  isLoading?: boolean;
  areas?: LabArea[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStatusConfig(theme: Theme, status: LabEquipment['status']) {
  const configs: Record<LabEquipment['status'], { label: string; color: string; bgColor: string }> = {
    online: { label: 'Online', color: theme.palette.success.dark, bgColor: theme.palette.custom.status.success.bg },
    offline: { label: 'Offline', color: theme.palette.error.dark, bgColor: theme.palette.custom.status.error.bg },
    maintenance: { label: 'Mantenimiento', color: theme.palette.warning.dark, bgColor: theme.palette.custom.status.warning.bg },
    calibration: { label: 'Calibración', color: theme.palette.info.dark, bgColor: theme.palette.custom.status.info.bg },
  };
  return configs[status] ?? configs.offline;
}

const CONNECTION_LABELS: Record<LabEquipment['connection_type'], string> = {
  manual: 'Manual',
  hl7: 'HL7',
  astm: 'ASTM',
  serial: 'Serial',
  file: 'Archivo',
};

function getMaintenanceColor(
  dateStr: string | null,
  theme: Theme,
): { color: string; label: string } {
  if (!dateStr) return { color: theme.palette.text.secondary, label: '—' };

  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { color: theme.palette.error.main, label: 'Vencido' };
  }
  if (diffDays <= 30) {
    return { color: theme.palette.warning.main, label: `${diffDays}d` };
  }
  return { color: theme.palette.success.main, label: formatDate(date) };
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
  const { t } = useTranslation('lab');
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

  const columns: DataTableColumn<LabEquipment>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (eq) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PrecisionManufacturingIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {eq.name}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'model',
      header: 'Modelo',
      render: (eq) => (
        <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
          {eq.model ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'serial_number',
      header: 'Serial',
      render: (eq) => (
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontFamily: 'monospace' }}>
          {eq.serial_number ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'area',
      header: 'Área',
      render: (eq) => (
        <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
          {eq.area?.name ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (eq) => {
        const statusCfg = getStatusConfig(theme, eq.status);
        return (
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
        );
      },
    },
    {
      key: 'connection_type',
      header: 'Conexión',
      render: (eq) => (
        <Chip
          label={CONNECTION_LABELS[eq.connection_type]}
          size="small"
          variant="outlined"
          sx={{
            height: 22,
            fontSize: '0.7rem',
            fontWeight: 500,
            borderRadius: '6px',
            borderColor: theme.palette.divider,
            color: theme.palette.text.secondary,
          }}
        />
      ),
    },
    {
      key: 'last_maintenance',
      header: 'Último Mant.',
      render: (eq) => (
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          {eq.last_maintenance ? formatDate(eq.last_maintenance) : '—'}
        </Typography>
      ),
    },
    {
      key: 'next_maintenance',
      header: 'Próx. Mant.',
      render: (eq) => {
        const nextMaint = getMaintenanceColor(eq.next_maintenance, theme);
        return (
          <Typography variant="caption" sx={{ color: nextMaint.color, fontWeight: 500 }}>
            {eq.next_maintenance ? formatDate(eq.next_maintenance) : '—'}
          </Typography>
        );
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (eq) =>
        onEdit ? (
          <Tooltip title="Editar" arrow>
            <IconButton
              size="small"
              onClick={() => onEdit(eq)}
              sx={{
                color: theme.palette.text.secondary,
                '&:hover': {
                  color: theme.palette.primary.main,
                  backgroundColor: theme.palette.custom.brand.lightest,
                },
              }}
            >
              <EditIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        ) : null,
    },
  ];

  if (isLoading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: '14px',
          border: `1px solid ${theme.palette.divider}`,
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
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
          Inventario de Equipos
        </Typography>
        {onAdd && (
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={onAdd}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.custom.brand.darker} 100%)`,
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
          { label: 'Total Equipos', value: stats.total, color: theme.palette.text.primary },
          { label: 'Online', value: stats.online, color: theme.palette.success.dark },
          { label: 'Mto. Próximo', value: stats.maintenanceNeeded, color: theme.palette.warning.dark },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              px: 2,
              py: 1,
              border: `1px solid ${theme.palette.custom.surface.sunken}`,
              borderRadius: '10px',
              backgroundColor: theme.palette.custom.surface.muted,
            }}
          >
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
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
        <FormControl size="small" sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { xs: 0, sm: 200 }, mb: 2 }}>
          <InputLabel id="area-filter-label">{t('filterByArea')}</InputLabel>
          <Select
            labelId="area-filter-label"
            value={areaFilter}
            label={t('filterByArea')}
            onChange={(e) => setAreaFilter(e.target.value === '' ? '' : Number(e.target.value))}
            sx={{ borderRadius: '10px' }}
          >
            <MenuItem value="">
              <em>{t('allAreas')}</em>
            </MenuItem>
            {areas.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Table */}
      <DataTable<LabEquipment>
        columns={columns}
        data={filtered}
        keyExtractor={(eq) => eq.id}
        emptyTitle="No hay equipos registrados"
        rowsPerPage={filtered.length || 1}
      />
    </Paper>
  );
});

export default EquipmentInventory;
