import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
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
  TextField,
  InputAdornment,
  TablePagination,
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
import { UserAvatar, RoleBadge, StatusBadge } from '@/modules/users/components/UserVisuals';
import { superAdminService } from '../services/super-admin.service';
import type { UserRole } from '@/shared/types/api.types';

interface SuperAdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  tenant_id: string | null;
  active: boolean;
}

export default function SuperAdminUsersPage() {
  const { t } = useTranslation('super_admin_users');
  const { t: tc } = useTranslation('common');
  const theme = useTheme();

  const ROLES = [
    { value: '', label: tc('all') },
    { value: 'admin', label: tc('common:roles.admin', 'Admin') },
    { value: 'doctor', label: tc('common:roles.doctor', 'Doctor') },
    { value: 'patient', label: tc('common:roles.patient', 'Paciente') },
    { value: 'lab_technician', label: tc('common:roles.lab_technician', 'Lab') },
    { value: 'superadmin', label: tc('common:roles.superadmin', 'Super Admin') },
  ];

  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [clinicFilter, setClinicFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const clinicNameById = new Map(clinics.map((c) => [c.id, c.name]));

  useEffect(() => {
    let active = true;
    superAdminService
      .listTenants({ page: 1, limit: 200 })
      .then((res) => {
        if (active) setClinics(res.data.map((t) => ({ id: t.id, name: t.name })));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters: Record<string, string | number> = {};
      if (search) filters.search = search;
      if (roleFilter) filters.role = roleFilter;
      if (clinicFilter) filters.tenantId = clinicFilter;
      const result = await superAdminService.listUsers({
        page: page + 1,
        limit: rowsPerPage,
        ...filters,
      });
      setUsers(result.data || []);
      setTotal(result.pagination?.total || 0);
    } catch {
      setUsers([]);
      setError(t('errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, roleFilter, clinicFilter, t]);

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
      setError(t('errorToggle'));
    } finally {
      setTogglingId(null);
    }
  };

  if (loading && users.length === 0) return <LoadingState message={t('loading')} />;
  if (error && users.length === 0) return <ErrorState error={new Error(error)} onRetry={load} />;

  return (
    <Box>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { count: total })}
      />

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            sx={{ flex: 1, minWidth: 200 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: theme.palette.grey[500], fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>{t('roleFilter')}</InputLabel>
            <Select
              value={roleFilter}
              label={t('roleFilter')}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
            >
              {ROLES.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>{t('clinicFilter')}</InputLabel>
            <Select
              value={clinicFilter}
              label={t('clinicFilter')}
              onChange={(e) => { setClinicFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">{t('allClinics')}</MenuItem>
              {clinics.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {users.length === 0 ? (
        <EmptyState title={t('emptyTitle')} message={search ? t('emptySearch') : t('emptyNone')} />
      ) : (
        <Paper sx={{ borderRadius: '14px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.06)' : '#f8fafc' }}>
                  <TableCell>{t('colUser')}</TableCell>
                  <TableCell>{t('colEmail')}</TableCell>
                  <TableCell>{t('colRole')}</TableCell>
                  <TableCell>{t('colClinic')}</TableCell>
                  <TableCell>{t('colStatus')}</TableCell>
                  <TableCell align="right">{t('colActions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => {
                  const isActive = user.active !== false;
                  return (
                    <TableRow
                      key={user.id}
                      hover
                      sx={{
                        '&:hover td': { backgroundColor: theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.04)' : '#f9fafb' },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <UserAvatar name={user.name || t('noName')} role={(user.role as UserRole) || 'user'} size={38} />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                            {user.name || t('noName')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{user.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={(user.role as UserRole) || 'user'} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                          {user.tenant_id ? (clinicNameById.get(user.tenant_id) || user.tenant_id) : t('noClinic')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge isActive={isActive} />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleToggleActive(user)}
                          disabled={togglingId === user.id}
                          title={isActive ? t('deactivate') : t('reactivate')}
                          sx={{
                            color: isActive ? theme.palette.error.main : theme.palette.success.main,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: '10px',
                            '&:hover': {
                              backgroundColor: isActive
                                ? theme.palette.error.main
                                : theme.palette.success.main,
                              color: '#fff',
                            },
                          }}
                        >
                          {isActive
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
            labelRowsPerPage={t('rowsPerPage')}
          />
        </Paper>
      )}
    </Box>
  );
}
