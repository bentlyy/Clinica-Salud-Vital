import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  TablePagination,
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
import { formatDate } from '@/shared/utils/localeUtils';
import { usePatientList } from '../hooks/usePatients';

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
        <Paper sx={{ borderRadius: '14px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('name')}</TableCell>
                  <TableCell>{t('emailLabel')}</TableCell>
                  <TableCell>{t('phoneLabel')}</TableCell>
                  <TableCell>{t('gender')}</TableCell>
                  <TableCell>{t('statusLabel')}</TableCell>
                  <TableCell>{t('colDate', 'Registro')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id} hover>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {patient.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {patient.phone || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {patient.gender === 'male'
                          ? t('genderFilters.male')
                          : patient.gender === 'female'
                          ? t('genderFilters.female')
                          : patient.gender || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={patient.is_active ? t('active') : t('inactive')}
                        size="small"
                        sx={{
                          backgroundColor: patient.is_active ? theme.palette.custom.status.success.bg : theme.palette.custom.status.error.bg,
                          color: patient.is_active ? theme.palette.custom.status.success.text : theme.palette.custom.status.error.text,
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {formatDate(patient.created_at)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage={t('rows_per_page', 'Filas por página')}
          />
        </Paper>
      )}
    </MotionDiv>
  );
}
