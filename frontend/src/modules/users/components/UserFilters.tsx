import { Box, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import Search from '@mui/icons-material/Search';
import FilterAltOffOutlined from '@mui/icons-material/FilterAltOffOutlined';
import type { UserRole } from '../types/user.types';

export interface UserFiltersState {
  search: string;
  role: UserRole | '';
  status: '' | 'active' | 'inactive';
}

interface UserFiltersProps {
  filters: UserFiltersState;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: UserRole | '') => void;
  onStatusChange: (value: '' | 'active' | 'inactive') => void;
  onClear: () => void;
}

const ROLE_OPTIONS: Array<{ value: UserRole | ''; labelKey: string }> = [
  { value: '', labelKey: 'roleLabels.all' },
  { value: 'admin', labelKey: 'roleLabels.admin' },
  { value: 'doctor', labelKey: 'roleLabels.doctor' },
  { value: 'lab_technician', labelKey: 'roleLabels.lab_technician' },
  { value: 'patient', labelKey: 'roleLabels.patient' },
  { value: 'user', labelKey: 'roleLabels.user' },
];

export function UserFilters({
  filters,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onClear,
}: UserFiltersProps) {
  const { t } = useTranslation('users');
  const theme = useTheme();
  const hasFilters = filters.search !== '' || filters.role !== '' || filters.status !== '';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { md: 'center' },
        gap: 1.5,
        p: 2,
        mb: 3,
        borderRadius: '16px',
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <TextField
        size="small"
        fullWidth
        placeholder={t('searchPlaceholder')}
        value={filters.search}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ flex: { xs: '1 1 100%', md: '1 1 320px' }, maxWidth: { md: 420 } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
              </InputAdornment>
            ),
          },
        }}
      />

      <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 160 } }}>
        <InputLabel id="user-role-filter">{t('role')}</InputLabel>
        <Select
          labelId="user-role-filter"
          label={t('role')}
          value={filters.role}
          onChange={(e) => onRoleChange(e.target.value as UserRole | '')}
        >
          {ROLE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 160 } }}>
        <InputLabel id="user-status-filter">{t('status')}</InputLabel>
        <Select
          labelId="user-status-filter"
          label={t('status')}
          value={filters.status}
          onChange={(e) => onStatusChange(e.target.value as '' | 'active' | 'inactive')}
        >
          <MenuItem value="">{t('roleLabels.all')}</MenuItem>
          <MenuItem value="active">{t('status_active')}</MenuItem>
          <MenuItem value="inactive">{t('status_inactive')}</MenuItem>
        </Select>
      </FormControl>

      {hasFilters && (
        <IconButton
          size="small"
          onClick={onClear}
          aria-label={t('clearFilters')}
          sx={{
            ml: { md: 'auto' },
            color: theme.palette.text.secondary,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '8px',
            '&:hover': { color: theme.palette.primary.main, borderColor: theme.palette.primary.main },
          }}
        >
          <FilterAltOffOutlined sx={{ fontSize: 18 }} />
        </IconButton>
      )}
    </Box>
  );
}
