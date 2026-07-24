import { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  TablePagination,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Block from '@mui/icons-material/Block';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { superAdminService } from '../services/super-admin.service';

interface SuperAdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  tenant_id: string | null;
  active: boolean;
}

const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
  admin: { bg: '#dbeafe', fg: '#2563eb' },
  doctor: { bg: '#d1fae5', fg: '#059669' },
  patient: { bg: '#ede9fe', fg: '#7c3aed' },
  lab_technician: { bg: '#ffedd5', fg: '#ea580c' },
  superadmin: { bg: '#fee2e2', fg: '#dc2626' },
};

function getInitials(name: string) {
  return (name || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function SuperAdminUsersPage() {
  const { t } = useTranslation();

  const ROLES = [
    { value: '', label: t('common.all') },
    { value: 'admin', label: 'Admin' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'patient', label: t('common.patients') || 'Paciente' },
    { value: 'lab_technician', label: 'Lab' },
    { value: 'superadmin', label: 'Super Admin' },
  ];

  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters: Record<string, string | number> = {};
      if (search) filters.search = search;
      if (roleFilter) filters.role = roleFilter;
      const result = await superAdminService.listUsers({
        page: page + 1,
        limit: rowsPerPage,
        ...filters,
      });
      setUsers(result.data || []);
      setTotal(result.pagination?.total || 0);
    } catch {
      setUsers([]);
      setError(t('super_admin_users.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, roleFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleActive = async (user: SuperAdminUser) => {
    setTogglingId(user.id);
    try {
      await superAdminService.toggleUserActive(user.id, !user.active);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u)),
      );
    } catch {
      setError(t('super_admin_users.errorToggle'));
    } finally {
      setTogglingId(null);
    }
  };

  if (loading && users.length === 0) return <LoadingState message="Cargando usuarios..." />;
  if (error && users.length === 0) return <ErrorState error={new Error(error)} onRetry={load} />;

  return (
    <Box>
      <PageHeader
        title={t('super_admin_users.title')}
        subtitle={t('super_admin_users.subtitle', { count: total })}
      />

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder={t('super_admin_users.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            sx={{ flex: 1, minWidth: 200 }}
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
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>{t('super_admin_users.roleFilter')}</InputLabel>
            <Select
              value={roleFilter}
              label={t('super_admin_users.roleFilter')}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
            >
              {ROLES.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {users.length === 0 ? (
        <EmptyState title={t('super_admin_users.emptyTitle')} message={search ? t('super_admin_users.emptySearch') : t('super_admin_users.emptyNone')} />
      ) : (
        <Paper sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('super_admin_users.colUser')}</TableCell>
                  <TableCell>{t('super_admin_users.colEmail')}</TableCell>
                  <TableCell>{t('super_admin_users.colRole')}</TableCell>
                  <TableCell>{t('super_admin_users.colClinic')}</TableCell>
                  <TableCell>{t('super_admin_users.colStatus')}</TableCell>
                  <TableCell align="right">{t('super_admin_users.colActions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => {
                  const rc = ROLE_COLORS[user.role] ?? { bg: '#ede9fe', fg: '#7c3aed' };
                  return (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              backgroundColor: rc.bg,
                              color: rc.fg,
                              fontSize: '0.8rem',
                              fontWeight: 600,
                            }}
                          >
                            {getInitials(user.name)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                            {user.name || t('super_admin_users.noName')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>{user.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={ROLES.find((r) => r.value === user.role)?.label || user.role}
                          size="small"
                          sx={{ backgroundColor: rc.bg, color: rc.fg, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                          {user.tenant_id || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.active !== false ? t('super_admin_users.active') : t('super_admin_users.inactive')}
                          size="small"
                          sx={{
                            backgroundColor: user.active !== false ? '#ecfdf5' : '#fef2f2',
                            color: user.active !== false ? '#059669' : '#dc2626',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleToggleActive(user)}
                          disabled={togglingId === user.id}
                          title={user.active !== false ? t('super_admin_users.deactivate') : t('super_admin_users.reactivate')}
                          sx={{ color: user.active !== false ? '#ef4444' : '#059669' }}
                        >
                          {user.active !== false
                            ? <Block fontSize="small" />
                            : <CheckCircle fontSize="small" />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage={t('super_admin_users.rowsPerPage')}
          />
        </Paper>
      )}
    </Box>
  );
}
