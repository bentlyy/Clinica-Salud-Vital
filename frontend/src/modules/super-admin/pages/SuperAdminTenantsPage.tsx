import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Drawer,
  Divider,
  Avatar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import Add from '@mui/icons-material/Add';
import { formatDate } from '@/shared/utils/localeUtils';
import Search from '@mui/icons-material/Search';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import People from '@mui/icons-material/People';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import LocalHospital from '@mui/icons-material/LocalHospital';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { DataTable } from '@/shared/components/ui/DataTable';
import {
  useTenantList,
  useTenantDetail,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
} from '../hooks/useSuperAdmin';
import { TenantFormDialog } from '../components/TenantFormDialog';
import { TENANT_PLAN_CONFIG } from '../types/super-admin.types';
import type { Tenant, CreateTenantInput, UpdateTenantInput } from '../types/super-admin.types';

export default function SuperAdminTenantsPage() {
  const { t } = useTranslation('super_admin_tenants');
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Tenant | null>(null);
  const [drawerTenantId, setDrawerTenantId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useTenantList({
    page: page + 1,
    limit: rowsPerPage,
    search: search || undefined,
  });

  const { data: tenantDetail } = useTenantDetail(drawerTenantId ?? '');
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const tenants = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleCreate = (input: CreateTenantInput | UpdateTenantInput) => {
    createTenant.mutate(input as CreateTenantInput, {
      onSuccess: () => setFormOpen(false),
    });
  };

  const handleUpdate = (input: CreateTenantInput | UpdateTenantInput) => {
    if (editingTenant) {
      updateTenant.mutate(
        { id: editingTenant.id, input: input as UpdateTenantInput },
        { onSuccess: () => { setFormOpen(false); setEditingTenant(null); } },
      );
    }
  };

  const handleDelete = () => {
    if (deleteDialog) {
      deleteTenant.mutate(deleteDialog.id, {
        onSuccess: () => setDeleteDialog(null),
      });
    }
  };

  const openEditDialog = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTenant(null);
    setFormOpen(true);
  };

  if (isLoading) return <LoadingState message={t('loading')} />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title={t('title')}
        subtitle={t('total_registered', { count: total })}
        action={
          <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
            {t('new_clinic')}
          </Button>
        }
      />

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: '14px' }}>
        <TextField
          fullWidth
          size="small"
          placeholder={t('search_placeholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
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
      </Paper>

      {tenants.length === 0 ? (
        <EmptyState
          title={t('empty_title')}
          message={search ? t('empty_search') : t('empty_create')}
          action={!search ? { label: t('new_clinic'), onClick: openCreateDialog } : undefined}
        />
      ) : (
        <DataTable
          columns={[
            {
              key: 'name',
              header: t('col_name'),
              render: (tenant) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    src={tenant.logo_url}
                    sx={{
                      width: 36,
                      height: 36,
                      backgroundColor: theme.palette.primary.main,
                      fontSize: '0.8rem',
                    }}
                  >
                    {tenant.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    {tenant.name}
                  </Typography>
                </Box>
              ),
            },
            {
              key: 'slug',
              header: t('col_slug'),
              render: (tenant) => (
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: 'monospace' }}>
                  {tenant.slug}
                </Typography>
              ),
            },
            {
              key: 'plan',
              header: t('col_plan'),
              render: (tenant) => {
                const planConfig = TENANT_PLAN_CONFIG[tenant.plan] ?? TENANT_PLAN_CONFIG.free!;
                return (
                  <Chip
                    label={planConfig.label}
                    size="small"
                    sx={{
                      backgroundColor: planConfig.bgColor,
                      color: planConfig.color,
                      fontWeight: 600,
                    }}
                  />
                );
              },
            },
            {
              key: 'active',
              header: t('col_status'),
              render: (tenant) => (
                <Chip
                  label={tenant.active ? t('active') : t('inactive')}
                  size="small"
                  sx={{
                    backgroundColor: tenant.active ? theme.palette.custom.status.success.bg : theme.palette.custom.status.error.bg,
                    color: tenant.active ? theme.palette.custom.status.success.text : theme.palette.custom.status.error.text,
                    fontWeight: 600,
                  }}
                />
              ),
            },
            {
              key: 'actions',
              header: t('col_actions'),
              align: 'right',
              render: (tenant) => (
                <>
                  <IconButton size="small" onClick={() => setDrawerTenantId(tenant.id)} sx={{ color: theme.palette.text.secondary }}>
                    <Visibility fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => openEditDialog(tenant)} sx={{ color: theme.palette.text.secondary }}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => setDeleteDialog(tenant)} sx={{ color: theme.palette.error.main }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </>
              ),
            },
          ]}
          data={tenants}
          keyExtractor={(tenant) => tenant.id}
          total={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(limit) => { setRowsPerPage(limit); setPage(0); }}
          serverSide
        />
      )}

      {/* Create/Edit Dialog */}
      <TenantFormDialog
        open={formOpen}
        tenant={editingTenant}
        onClose={() => { setFormOpen(false); setEditingTenant(null); }}
        onSubmit={editingTenant ? handleUpdate : handleCreate}
        isPending={createTenant.isPending || updateTenant.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle sx={{ fontWeight: 600 }}>{t('delete_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('delete_confirm', { name: deleteDialog?.name })}<br />
            {t('delete_warning')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleteTenant.isPending}
          >
            {deleteTenant.isPending ? t('deleting') : t('delete_button')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerTenantId !== null}
        onClose={() => setDrawerTenantId(null)}
        sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 400 }, p: 3 } }}
      >
        {tenantDetail && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar
                src={tenantDetail.logo_url}
                sx={{ width: 56, height: 56, backgroundColor: theme.palette.primary.main, fontSize: '1.25rem' }}
              >
                {tenantDetail.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                  {tenantDetail.name}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  {tenantDetail.slug}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 2 }}>
              {t('details_section')}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{t('domain')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  {tenantDetail.domain || '—'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{t('plan')}</Typography>
                <Chip
                  label={(TENANT_PLAN_CONFIG[tenantDetail.plan] ?? TENANT_PLAN_CONFIG.free!).label}
                  size="small"
                  sx={{
                    backgroundColor: (TENANT_PLAN_CONFIG[tenantDetail.plan] ?? TENANT_PLAN_CONFIG.free!).bgColor,
                    color: (TENANT_PLAN_CONFIG[tenantDetail.plan] ?? TENANT_PLAN_CONFIG.free!).color,
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{t('status')}</Typography>
                <Chip
                  label={tenantDetail.active ? t('active') : t('inactive')}
                  size="small"
                  sx={{
                    backgroundColor: tenantDetail.active ? theme.palette.custom.status.success.bg : theme.palette.custom.status.error.bg,
                    color: tenantDetail.active ? theme.palette.custom.status.success.text : theme.palette.custom.status.error.text,
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{t('created')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  {formatDate(tenantDetail.created_at)}
                </Typography>
              </Box>
            </Box>

            {tenantDetail && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 2 }}>
                  {t('stats_section')}
                </Typography>
                <Grid container spacing={2}>
                  {[
                    { label: t('users'), value: tenantDetail.total_users || 0, icon: <People sx={{ fontSize: 18 }} />, color: theme.palette.info.main },
                    { label: t('patients'), value: tenantDetail.total_patients || 0, icon: <CalendarMonth sx={{ fontSize: 18 }} />, color: theme.palette.primary.main },
                    { label: t('doctors'), value: tenantDetail.total_doctors || 0, icon: <LocalHospital sx={{ fontSize: 18 }} />, color: theme.palette.custom.purple.main },
                    { label: t('bookings'), value: tenantDetail.total_bookings || 0, icon: <CalendarMonth sx={{ fontSize: 18 }} />, color: theme.palette.warning.main },
                  ].map((item) => (
                    <Grid item xs={6} key={item.label}>
                      <Paper
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: '10px',
                        }}
                      >
                        <Typography sx={{ color: item.color, mb: 0.5 }}>{item.icon}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                          {item.value}
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          {item.label}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Box>
        )}
      </Drawer>
    </MotionDiv>
  );
}
