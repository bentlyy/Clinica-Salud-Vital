import { useState, useMemo, useRef } from 'react';
import { Box, Button, TablePagination } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Add from '@mui/icons-material/Add';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useUserList, useRegisterDoctor, useInviteUser, useToggleUserActive } from '../hooks/useUsers';
import { UserFilters, type UserFiltersState } from '../components/UserFilters';
import { UsersStats } from '../components/UsersStats';
import { UserRow } from '../components/UserRow';
import { UserFormDialog } from '../components/UserFormDialog';
import { UserDetailDialog } from '../components/UserDetailDialog';
import type { User, CreateUserInput } from '../types/user.types';

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
  const [filters, setFilters] = useState<UserFiltersState>({ search: '', role: '', status: '' });
  const [searchDebounced, setSearchDebounced] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null);

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPage(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchDebounced(value), 400);
  };

  const handleRoleChange = (role: User['role'] | '') => {
    setFilters((prev) => ({ ...prev, role }));
    setPage(0);
  };

  const handleStatusChange = (status: UserFiltersState['status']) => {
    setFilters((prev) => ({ ...prev, status }));
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({ search: '', role: '', status: '' });
    setSearchDebounced('');
    setPage(0);
  };

  const queryParams = useMemo(
    () => ({
      page: page + 1,
      limit: rowsPerPage,
      search: searchDebounced || undefined,
      role: (filters.role as User['role']) || undefined,
    }),
    [page, rowsPerPage, searchDebounced, filters.role],
  );

  const { data, isLoading, error, refetch } = useUserList(queryParams);
  const registerDoctor = useRegisterDoctor();
  const inviteUser = useInviteUser();
  const toggleActive = useToggleUserActive();

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const isCreating = registerDoctor.isPending || inviteUser.isPending;

  const filteredUsers = useMemo(() => {
    if (!filters.status) return users;
    return users.filter((u) => (filters.status === 'active' ? u.is_active : !u.is_active));
  }, [users, filters.status]);

  const handleCreateUser = (input: CreateUserInput) => {
    if (input.role === 'doctor') {
      registerDoctor.mutate(
        {
          name: input.name,
          email: input.email,
          specialty: input.specialty ?? '',
          rut: input.rut,
          phone: input.phone,
        },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      inviteUser.mutate(
        {
          name: input.name,
          email: input.email,
          role: input.role as 'patient' | 'doctor' | 'lab_technician',
        },
        { onSuccess: () => setFormOpen(false) },
      );
    }
  };

  const handleToggleActive = () => {
    if (!confirmToggle) return;
    toggleActive.mutate(confirmToggle.id, {
      onSuccess: () => setConfirmToggle(null),
    });
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
              onClick={() => setFormOpen(true)}
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

      <UserFilters
        filters={filters}
        onSearchChange={handleSearchChange}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
        onClear={handleClearFilters}
      />

      <UsersStats users={users} total={total} />

      {filteredUsers.length === 0 ? (
        <EmptyState
          title={t('noUsers')}
          message={t('try_adjusting_filters')}
          action={canEdit ? { label: t('newUser'), onClick: () => setFormOpen(true) } : undefined}
        />
      ) : (
        <Box role="list" aria-label={t('page_title')}>
          {filteredUsers.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              canView={canEdit}
              canToggle={canToggle}
              onView={(u) => setDetailUser(u)}
              onToggle={(u) => setConfirmToggle(u)}
              isToggling={toggleActive.isPending && confirmToggle?.id === user.id}
            />
          ))}

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
        </Box>
      )}

      <UserFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreateUser}
        isPending={isCreating}
      />

      <UserDetailDialog
        open={!!detailUser}
        user={detailUser}
        onClose={() => setDetailUser(null)}
      />

      <ConfirmDialog
        open={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        onConfirm={handleToggleActive}
        loading={toggleActive.isPending}
        variant={confirmToggle?.is_active ? 'danger' : 'primary'}
        title={confirmToggle?.is_active ? t('deactivate_user') : t('activate_user')}
        confirmLabel={confirmToggle?.is_active ? t('deactivate') : t('activate')}
        message={
          <>
            {t('confirm_toggle', {
              action: confirmToggle?.is_active ? t('deactivate').toLowerCase() : t('activate').toLowerCase(),
              name: confirmToggle?.name,
            })}
            {confirmToggle?.is_active && (
              <>
                <br />
                <Box component="span" sx={{ color: theme.palette.error.main, fontWeight: 500 }}>
                  {t('deactivate_warning')}
                </Box>
              </>
            )}
          </>
        }
      />
    </Box>
  );
}
