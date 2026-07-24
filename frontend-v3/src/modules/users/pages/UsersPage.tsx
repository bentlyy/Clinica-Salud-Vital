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
import { useTheme } from '@mui/material/styles';
import Add from '@mui/icons-material/Add';
import Search from '@mui/icons-material/Search';
import Edit from '@mui/icons-material/Edit';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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

const ROLE_FILTER_OPTIONS: Array<{ value: UserRole | ''; labelKey: string }> = [
  { value: '', labelKey: 'roleLabels.all' },
  { value: 'admin', labelKey: 'roleLabels.admin' },
  { value: 'doctor', labelKey: 'roleLabels.doctor' },
  { value: 'lab_technician', labelKey: 'roleLabels.lab_technician' },
  { value: 'patient', labelKey: 'roleLabels.patient' },
  { value: 'user', labelKey: 'roleLabels.user' },
];

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export default function UsersPage() {
  const theme = useTheme();
  const { t } = useTranslation('users');
  const { t: tc } = useTranslation('common');
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

  const handleSearchChange = (value: string) => {
    setSearch(value);
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

  if (isLoading) return <LoadingState message={t('loading')} />;
  if (error) return <ErrorState error={error as Error} onRetry={refetch} />;

  return (
    <Box component={motion.div} {...pageVariants}>
      <PageHeader
        title={t('page_title')}
        subtitle={t('total_users', { count: total })}
        action={
          canEdit ? (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreateDialog}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.custom.brand.darker} 100%)`,
                },
              }}
            >
              {t('newUser')}
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
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <TextField
          size="small"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          sx={{ minWidth: { md: 280 } }}
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

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {ROLE_FILTER_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={t(opt.labelKey)}
              onClick={() => { setRoleFilter(opt.value as UserRole | ''); setPage(0); }}
              variant={roleFilter === opt.value ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 500,
                borderRadius: '8px',
                ...(roleFilter === opt.value
                  ? {
                      backgroundColor: theme.palette.primary.main,
                      color: theme.palette.background.paper,
                      '&:hover': { backgroundColor: theme.palette.primary.dark },
                    }
                  : {
                      borderColor: theme.palette.divider,
                      color: theme.palette.text.primary,
                      '&:hover': { borderColor: theme.palette.primary.main, color: theme.palette.primary.main },
                    }),
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* Table */}
      {users.length === 0 ? (
        <EmptyState
          title={t('noUsers')}
          message={t('try_adjusting_filters')}
          action={canEdit ? { label: t('newUser'), onClick: openCreateDialog } : undefined}
        />
      ) : (
        <Paper sx={{ border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('username')}</TableCell>
                  <TableCell>{tc('email')}</TableCell>
                  <TableCell>{t('role')}</TableCell>
                  <TableCell align="center">{t('status')}</TableCell>
                  <TableCell align="right">{tc('actions')}</TableCell>
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
                          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                            {user.name}
                          </Typography>
                          {user.phone && (
                            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                              {user.phone}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
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
                        <Tooltip title={tc('edit')}>
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(user)}
                            sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.primary.main } }}
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
            labelRowsPerPage={tc('rowsPerPage')}
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} ${tc('of')} ${count !== -1 ? count : `${tc('moreThan')} ${to}`}`
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
        PaperProps={{ sx: { borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, maxWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {confirmToggle?.is_active ? t('deactivate_user') : t('activate_user')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {t('confirm_toggle', {
              action: confirmToggle?.is_active ? t('deactivate').toLowerCase() : t('activate').toLowerCase(),
              name: confirmToggle?.name,
            })}
            {confirmToggle?.is_active && (
              <br />
            )}
            {confirmToggle?.is_active && (
              <span style={{ color: theme.palette.error.dark }}>
                {t('deactivate_warning')}
              </span>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmToggle(null)} variant="outlined" disabled={toggleActive.isPending}>
            {tc('cancel')}
          </Button>
          <Button
            onClick={handleToggleActive}
            variant="contained"
            disabled={toggleActive.isPending}
            sx={{
              backgroundColor: confirmToggle?.is_active ? theme.palette.error.dark : theme.palette.primary.main,
              '&:hover': {
                backgroundColor: confirmToggle?.is_active ? theme.palette.error.dark : theme.palette.primary.dark,
              },
            }}
          >
            {toggleActive.isPending
              ? t('processing')
              : confirmToggle?.is_active
                ? t('deactivate')
                : t('activate')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
