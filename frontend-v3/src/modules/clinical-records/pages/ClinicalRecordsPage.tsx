import { useState, useMemo } from 'react';
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
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Add from '@mui/icons-material/Add';
import MoreVert from '@mui/icons-material/MoreVert';
import Visibility from '@mui/icons-material/Visibility';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Description from '@mui/icons-material/Description';
import Close from '@mui/icons-material/Close';
import CalendarToday from '@mui/icons-material/CalendarToday';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useAuth } from '@/shared/providers/AuthProvider';
import {
  useClinicalRecords,
  useCreateClinicalRecord,
  useUpdateClinicalRecord,
  useDeleteClinicalRecord,
} from '../hooks/useClinicalRecords';
import { ClinicalRecordFormDialog } from '../components/ClinicalRecordFormDialog';
import { VitalsDisplay } from '../components/VitalsDisplay';
import type { ClinicalRecord, CreateClinicalRecordInput } from '../types/clinical-record.types';

export default function ClinicalRecordsPage() {
  const { t } = useTranslation('clinical_records');
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('clinicalRecords', 'create');
  const canEdit = hasPermission('clinicalRecords', 'edit');
  const canDelete = hasPermission('clinicalRecords', 'delete');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ClinicalRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<ClinicalRecord | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuRecord, setMenuRecord] = useState<ClinicalRecord | null>(null);

  const params = useMemo(
    () => ({
      page: page + 1,
      limit: rowsPerPage,
      search: search || undefined,
    }),
    [page, rowsPerPage, search],
  );

  const { data, isLoading, error, refetch } = useClinicalRecords(params);
  const createMutation = useCreateClinicalRecord();
  const updateMutation = useUpdateClinicalRecord();
  const deleteMutation = useDeleteClinicalRecord();

  const records = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, record: ClinicalRecord) => {
    setAnchorEl(event.currentTarget);
    setMenuRecord(record);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuRecord(null);
  };

  const handleEdit = (record: ClinicalRecord) => {
    setEditingRecord(record);
    setFormOpen(true);
    handleMenuClose();
  };

  const handleViewDetail = (record: ClinicalRecord) => {
    setDetailRecord(record);
    handleMenuClose();
  };

  const handleDelete = (record: ClinicalRecord) => {
    if (window.confirm(t('confirm_delete_title'))) {
      deleteMutation.mutate(record.id);
    }
    handleMenuClose();
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingRecord(null);
  };

  const handleFormSave = (input: CreateClinicalRecordInput) => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, input }, { onSuccess: handleFormClose });
    } else {
      createMutation.mutate(input, { onSuccess: handleFormClose });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <LoadingState message={t('loading_records')} />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;

  return (
    <Box>
      <PageHeader
        title={t('title')}
        subtitle={t('total_label', { count: total })}
        action={
          canCreate ? (
            <Box
              component="button"
              onClick={() => { setEditingRecord(null); setFormOpen(true); }}
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
              {t('new_record')}
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
            placeholder={t('search_placeholder')}
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
      {records.length === 0 ? (
        <EmptyState
          icon={<Description sx={{ fontSize: 48, color: '#d1d5db' }} />}
          title={t('no_records_title')}
          message={t('no_records_message')}
          action={canCreate ? { label: t('create_record'), onClick: () => { setEditingRecord(null); setFormOpen(true); } } : undefined}
        />
      ) : (
        <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <TableContainer component={Paper} sx={{ border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('col_patient')}</TableCell>
                  <TableCell>{t('col_doctor')}</TableCell>
                  <TableCell>{t('col_chief_complaint')}</TableCell>
                  <TableCell>{t('col_diagnosis')}</TableCell>
                  <TableCell>{t('col_date')}</TableCell>
                  <TableCell align="right">{t('col_actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                        {record.patient_name || t('patientFallback', { id: record.patient_id })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {record.doctor_name || t('doctorFallback', { id: record.doctor_id })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {record.chief_complaint}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {record.diagnosis}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {format(new Date(record.created_at), 'dd MMM yyyy', { locale: es })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, record)} sx={{ color: '#6b7280' }}>
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
              labelRowsPerPage={t('rows_per_page')}
              labelDisplayedRows={({ from, to, count }) =>
                count !== -1
                  ? t('labelDisplayedRows', { from, to, count })
                  : t('labelDisplayedRowsMore', { to })
              }
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
        <MenuItem onClick={() => menuRecord && handleViewDetail(menuRecord)}>
          <ListItemIcon><Visibility fontSize="small" sx={{ color: '#6b7280' }} /></ListItemIcon>
          <ListItemText>{t('view_detail')}</ListItemText>
        </MenuItem>
        {canEdit && (
          <MenuItem onClick={() => menuRecord && handleEdit(menuRecord)}>
            <ListItemIcon><Edit fontSize="small" sx={{ color: '#6b7280' }} /></ListItemIcon>
            <ListItemText>{t('edit')}</ListItemText>
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={() => menuRecord && handleDelete(menuRecord)} sx={{ color: '#ef4444' }}>
            <ListItemIcon><Delete fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
            <ListItemText>{t('delete')}</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Create/Edit Dialog */}
      <ClinicalRecordFormDialog
        open={formOpen}
        onClose={handleFormClose}
        record={editingRecord}
        onSave={handleFormSave}
        isSaving={isSaving}
      />

      {/* Detail Dialog */}
      <Dialog
        open={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', border: '1px solid #e5e7eb' } }}
      >
        {detailRecord && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
                {t('record_id_label', { id: detailRecord.id })}
              </Typography>
              <IconButton onClick={() => setDetailRecord(null)} size="small" sx={{ color: '#6b7280' }}>
                <Close fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
                <DetailField label={t('field_patient')} value={detailRecord.patient_name || t('patientFallback', { id: detailRecord.patient_id })} />
                <DetailField label={t('field_doctor')} value={detailRecord.doctor_name || t('doctorFallback', { id: detailRecord.doctor_id })} />
                <DetailField
                  label={t('field_date')}
                  value={format(new Date(detailRecord.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                  icon={<CalendarToday sx={{ fontSize: 14, color: '#9ca3af' }} />}
                />
              </Box>

              <DetailSection title={t('section_chief_complaint')} content={detailRecord.chief_complaint} />
              <DetailSection title={t('section_diagnosis')} content={detailRecord.diagnosis} />
              <DetailSection title={t('section_treatment')} content={detailRecord.treatment} />

              {detailRecord.vitals && Object.keys(detailRecord.vitals).length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 1.5 }}>
                    {t('section_vitals')}
                  </Typography>
                  <VitalsDisplay vitals={detailRecord.vitals} />
                </Box>
              )}

              {detailRecord.notes && <DetailSection title={t('section_notes')} content={detailRecord.notes} />}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

function DetailField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
        {icon} {value}
      </Typography>
    </Box>
  );
}

function DetailSection({ title, content }: { title: string; content: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {content}
      </Typography>
    </Box>
  );
}
