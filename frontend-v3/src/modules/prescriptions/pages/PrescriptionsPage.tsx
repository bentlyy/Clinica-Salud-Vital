import { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
  Divider,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Add from '@mui/icons-material/Add';
import MoreVert from '@mui/icons-material/MoreVert';
import Visibility from '@mui/icons-material/Visibility';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Assignment from '@mui/icons-material/Assignment';
import Close from '@mui/icons-material/Close';
import MedicationIcon from '@mui/icons-material/Medication';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useAuth } from '@/shared/providers/AuthProvider';
import {
  useAllPrescriptions,
  usePrescriptionsByRecord,
  useCreatePrescription,
  useUpdatePrescription,
  useDeletePrescription,
} from '../hooks/usePrescriptions';
import { PrescriptionFormDialog } from '../components/PrescriptionFormDialog';
import type { Prescription, Medication, CreatePrescriptionInput } from '../types/prescription.types';

export default function PrescriptionsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('prescriptions', 'create');
  const canEdit = hasPermission('prescriptions', 'edit');
  const canDelete = hasPermission('prescriptions', 'delete');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [detailPrescription, setDetailPrescription] = useState<Prescription | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPrescription, setMenuPrescription] = useState<Prescription | null>(null);

  const { data, isLoading, error, refetch } = useAllPrescriptions();
  const createMutation = useCreatePrescription();
  const updateMutation = useUpdatePrescription();
  const deleteMutation = useDeletePrescription();

  const prescriptions = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, prescription: Prescription) => {
    setAnchorEl(event.currentTarget);
    setMenuPrescription(prescription);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuPrescription(null);
  };

  const handleEdit = (prescription: Prescription) => {
    setEditingPrescription(prescription);
    setFormOpen(true);
    handleMenuClose();
  };

  const handleViewDetail = (prescription: Prescription) => {
    setDetailPrescription(prescription);
    handleMenuClose();
  };

  const handleDelete = (prescription: Prescription) => {
    if (window.confirm('¿Estás seguro de eliminar esta receta?')) {
      deleteMutation.mutate(prescription.id);
    }
    handleMenuClose();
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingPrescription(null);
  };

  const handleFormSave = (input: CreatePrescriptionInput) => {
    if (editingPrescription) {
      updateMutation.mutate({ id: editingPrescription.id, input }, { onSuccess: handleFormClose });
    } else {
      createMutation.mutate(input, { onSuccess: handleFormClose });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <LoadingState message="Cargando recetas..." />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;

  return (
    <Box>
      <PageHeader
        title="Recetas Médicas"
        subtitle={`Total: ${total} recetas`}
        action={
          canCreate ? (
            <Box
              component="button"
              onClick={() => { setEditingPrescription(null); setFormOpen(true); }}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1.2,
                borderRadius: '10px',
                backgroundColor: '#0d9488',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                '&:hover': { backgroundColor: '#0f766e' },
              }}
            >
              <Add sx={{ fontSize: 20 }} />
              Nueva Receta
            </Box>
          ) : undefined
        }
      />

      {/* Search */}
      <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Paper sx={{ p: 2, mb: 3, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por paciente, medicamento..."
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
      </MotionDiv>

      {/* Table */}
      {prescriptions.length === 0 ? (
        <EmptyState
          icon={<Assignment sx={{ fontSize: 48, color: '#d1d5db' }} />}
          title="No hay recetas"
          message="No se encontraron recetas médicas con los filtros aplicados."
          action={canCreate ? { label: 'Crear Receta', onClick: () => { setEditingPrescription(null); setFormOpen(true); } } : undefined}
        />
      ) : (
        <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <TableContainer component={Paper} sx={{ border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Paciente</TableCell>
                  <TableCell>Doctor</TableCell>
                  <TableCell>Medicamentos</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {prescriptions.map((prescription: Prescription) => (
                  <TableRow key={prescription.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                        {prescription.patient_name || `Paciente #${prescription.patient_id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {prescription.doctor_name || `Doctor #${prescription.doctor_id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 300 }}>
                        {prescription.medications.slice(0, 3).map((med: Medication, i: number) => (
                          <Chip
                            key={i}
                            label={`${med.name} ${med.dosage}`}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 22 }}
                          />
                        ))}
                        {prescription.medications.length > 3 && (
                          <Chip
                            label={`+${prescription.medications.length - 3}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 22 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {format(new Date(prescription.created_at), 'dd MMM yyyy', { locale: es })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, prescription)} sx={{ color: '#6b7280' }}>
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              labelRowsPerPage="Filas por página"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`}
            />
          </TableContainer>
        </MotionDiv>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 180, borderRadius: 2, border: '1px solid #e5e7eb' } } }}
      >
        <MenuItem onClick={() => menuPrescription && handleViewDetail(menuPrescription)}>
          <ListItemIcon><Visibility fontSize="small" sx={{ color: '#6b7280' }} /></ListItemIcon>
          <ListItemText>Ver Detalle</ListItemText>
        </MenuItem>
        {canEdit && (
          <MenuItem onClick={() => menuPrescription && handleEdit(menuPrescription)}>
            <ListItemIcon><Edit fontSize="small" sx={{ color: '#6b7280' }} /></ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={() => menuPrescription && handleDelete(menuPrescription)} sx={{ color: '#ef4444' }}>
            <ListItemIcon><Delete fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
            <ListItemText>Eliminar</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Create/Edit Dialog */}
      <PrescriptionFormDialog
        open={formOpen}
        onClose={handleFormClose}
        prescription={editingPrescription}
        onSave={handleFormSave}
        isSaving={isSaving}
      />

      {/* Detail Dialog */}
      <Dialog
        open={!!detailPrescription}
        onClose={() => setDetailPrescription(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', border: '1px solid #e5e7eb' } }}
      >
        {detailPrescription && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
                Receta #{detailPrescription.id}
              </Typography>
              <IconButton onClick={() => setDetailPrescription(null)} size="small" sx={{ color: '#6b7280' }}>
                <Close fontSize="small" />
              </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paciente</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1f2937' }}>
                    {detailPrescription.patient_name || `Paciente #${detailPrescription.patient_id}`}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1f2937' }}>
                    {format(new Date(detailPrescription.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
                Medicamentos
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                {detailPrescription.medications.map((med, i) => (
                  <Paper
                    key={i}
                    sx={{
                      p: 2,
                      border: '1px solid #f3f4f6',
                      boxShadow: 'none',
                      backgroundColor: '#f9fafb',
                      borderRadius: '10px',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <MedicationIcon sx={{ fontSize: 18, color: '#0d9488' }} />
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1f2937' }}>
                        {med.name}
                      </Typography>
                      <Chip label={med.dosage} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        <strong>Frecuencia:</strong> {med.frequency}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        <strong>Duración:</strong> {med.duration}
                      </Typography>
                    </Box>
                    {med.instructions && (
                      <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.5, fontStyle: 'italic' }}>
                        {med.instructions}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>

              {detailPrescription.notes && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 0.5 }}>
                    Notas
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {detailPrescription.notes}
                  </Typography>
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
