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
  IconButton,
  Chip,
  Button,
  TextField,
  InputAdornment,
  TablePagination,
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
import {
  useTenantList,
  useTenantDetail,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
} from '../hooks/useSuperAdmin';
import { TenantFormDialog } from '../components/TenantFormDialog';
import { TENANT_PLAN_CONFIG } from '../types/super-admin.types';
import type { Tenant, CreateTenantInput } from '../types/super-admin.types';

export default function SuperAdminTenantsPage() {
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

  const handleCreate = (input: CreateTenantInput) => {
    createTenant.mutate(input, {
      onSuccess: () => setFormOpen(false),
    });
  };

  const handleUpdate = (input: CreateTenantInput) => {
    if (editingTenant) {
      updateTenant.mutate(
        { id: editingTenant.id, input },
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

  if (isLoading) return <LoadingState message="Cargando clínicas..." />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title="Gestión de Clínicas"
        subtitle={`${total} clínicas registradas`}
        action={
          <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
            Nueva Clínica
          </Button>
        }
      />

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar clínicas..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
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
      </Paper>

      {tenants.length === 0 ? (
        <EmptyState
          title="No se encontraron clínicas"
          message={search ? 'Intenta con otros términos de búsqueda.' : 'Crea tu primera clínica para comenzar.'}
          action={!search ? { label: 'Nueva Clínica', onClick: openCreateDialog } : undefined}
        />
      ) : (
        <Paper sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tenants.map((tenant) => {
                  const planConfig = TENANT_PLAN_CONFIG[tenant.plan];
                  return (
                    <TableRow key={tenant.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={tenant.logo_url}
                            sx={{
                              width: 36,
                              height: 36,
                              backgroundColor: '#0d9488',
                              fontSize: '0.8rem',
                            }}
                          >
                            {tenant.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                            {tenant.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontFamily: 'monospace' }}>
                          {tenant.slug}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={planConfig.label}
                          size="small"
                          sx={{
                            backgroundColor: planConfig.bgColor,
                            color: planConfig.color,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={tenant.active ? 'Activa' : 'Inactiva'}
                          size="small"
                          sx={{
                            backgroundColor: tenant.active ? '#ecfdf5' : '#fef2f2',
                            color: tenant.active ? '#059669' : '#dc2626',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => setDrawerTenantId(tenant.id)} sx={{ color: '#6b7280' }}>
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => openEditDialog(tenant)} sx={{ color: '#6b7280' }}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => setDeleteDialog(tenant)} sx={{ color: '#ef4444' }}>
                          <Delete fontSize="small" />
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
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage="Filas por página"
          />
        </Paper>
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
        <DialogTitle sx={{ fontWeight: 600 }}>Eliminar Clínica</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar <strong>{deleteDialog?.name}</strong>?
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleteTenant.isPending}
          >
            {deleteTenant.isPending ? 'Eliminando...' : 'Eliminar'}
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
                sx={{ width: 56, height: 56, backgroundColor: '#0d9488', fontSize: '1.25rem' }}
              >
                {tenantDetail.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  {tenantDetail.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  {tenantDetail.slug}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#6b7280', mb: 2 }}>
              DETALLES
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>Dominio</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                  {tenantDetail.domain || '—'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>Plan</Typography>
                <Chip
                  label={TENANT_PLAN_CONFIG[tenantDetail.plan].label}
                  size="small"
                  sx={{
                    backgroundColor: TENANT_PLAN_CONFIG[tenantDetail.plan].bgColor,
                    color: TENANT_PLAN_CONFIG[tenantDetail.plan].color,
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>Estado</Typography>
                <Chip
                  label={tenantDetail.active ? 'Activa' : 'Inactiva'}
                  size="small"
                  sx={{
                    backgroundColor: tenantDetail.active ? '#ecfdf5' : '#fef2f2',
                    color: tenantDetail.active ? '#059669' : '#dc2626',
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>Creada</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                  {new Date(tenantDetail.created_at).toLocaleDateString('es-CL')}
                </Typography>
              </Box>
            </Box>

            {tenantDetail && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#6b7280', mb: 2 }}>
                  ESTADÍSTICAS
                </Typography>
                <Grid container spacing={2}>
                  {[
                    { label: 'Usuarios', value: tenantDetail.total_users || 0, icon: <People sx={{ fontSize: 18 }} />, color: '#2563eb' },
                    { label: 'Pacientes', value: tenantDetail.total_patients || 0, icon: <CalendarMonth sx={{ fontSize: 18 }} />, color: '#0d9488' },
                    { label: 'Doctores', value: tenantDetail.total_doctors || 0, icon: <LocalHospital sx={{ fontSize: 18 }} />, color: '#7c3aed' },
                    { label: 'Citas', value: tenantDetail.total_bookings || 0, icon: <CalendarMonth sx={{ fontSize: 18 }} />, color: '#d97706' },
                  ].map((item) => (
                    <Grid size={{ xs: 6 }} key={item.label}>
                      <Paper
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          border: '1px solid #f3f4f6',
                          borderRadius: '10px',
                        }}
                      >
                        <Typography sx={{ color: item.color, mb: 0.5 }}>{item.icon}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
                          {item.value}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
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
