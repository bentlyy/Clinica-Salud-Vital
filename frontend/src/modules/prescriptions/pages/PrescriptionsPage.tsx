import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useTheme } from '@mui/material/styles';
import Search from '@mui/icons-material/Search';
import Add from '@mui/icons-material/Add';
import MoreVert from '@mui/icons-material/MoreVert';
import Visibility from '@mui/icons-material/Visibility';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import PictureAsPdf from '@mui/icons-material/PictureAsPdf';
import Assignment from '@mui/icons-material/Assignment';
import Close from '@mui/icons-material/Close';
import MedicationIcon from '@mui/icons-material/Medication';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useAuth } from '@/shared/providers/AuthProvider';
import { getDateFnsLocale } from '@/shared/utils/localeUtils';
import {
  useAllPrescriptions,
  useCreatePrescription,
  useUpdatePrescription,
  useDeletePrescription,
  useDownloadPrescriptionPdf,
} from '../hooks/usePrescriptions';
import { PrescriptionFormDialog } from '../components/PrescriptionFormDialog';
import type { Prescription, Medication, CreatePrescriptionInput } from '../types/prescription.types';

export default function PrescriptionsPage() {
  const theme = useTheme();
  const { t } = useTranslation('prescriptions');
  const { t: tc } = useTranslation('common');
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('prescriptions', 'create');
  const canEdit = hasPermission('prescriptions', 'edit');
  const canDelete = hasPermission('prescriptions', 'delete');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [dateFnsLocale, setDateFnsLocale] = useState<Locale | undefined>(undefined);

  useEffect(() => {
    getDateFnsLocale().then(setDateFnsLocale);
  }, []);
  const [detailPrescription, setDetailPrescription] = useState<Prescription | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPrescription, setMenuPrescription] = useState<Prescription | null>(null);

  const { data, isLoading, error, refetch } = useAllPrescriptions();
  const createMutation = useCreatePrescription();
  const updateMutation = useUpdatePrescription();
  const deleteMutation = useDeletePrescription();
  const downloadPdfMutation = useDownloadPrescriptionPdf();

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
    if (window.confirm(t('confirmDelete'))) {
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

  if (isLoading) return <LoadingState message={t('loading')} />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;

  return (
    <Box>
      <PageHeader
        title={t('title')}
        subtitle={t('totalSubtitle', { total })}
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
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.background.paper,
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                '&:hover': { backgroundColor: theme.palette.primary.dark },
              }}
            >
              <Add sx={{ fontSize: 20 }} />
              {t('newPrescription')}
            </Box>
          ) : undefined
        }
      />

      {/* Search */}
      <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Paper sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
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
        </Paper>
      </MotionDiv>

      {/* Table */}
      {prescriptions.length === 0 ? (
        <EmptyState
          icon={<Assignment sx={{ fontSize: 48, color: theme.palette.divider }} />}
          title={t('noPrescriptions')}
          message={t('noResultsMessage')}
          action={canCreate ? { label: t('createPrescription'), onClick: () => { setEditingPrescription(null); setFormOpen(true); } } : undefined}
        />
      ) : (
        <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <TableContainer component={Paper} sx={{ border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('patient')}</TableCell>
                  <TableCell>{t('doctor')}</TableCell>
                  <TableCell>{t('medications')}</TableCell>
                  <TableCell>{t('date')}</TableCell>
                  <TableCell align="right">{tc('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {prescriptions.map((prescription: Prescription, idx: number) => (
                  <TableRow key={prescription.id ?? idx} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                        {prescription.patient_name || t('patientFallback', { id: prescription.patient_id })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {prescription.doctor_name || t('doctorFallback', { id: prescription.doctor_id })}
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
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, whiteSpace: 'nowrap' }}>
                        {format(new Date(prescription.created_at), 'dd MMM yyyy', { locale: dateFnsLocale })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, prescription)} sx={{ color: theme.palette.text.secondary }}>
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
              labelRowsPerPage={tc('rowsPerPage')}
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} ${tc('of')} ${count !== -1 ? count : `${tc('moreThan')} ${to}`}`}
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
        slotProps={{ paper: { sx: { mt: 1, minWidth: 180, borderRadius: 2, border: `1px solid ${theme.palette.divider}` } } }}
      >
        <MenuItem onClick={() => menuPrescription && handleViewDetail(menuPrescription)}>
          <ListItemIcon><Visibility fontSize="small" sx={{ color: theme.palette.text.secondary }} /></ListItemIcon>
          <ListItemText>{t('viewDetail')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuPrescription && downloadPdfMutation.mutate(menuPrescription.id)}>
          <ListItemIcon><PictureAsPdf fontSize="small" sx={{ color: theme.palette.error.main }} /></ListItemIcon>
          <ListItemText>{t('downloadPdf')}</ListItemText>
        </MenuItem>
        {canEdit && (
          <MenuItem onClick={() => menuPrescription && handleEdit(menuPrescription)}>
            <ListItemIcon><Edit fontSize="small" sx={{ color: theme.palette.text.secondary }} /></ListItemIcon>
            <ListItemText>{tc('edit')}</ListItemText>
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={() => menuPrescription && handleDelete(menuPrescription)} sx={{ color: theme.palette.error.main }}>
            <ListItemIcon><Delete fontSize="small" sx={{ color: theme.palette.error.main }} /></ListItemIcon>
            <ListItemText>{tc('delete')}</ListItemText>
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
        PaperProps={{ sx: { borderRadius: '16px', border: `1px solid ${theme.palette.divider}` } }}
      >
        {detailPrescription && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                {t('prescriptionNumber', { id: detailPrescription.id })}
              </Typography>
              <IconButton onClick={() => setDetailPrescription(null)} size="small" sx={{ color: theme.palette.text.secondary }}>
                <Close fontSize="small" />
              </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('patient')}</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    {detailPrescription.patient_name || t('patientFallback', { id: detailPrescription.patient_id })}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('date')}</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    {format(new Date(detailPrescription.created_at), "dd 'de' MMMM 'de' yyyy", { locale: dateFnsLocale })}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
                {t('medications')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                {detailPrescription.medications.map((med, i) => (
                  <Paper
                    key={i}
                    sx={{
                      p: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      boxShadow: 'none',
                      backgroundColor: theme.palette.custom.surface.muted,
                      borderRadius: '10px',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <MedicationIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                      <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                        {med.name}
                      </Typography>
                      <Chip label={med.dosage} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        <strong>{t('frequencyLabel')}</strong> {med.frequency}
                      </Typography>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        <strong>{t('durationLabel')}</strong> {med.duration}
                      </Typography>
                    </Box>
                    {med.instructions && (
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5, fontStyle: 'italic' }}>
                        {med.instructions}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>

              {detailPrescription.notes && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 0.5 }}>
                    {t('notes')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.text.primary, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
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
