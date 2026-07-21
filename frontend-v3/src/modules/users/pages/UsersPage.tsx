import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  TablePagination,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Search from '@mui/icons-material/Search';
import Edit from '@mui/icons-material/Edit';
import { motion } from 'framer-motion';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useAuth } from '@/shared/providers/AuthProvider';
import { getRoleLabel, getRoleColor } from '@/shared/utils/role.utils';
import { useUserList, useCreateUser, useToggleUserActive } from '../hooks/useUsers';
import { UserFormDialog } from '../components/UserFormDialog';
import { UserStatusChip } from '../components/UserStatusChip';
import type { User, UserRole, CreateUserInput } from '../types/user.types';

const ROLE_FILTER_OPTIONS: Array<{ value: UserRole | ''; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'admin', label: 'Administrador' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'lab_technician', label: 'Técnico Lab' },
  { value: 'patient', label: 'Paciente' },
  { value: 'user', label: 'Usuario' },
];

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('users', 'edit');
  const canToggle = hasPermission('users', 'toggleActive');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [searchDebounced, setSearchDebounced] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null);

  // Simple debounce via timeout ref stored in state
  const handleSearchChange = (value: string) => {
    setSearch(value);
    // Inline debounce
    const timeoutId = setTimeout(() => setSearchDebounced(value), 400);
    return () => clearTimeout(timeoutId);
  };

  const queryParams = useMemo(
    () => ({
      page: page + 1,
      limit: rowsPerPage,
      search: searchDebounced || undefined,
      role: (roleFilter as UserRole) || undefined,
    }),
    [page, rowsPerPage, searchDebounced, roleFilter],
  );

  const { data, isLoading, error, refetch } = useUserList(queryParams);
  const createUser = useCreateUser();
  const toggleActive = useToggleUserActive();

  const users = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleCreateUser = (input: CreateUserInput) => {
    createUser.mutate(input, {
      onSuccess: () => setFormOpen(false),
    });
  };

  const handleUpdateUser = (input: CreateUserInput) => {
    if (!editingUser) return;
    createUser.mutate(input, {
      onSuccess: () => { setFormOpen(false); setEditingUser(null); },
    });
  };

  const handleToggleActive = () => {
    if (!confirmToggle) return;
    toggleActive.mutate(confirmToggle.id, {
      onSuccess: () => setConfirmToggle(null),
    });
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  if (isLoading) return <LoadingState message="Cargando usuarios..." />;
  if (error) return <ErrorState error={error as Error} onRetry={refetch} />;

  return (
    <Box component={motion.div} {...pageVariants}>
      <PageHeader
        title="Gestión de Usuarios"
        subtitle={`${total} usuarios registrados`}
        action={
          canEdit ? (
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
              Nuevo Usuario
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          alignItems: { md: 'center' },
          border: '1px solid #e5e7eb',
        }}
      >
        <TextField
          size="small"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          sx={{ minWidth: { md: 280 } }}
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

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {ROLE_FILTER_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              onClick={() => { setRoleFilter(opt.value as UserRole | ''); setPage(0); }}
              variant={roleFilter === opt.value ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 500,
                borderRadius: '8px',
                ...(roleFilter === opt.value
                  ? {
                      backgroundColor: '#0d9488',
                      color: '#fff',
                      '&:hover': { backgroundColor: '#0f766e' },
                    }
                  : {
                      borderColor: '#e5e7eb',
                      color: '#374151',
                      '&:hover': { borderColor: '#0d9488', color: '#0d9488' },
                    }),
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* Table */}
      {users.length === 0 ? (
        <EmptyState
          title="No se encontraron usuarios"
          message="Intenta ajustar los filtros o crea un nuevo usuario."
          action={canEdit ? { label: 'Nuevo Usuario', onClick: openCreateDialog } : undefined}
        />
      ) : (
        <Paper sx={{ border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            backgroundColor: getRoleColor(user.role),
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                          src={user.avatar_url}
                        >
                          {user.name?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                            {user.name}
                          </Typography>
                          {user.phone && (
                            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                              {user.phone}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#374151' }}>
                        {user.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(user.role)}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          backgroundColor: `${getRoleColor(user.role)}15`,
                          color: getRoleColor(user.role),
                          border: `1px solid ${getRoleColor(user.role)}30`,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {canToggle ? (
                        <UserStatusChip
                          isActive={user.is_active}
                          onClick={() => setConfirmToggle(user)}
                        />
                      ) : (
                        <UserStatusChip isActive={user.is_active} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {canEdit && (
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(user)}
                            sx={{ color: '#6b7280', '&:hover': { color: '#0d9488' } }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
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
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Filas por página"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
            }
          />
        </Paper>
      )}

      {/* Create / Edit Dialog */}
      <UserFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingUser(null); }}
        user={editingUser}
        onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
        isPending={createUser.isPending}
      />

      {/* Toggle Active Confirmation */}
      <Dialog
        open={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        PaperProps={{ sx: { borderRadius: '16px', border: '1px solid #e5e7eb', maxWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {confirmToggle?.is_active ? 'Desactivar usuario' : 'Activar usuario'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            ¿Estás seguro de que deseas {confirmToggle?.is_active ? 'desactivar' : 'activar'} al
            usuario <strong>{confirmToggle?.name}</strong>?
            {confirmToggle?.is_active && (
              <br />
            )}
            {confirmToggle?.is_active && (
              <span style={{ color: '#dc2626' }}>
                El usuario no podrá iniciar sesión mientras esté desactivado.
              </span>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmToggle(null)} variant="outlined" disabled={toggleActive.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleToggleActive}
            variant="contained"
            disabled={toggleActive.isPending}
            sx={{
              backgroundColor: confirmToggle?.is_active ? '#dc2626' : '#0d9488',
              '&:hover': {
                backgroundColor: confirmToggle?.is_active ? '#b91c1c' : '#0f766e',
              },
            }}
          >
            {toggleActive.isPending
              ? 'Procesando...'
              : confirmToggle?.is_active
                ? 'Desactivar'
                : 'Activar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
