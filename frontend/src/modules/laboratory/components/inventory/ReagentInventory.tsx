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
  LinearProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DataTable, type DataTableColumn } from '@/shared/components/ui/DataTable';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ScienceIcon from '@mui/icons-material/Science';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import type { LabReagent, LabArea } from '../../types/lab.types';
import { formatDate } from '@/shared/utils/localeUtils';

// ── Props ────────────────────────────────────────────────────────────────────

interface ReagentInventoryProps {
  reagents?: LabReagent[];
  onAdd?: () => void;
  onEdit?: (item: LabReagent) => void;
  isLoading?: boolean;
  areas?: LabArea[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getExpirationStatus(
  dateStr: string,
): { color: string; bgColor: string; label: string } {
  const expDate = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil(
    (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    return { color: 'error.dark', bgColor: 'custom.status.error.bg', label: 'Vencido' };
  }
  if (diffDays <= 30) {
    return { color: 'warning.dark', bgColor: 'custom.status.warning.bg', label: `${diffDays}d` };
  }
  return {
    color: 'success.dark',
    bgColor: 'custom.status.success.bg',
    label: formatDate(expDate),
  };
}

function getStockStatus(
  current: number,
  min: number,
): { color: string; bgColor: string; severity: 'error' | 'warning' | 'ok' } {
  if (current <= 0 || current < min * 0.5) {
    return { color: 'error.dark', bgColor: 'custom.status.error.bg', severity: 'error' };
  }
  if (current < min) {
    return { color: 'warning.dark', bgColor: 'custom.status.warning.bg', severity: 'warning' };
  }
  return { color: 'success.dark', bgColor: 'custom.status.success.bg', severity: 'ok' };
}

// ── Component ────────────────────────────────────────────────────────────────

export const ReagentInventory = memo(function ReagentInventory({
  reagents = [],
  onAdd,
  onEdit,
  isLoading = false,
  areas = [],
}: ReagentInventoryProps) {
  const theme = useTheme();
  const { t } = useTranslation('lab');
  const [areaFilter, setAreaFilter] = useState<number | ''>('');

  const resolveColor = (token: string) => {
    const parts = token.split('.');
    let obj: Record<string, unknown> = theme.palette as unknown as Record<string, unknown>;
    for (const p of parts) obj = (obj?.[p] ?? {}) as Record<string, unknown>;
    return typeof obj === 'string' ? obj : token;
  };

  const filtered = useMemo(() => {
    if (areaFilter === '') return reagents;
    return reagents.filter((r) => r.lab_area_id === areaFilter);
  }, [reagents, areaFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: reagents.length,
      lowStock: reagents.filter((r) => r.current_stock < r.min_stock && r.current_stock > 0)
        .length,
      expired: reagents.filter((r) => new Date(r.expiration_date) < now).length,
      expiringSoon: reagents.filter((r) => {
        const diff = Math.ceil(
          (new Date(r.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        return diff >= 0 && diff <= 30;
      }).length,
    };
  }, [reagents]);

  const columns: DataTableColumn<LabReagent>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (reagent) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScienceIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {reagent.name}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'lot_number',
      header: 'Lote',
      render: (reagent) => (
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontFamily: 'monospace' }}>
          {reagent.lot_number}
        </Typography>
      ),
    },
    {
      key: 'supplier',
      header: 'Proveedor',
      render: (reagent) => (
        <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
          {reagent.supplier ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'current_stock',
      header: 'Stock',
      render: (reagent) => {
        const stockStatus = getStockStatus(reagent.current_stock, reagent.min_stock);
        const stockPct =
          reagent.min_stock > 0
            ? Math.min(100, (reagent.current_stock / (reagent.min_stock * 2)) * 100)
            : 100;
        return (
          <Box sx={{ minWidth: 80 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: resolveColor(stockStatus.color) }}>
              {reagent.current_stock} {reagent.unit}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={stockPct}
              sx={{
                height: 4,
                borderRadius: 2,
                mt: 0.5,
                backgroundColor: theme.palette.custom.surface.sunken,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: resolveColor(stockStatus.color),
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        );
      },
    },
    {
      key: 'min_stock',
      header: 'Stock Mín.',
      render: (reagent) => (
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          {reagent.min_stock} {reagent.unit}
        </Typography>
      ),
    },
    {
      key: 'expiration_date',
      header: 'Vencimiento',
      render: (reagent) => {
        const expirationStatus = getExpirationStatus(reagent.expiration_date);
        return (
          <Chip
            label={expirationStatus.label}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: resolveColor(expirationStatus.bgColor),
              color: resolveColor(expirationStatus.color),
              borderRadius: '6px',
            }}
          />
        );
      },
    },
    {
      key: 'area',
      header: 'Área',
      render: (reagent) => (
        <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
          {reagent.area?.name ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'active',
      header: 'Estado',
      render: (reagent) => (
        <Chip
          label={reagent.active ? 'Activo' : 'Inactivo'}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.7rem',
            fontWeight: 600,
            backgroundColor: reagent.active ? theme.palette.custom.status.success.bg : theme.palette.custom.surface.sunken,
            color: reagent.active ? theme.palette.success.dark : theme.palette.text.secondary,
            borderRadius: '6px',
          }}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (reagent) =>
        onEdit ? (
          <Tooltip title="Editar" arrow>
            <IconButton
              size="small"
              onClick={() => onEdit(reagent)}
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
        <Skeleton variant="text" width="45%" height={28} />
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
          Inventario de Reactivos
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
            Agregar Reactivo
          </Button>
        )}
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
        {[
          {
            label: 'Total Reactivos',
            value: stats.total,
            color: theme.palette.text.primary,
            icon: <ScienceIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />,
          },
          {
            label: 'Stock Bajo',
            value: stats.lowStock,
            color: stats.lowStock > 0 ? theme.palette.warning.dark : theme.palette.success.dark,
            icon: <WarningAmberIcon sx={{ fontSize: 18, color: stats.lowStock > 0 ? theme.palette.warning.dark : theme.palette.success.dark }} />,
          },
          {
            label: 'Vencidos',
            value: stats.expired,
            color: stats.expired > 0 ? theme.palette.error.dark : theme.palette.success.dark,
            icon: <WarningAmberIcon sx={{ fontSize: 18, color: stats.expired > 0 ? theme.palette.error.dark : theme.palette.success.dark }} />,
          },
          {
            label: 'Por Vencer',
            value: stats.expiringSoon,
            color: stats.expiringSoon > 0 ? theme.palette.warning.dark : theme.palette.success.dark,
            icon: <Inventory2Icon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />,
          },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              px: 2,
              py: 1,
              border: `1px solid ${theme.palette.custom.surface.sunken}`,
              borderRadius: '10px',
              backgroundColor: theme.palette.custom.surface.muted,
              minWidth: 120,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
              {stat.icon}
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                {stat.label}
              </Typography>
            </Box>
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
      <DataTable<LabReagent>
        columns={columns}
        data={filtered}
        keyExtractor={(reagent) => reagent.id}
        emptyTitle="No hay reactivos registrados"
        rowsPerPage={filtered.length || 1}
      />
    </Paper>
  );
});

export default ReagentInventory;
