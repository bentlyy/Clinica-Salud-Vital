import { useState } from 'react';
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
import Search from '@mui/icons-material/Search';
import People from '@mui/icons-material/People';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { usePatientList } from '../hooks/usePatients';

export default function PatientsPage() {
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

  if (isLoading) return <LoadingState message="Cargando pacientes..." />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title="Pacientes"
        subtitle={`${total} pacientes registrados`}
      />

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Buscar por nombre, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ flex: 1, minWidth: 250 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#9ca3af', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Género</InputLabel>
            <Select
              value={genderFilter}
              label="Género"
              onChange={(e) => { setGenderFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="male">Masculino</MenuItem>
              <MenuItem value="female">Femenino</MenuItem>
              <MenuItem value="other">Otro</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {patients.length === 0 ? (
        <EmptyState
          icon={<People sx={{ fontSize: 48, color: '#d1d5db' }} />}
          title="No se encontraron pacientes"
          message={search || genderFilter ? 'Intenta con otros filtros de búsqueda.' : 'Aún no hay pacientes registrados.'}
        />
      ) : (
        <Paper sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Paciente</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>Género</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Registro</TableCell>
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
                            backgroundColor: '#0d9488',
                            fontSize: '0.8rem',
                          }}
                        >
                          {patient.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                          {patient.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {patient.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {patient.phone || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {patient.gender === 'male'
                          ? 'Masculino'
                          : patient.gender === 'female'
                          ? 'Femenino'
                          : patient.gender || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={patient.is_active ? 'Activo' : 'Inactivo'}
                        size="small"
                        sx={{
                          backgroundColor: patient.is_active ? '#ecfdf5' : '#fef2f2',
                          color: patient.is_active ? '#059669' : '#dc2626',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {new Date(patient.created_at).toLocaleDateString('es-CL')}
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
            labelRowsPerPage="Filas por página"
          />
        </Paper>
      )}
    </MotionDiv>
  );
}
