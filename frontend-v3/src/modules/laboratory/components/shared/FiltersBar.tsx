import { memo } from 'react';
import type { SxProps } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { useTheme } from '@mui/material/styles';
import { SearchInput } from './SearchInput';
import {
  LAB_STATUS_LABELS,
  LAB_PRIORITY_LABELS,
  LAB_AREA_OPTIONS,
  type LabFilterState,
  type LabRequestStatus,
  type LabPriority,
  type LabArea,
} from '@/modules/laboratory/types/lab.types';

interface FiltersBarProps {
  filters: LabFilterState;
  onFilterChange: <K extends keyof LabFilterState>(
    key: K,
    value: LabFilterState[K],
  ) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  areas?: LabArea[];
  sx?: SxProps;
}

const STATUS_OPTIONS = Object.entries(LAB_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const PRIORITY_OPTIONS = Object.entries(LAB_PRIORITY_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const selectSx = {
  minWidth: 150,
  fontSize: '0.875rem',
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    fontSize: '0.875rem',
  },
};

export const FiltersBar = memo(function FiltersBar({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
  sx,
}: FiltersBarProps) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 3,
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        ...sx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <SearchInput
          value={filters.search}
          onChange={(val) => onFilterChange('search', val)}
          placeholder="Buscar solicitudes..."
          sx={{ minWidth: 250, flex: '1 1 250px' }}
        />

        {/* Area */}
        <TextField
          select
          size="small"
          label="Area"
          value={filters.areaId}
          onChange={(e) =>
            onFilterChange('areaId', e.target.value === '' ? '' : Number(e.target.value))
          }
          sx={{ ...selectSx, minWidth: 140 }}
        >
          <MenuItem value="">
            <em>Todas</em>
          </MenuItem>
          {LAB_AREA_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Priority */}
        <TextField
          select
          size="small"
          label="Prioridad"
          value={filters.priority}
          onChange={(e) =>
            onFilterChange('priority', e.target.value as LabPriority | '')
          }
          sx={selectSx}
        >
          <MenuItem value="">
            <em>Todas</em>
          </MenuItem>
          {PRIORITY_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Status */}
        <TextField
          select
          size="small"
          label="Estado"
          value={filters.status}
          onChange={(e) =>
            onFilterChange('status', e.target.value as LabRequestStatus | '')
          }
          sx={selectSx}
        >
          <MenuItem value="">
            <em>Todos</em>
          </MenuItem>
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Date from */}
        <TextField
          size="small"
          type="date"
          label="Desde"
          value={filters.dateFrom}
          onChange={(e) => onFilterChange('dateFrom', e.target.value)}
          slotProps={{
            inputLabel: { shrink: true },
          }}
          sx={selectSx}
        />

        {/* Date to */}
        <TextField
          size="small"
          type="date"
          label="Hasta"
          value={filters.dateTo}
          onChange={(e) => onFilterChange('dateTo', e.target.value)}
          slotProps={{
            inputLabel: { shrink: true },
          }}
          sx={selectSx}
        />

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
          {hasActiveFilters && (
            <Tooltip title="Limpiar filtros">
              <IconButton
                size="small"
                onClick={onReset}
                sx={{
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    color: theme.palette.error.main,
                    backgroundColor: `${theme.palette.error.main}08`,
                  },
                }}
              >
                <ClearAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Filtros activos">
            <IconButton
              size="small"
              disabled={!hasActiveFilters}
              sx={{
                color: hasActiveFilters
                  ? theme.palette.primary.main
                  : theme.palette.text.disabled,
              }}
            >
              <FilterListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
});
