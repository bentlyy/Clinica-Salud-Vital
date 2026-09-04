import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Search from '@mui/icons-material/Search';
import People from '@mui/icons-material/People';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { DataTable, type DataTableColumn } from '@/shared/components/ui/DataTable';
import { formatDate } from '@/shared/utils/localeUtils';
import { usePatientList } from '../hooks/usePatients';
import type { Patient } from '../types/patient.types';

export default function PatientsPage() {
  const theme = useTheme();
  const { t } = useTranslation('patients');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('');

  const { data, isLoading, error, refetch } = usePatientList({
    page: page + 1,
    limit: rowsPerPage,
    search: search || undefined,
    gender: genderFilter || undefined,
  });

  const patients = data?.data ?? [];
  const total = data?.total ?? 0;

  const columns = useMemo<DataTableColumn<Patient>[]>(
    () => [
      {
        key: 'name',
        header: t('name'),
        render: (patient) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={patient.avatar_url}
              sx={{
                width: 36,
                height: 36,
                backgroundColor: theme.palette.primary.main,
                fontSize: '0.8rem',
              }}
            >
              {patient.name.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              {patient.name}
            </Typography>
          </Box>
        ),
      },
      {
        key: 'email',
        header: t('emailLabel'),
        render: (patient) => (
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {patient.email}
          </Typography>
        ),
      },
      {
        key: 'phone',
        header: t('phoneLabel'),
        render: (patient) => (
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {patient.phone || '—'}
          </Typography>
        ),
      },
      {
        key: 'gender',
        header: t('gender'),
        render: (patient) => (
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {patient.gender === 'male'
              ? t('genderFilters.male')
              : patient.gender === 'female'
              ? t('genderFilters.female')
              : patient.gender || '—'}
          </Typography>
        ),
      },
      {
        key: 'is_active',
        header: t('statusLabel'),
        render: (patient) => (
          <Chip
            label={patient.is_active ? t('active') : t('inactive')}
            size="small"
            sx={{
              backgroundColor: patient.is_active ? theme.palette.custom.status.success.bg : theme.palette.custom.status.error.bg,
              color: patient.is_active ? theme.palette.custom.status.success.text : theme.palette.custom.status.error.text,
              fontWeight: 600,
            }}
          />
        ),
      },
      {
        key: 'created_at',
        header: t('colDate', 'Registro'),
        render: (patient) => (
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {formatDate(patient.created_at)}
          </Typography>
        ),
      },
    ],
    [t, theme],
  );

  if (isLoading) return <LoadingState message={t('loading_patients')} />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title={t('title')}
        subtitle={t('resultsCount', { total })}
      />

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder={t('searchPlaceholder', 'Buscar por nombre, email...')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ flex: { xs: '1 1 100%', md: 1 }, minWidth: { xs: '100%', md: 250 } }}
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
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 150 } }}>
            <InputLabel>{t('gender')}</InputLabel>
            <Select
              value={genderFilter}
              label={t('gender')}
              onChange={(e) => { setGenderFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">{t('genderFilters.all')}</MenuItem>
              <MenuItem value="male">{t('genderFilters.male')}</MenuItem>
              <MenuItem value="female">{t('genderFilters.female')}</MenuItem>
              <MenuItem value="other">{t('genderFilters.other')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {patients.length === 0 ? (
        <EmptyState
          icon={<People sx={{ fontSize: 48, color: theme.palette.divider }} />}
          title={t('noPatients', 'No se encontraron pacientes')}
          message={search || genderFilter ? t('noPatientsFiltered') : t('noPatientsEmpty', 'Aún no hay pacientes registrados.')}
        />
      ) : (
        <DataTable
          columns={columns}
          data={patients}
          keyExtractor={(patient) => patient.id}
          serverSide
          total={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(newPage) => setPage(newPage)}
          onRowsPerPageChange={(newLimit) => {
            setRowsPerPage(newLimit);
            setPage(0);
          }}
        />
      )}
    </MotionDiv>
  );
}
