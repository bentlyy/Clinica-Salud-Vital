import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  Button,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
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
import { DataTable, type DataTableColumn } from '@/shared/components/ui/DataTable';
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

function getDoctorColor(id: number, fallbackColor: string): string {
  const colors = ['#0d9488', '#2563eb', '#7c3aed', '#d97706', '#059669', '#e11d48', '#0891b2'];
  return colors[id % colors.length] ?? fallbackColor;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0)?.toUpperCase() ?? '')
    .join('');
}

export default function DoctorsPage() {
  const theme = useTheme();
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

  const tableColumns: DataTableColumn<Doctor>[] = [
    {
      key: 'name',
      header: t('name'),
      render: (doctor) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              backgroundColor: getDoctorColor(doctor.id, theme.palette.text.secondary),
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
            src={doctor.avatar_url}
          >
            {getInitials(doctor.name)}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            Dr. {doctor.name}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'email',
      header: t('emailLabel'),
      render: (doctor) => (
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {doctor.email}
        </Typography>
      ),
    },
    {
      key: 'specialty',
      header: t('specialtyLabel'),
      render: (doctor) =>
        doctor.specialty ? (
          <Chip
            label={doctor.specialty}
            size="small"
            sx={{
              fontWeight: 500,
              backgroundColor: theme.palette.custom.brand.lightest,
              color: theme.palette.primary.main,
              border: `1px solid ${theme.palette.custom.brand.lighter}`,
            }}
          />
        ) : (
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            —
          </Typography>
        ),
    },
    {
      key: 'license_number',
      header: t('licenseNumber'),
      render: (doctor) => (
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {doctor.license_number ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'actions',
      header: t('actionsLabel'),
      align: 'right',
      render: (doctor) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
          {canEdit && (
            <Tooltip title={t('editDoctorLabel', { name: doctor.name })}>
              <IconButton
                size="small"
                onClick={() => openEditDialog(doctor)}
                sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.primary.main } }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t('doctorSchedule')}>
            <IconButton
              size="small"
              onClick={() => openSchedule(doctor)}
              sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.info.main } }}
            >
              <CalendarMonth fontSize="small" />
            </IconButton>
          </Tooltip>
          {canInvite && !doctor.user_id && (
            <Tooltip title={t('inviteDoctor')}>
              <IconButton
                size="small"
                onClick={() => openInviteDialog(doctor)}
                sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.warning.main } }}
              >
                <Mail fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

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
                  borderColor: theme.palette.warning.main,
                  color: theme.palette.warning.main,
                  '&:hover': {
                    borderColor: theme.palette.warning.dark,
                    backgroundColor: theme.palette.custom.status.warning.bg,
                    color: theme.palette.warning.dark,
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
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, #115e59 100%)`,
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
          border: `1px solid ${theme.palette.divider}`,
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
                  <Search sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
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
              border: `1px solid ${theme.palette.divider}`,
              px: 1.5,
              '&.Mui-selected': {
                backgroundColor: theme.palette.custom.brand.lightest,
                color: theme.palette.primary.main,
                '&:hover': { backgroundColor: theme.palette.custom.brand.lighter },
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
        <DataTable
          columns={tableColumns}
          data={doctors}
          keyExtractor={(doctor) => doctor.id}
          serverSide
          total={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(newPage) => setPage(newPage)}
          onRowsPerPageChange={(limit) => {
            setRowsPerPage(limit);
            setPage(0);
          }}
        />
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
            border: `1px solid ${theme.palette.divider}`,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <People sx={{ fontSize: 20, color: theme.palette.primary.main }} />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              <strong style={{ color: theme.palette.text.primary }}>{total}</strong> {t('totalDoctors', 'doctores en total')}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: theme.palette.grey[300] }}>|</Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
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
