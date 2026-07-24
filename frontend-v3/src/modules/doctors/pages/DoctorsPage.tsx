import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  Button,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Search from '@mui/icons-material/Search';
import Edit from '@mui/icons-material/Edit';
import ViewList from '@mui/icons-material/ViewList';
import ViewModule from '@mui/icons-material/ViewModule';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Mail from '@mui/icons-material/Mail';
import People from '@mui/icons-material/People';
import { motion } from 'framer-motion';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useAuth } from '@/shared/providers/AuthProvider';
import {
  useDoctorList,
  useCreateDoctor,
  useUpdateDoctor,
  useInviteDoctor,
} from '../hooks/useDoctors';
import { DoctorCard } from '../components/DoctorCard';
import { DoctorFormDialog } from '../components/DoctorFormDialog';
import { InviteDoctorDialog } from '../components/InviteDoctorDialog';
import type { Doctor, CreateDoctorInput } from '../types/doctor.types';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

function getDoctorColor(id: number): string {
  const colors = ['#0d9488', '#2563eb', '#7c3aed', '#d97706', '#059669', '#e11d48', '#0891b2'];
  return colors[id % colors.length] ?? '#6b7280';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0)?.toUpperCase() ?? '')
    .join('');
}

export default function DoctorsPage() {
  const { t } = useTranslation('doctors');
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('doctors', 'create');
  const canEdit = hasPermission('doctors', 'edit');
  const canInvite = hasPermission('doctors', 'invite');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [formOpen, setFormOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitingDoctor, setInvitingDoctor] = useState<Doctor | null>(null);

  const [searchDebounced, setSearchDebounced] = useState('');
  const handleSearchChange = (value: string) => {
    setSearch(value);
    const timeoutId = setTimeout(() => setSearchDebounced(value), 400);
    return () => clearTimeout(timeoutId);
  };

  const queryParams = useMemo(
    () => ({
      page: viewMode === 'grid' ? page + 1 : page + 1,
      limit: viewMode === 'grid' ? rowsPerPage : rowsPerPage,
      search: searchDebounced || undefined,
    }),
    [page, rowsPerPage, searchDebounced, viewMode],
  );

  const { data, isLoading, error, refetch } = useDoctorList(queryParams);
  const createDoctor = useCreateDoctor();
  const updateDoctor = useUpdateDoctor();
  const inviteDoctor = useInviteDoctor();

  const doctors = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleCreateDoctor = (input: CreateDoctorInput) => {
    createDoctor.mutate(input, {
      onSuccess: () => setFormOpen(false),
    });
  };

  const handleUpdateDoctor = (input: CreateDoctorInput) => {
    if (!editingDoctor) return;
    updateDoctor.mutate(
      { id: editingDoctor.id, input },
      { onSuccess: () => { setFormOpen(false); setEditingDoctor(null); } },
    );
  };

  const handleInviteDoctor = (data: { id: number; email: string }) => {
    inviteDoctor.mutate(data, {
      onSuccess: () => { setInviteOpen(false); setInvitingDoctor(null); },
    });
  };

  const openCreateDialog = () => {
    setEditingDoctor(null);
    setFormOpen(true);
  };

  const openEditDialog = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormOpen(true);
  };

  const openInviteDialog = (doctor: Doctor) => {
    setInvitingDoctor(doctor);
    setInviteOpen(true);
  };

  const openSchedule = (doctor: Doctor) => {
    // Placeholder: navigate or open schedule dialog
    void doctor;
  };

  if (isLoading) return <LoadingState message={t('loading_doctors')} />;
  if (error) return <ErrorState error={error as Error} onRetry={refetch} />;

  return (
    <Box component={motion.div} {...pageVariants}>
      <PageHeader
        title={t('listTitle')}
        subtitle={t('resultsCount', { total })}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canInvite && (
              <Button
                variant="outlined"
                startIcon={<Mail />}
                onClick={() => {
                  // Quick invite: open form with email only
                  setEditingDoctor(null);
                  setFormOpen(true);
                }}
                sx={{
                  borderColor: '#d97706',
                  color: '#d97706',
                  '&:hover': {
                    borderColor: '#b45309',
                    backgroundColor: '#fffbeb',
                    color: '#b45309',
                  },
                }}
              >
                {t('inviteDoctor')}
              </Button>
            )}
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={openCreateDialog}
                sx={{
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                  },
                }}
              >
                {t('newDoctorButton')}
              </Button>
            )}
          </Box>
        }
      />

      {/* Filters Bar */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          border: '1px solid #e5e7eb',
        }}
      >
        <TextField
          size="small"
          placeholder={t('searchPlaceholderFull')}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          sx={{ minWidth: { md: 320 } }}
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

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => { if (value) setViewMode(value); }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              border: '1px solid #e5e7eb',
              px: 1.5,
              '&.Mui-selected': {
                backgroundColor: '#f0fdfa',
                color: '#0d9488',
                '&:hover': { backgroundColor: '#ccfbf1' },
              },
            },
          }}
        >
          <ToggleButton value="grid">
            <ViewModule fontSize="small" />
          </ToggleButton>
          <ToggleButton value="table">
            <ViewList fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* Content */}
      {doctors.length === 0 ? (
        <EmptyState
          title={t('noDoctorsTitle')}
          message={t('noDoctorsMessage')}
          action={canCreate ? { label: t('newDoctorButton'), onClick: openCreateDialog } : undefined}
        />
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 2.5,
          }}
        >
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onEdit={openEditDialog}
              onViewSchedule={openSchedule}
              onInvite={openInviteDialog}
              canEdit={canEdit}
              canInvite={canInvite}
            />
          ))}
        </Box>
      ) : (
        /* Table View */
        <Paper sx={{ border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('name')}</TableCell>
                  <TableCell>{t('emailLabel')}</TableCell>
                  <TableCell>{t('specialtyLabel')}</TableCell>
                  <TableCell>{t('licenseNumber')}</TableCell>
                  <TableCell align="right">{t('actionsLabel')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {doctors.map((doctor) => (
                  <TableRow key={doctor.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            backgroundColor: getDoctorColor(doctor.id),
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                          src={doctor.avatar_url}
                        >
                          {getInitials(doctor.name)}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                          Dr. {doctor.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#374151' }}>
                        {doctor.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {doctor.specialty ? (
                        <Chip
                          label={doctor.specialty}
                          size="small"
                          sx={{
                            fontWeight: 500,
                            backgroundColor: '#f0fdfa',
                            color: '#0d9488',
                            border: '1px solid #ccfbf1',
                          }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#374151' }}>
                        {doctor.license_number ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        {canEdit && (
                          <Tooltip title={t('editDoctorLabel', { name: doctor.name })}>
                            <IconButton
                              size="small"
                              onClick={() => openEditDialog(doctor)}
                              sx={{ color: '#6b7280', '&:hover': { color: '#0d9488' } }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={t('doctorSchedule')}>
                          <IconButton
                            size="small"
                            onClick={() => openSchedule(doctor)}
                            sx={{ color: '#6b7280', '&:hover': { color: '#2563eb' } }}
                          >
                            <CalendarMonth fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {canInvite && !doctor.user_id && (
                          <Tooltip title={t('inviteDoctor')}>
                            <IconButton
                              size="small"
                              onClick={() => openInviteDialog(doctor)}
                              sx={{ color: '#6b7280', '&:hover': { color: '#d97706' } }}
                            >
                              <Mail fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
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
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[6, 12, 24, 48]}
            labelRowsPerPage={t('rows_per_page', 'Filas por página')}
            labelDisplayedRows={({ from, to, count }) =>
              count !== -1
                ? t('labelDisplayedRows', { from, to, count })
                : t('labelDisplayedRowsMore', { to })
            }
          />
        </Paper>
      )}

      {/* Stats summary below grid */}
      {viewMode === 'grid' && doctors.length > 0 && (
        <Paper
          sx={{
            mt: 3,
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            border: '1px solid #e5e7eb',
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <People sx={{ fontSize: 20, color: '#0d9488' }} />
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              <strong style={{ color: '#1f2937' }}>{total}</strong> {t('totalDoctors', 'doctores en total')}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#d1d5db' }}>|</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            {t('page_of', { page: page + 1, total: Math.max(1, Math.ceil(total / rowsPerPage)) })}
          </Typography>
        </Paper>
      )}

      {/* Create / Edit Dialog */}
      <DoctorFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingDoctor(null); }}
        doctor={editingDoctor}
        onSubmit={editingDoctor ? handleUpdateDoctor : handleCreateDoctor}
        isPending={createDoctor.isPending || updateDoctor.isPending}
      />

      {/* Invite Dialog */}
      <InviteDoctorDialog
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); setInvitingDoctor(null); }}
        doctor={invitingDoctor}
        onSubmit={handleInviteDoctor}
        isPending={inviteDoctor.isPending}
      />
    </Box>
  );
}
