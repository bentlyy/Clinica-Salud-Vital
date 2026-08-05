import { Box, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import Search from '@mui/icons-material/Search';
import Close from '@mui/icons-material/Close';
import type { Tenant } from '@/modules/super-admin/types/super-admin.types';

interface SpecialtyFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  clinicFilter: string;
  onClinicFilterChange: (value: string) => void;
  clinics: Tenant[];
  isSuperAdmin: boolean;
}

export function SpecialtyFilters({
  search,
  onSearchChange,
  clinicFilter,
  onClinicFilterChange,
  clinics,
  isSuperAdmin,
}: SpecialtyFiltersProps) {
  const { t } = useTranslation('specialties');
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'center',
        flexWrap: 'wrap',
        mb: 3,
      }}
    >
      <TextField
        fullWidth
        size="small"
        placeholder={t('searchPlaceholder')}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ flex: { xs: '1 1 100%', md: '1 1 320px' }, maxWidth: { md: 420 } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: theme.palette.grey[500], fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onSearchChange('')} aria-label="clear search">
                  <Close sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />
      {isSuperAdmin && (
        <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 220 } }}>
          <InputLabel id="specialty-clinic-filter">{t('clinicFilter')}</InputLabel>
          <Select
            labelId="specialty-clinic-filter"
            label={t('clinicFilter')}
            value={clinicFilter}
            onChange={(e) => onClinicFilterChange(e.target.value)}
          >
            <MenuItem value="">{t('allClinics')}</MenuItem>
            {clinics.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );
}
