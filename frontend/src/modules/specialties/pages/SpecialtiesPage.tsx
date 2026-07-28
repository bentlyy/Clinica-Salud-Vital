import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Search from '@mui/icons-material/Search';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import MedicalServices from '@mui/icons-material/MedicalServices';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { formatDate } from '@/shared/utils/localeUtils';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import {
  useSpecialtyList,
  useCreateSpecialty,
  useUpdateSpecialty,
  useDeleteSpecialty,
} from '../hooks/useSpecialties';
import type { Specialty } from '../types/specialty.types';

export default function SpecialtiesPage() {
  const { t } = useTranslation('specialties');
  const { t: tc } = useTranslation('common');

  const specialtySchema = z.object({
    name: z.string().min(2, t('validation_min_name')),
    description: z.string().optional(),
  });

  type SpecialtyFormData = z.infer<typeof specialtySchema>;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [deleting, setDeleting] = useState<Specialty | null>(null);

  const { data, isLoading, error, refetch } = useSpecialtyList({
    page: page + 1,
    limit: rowsPerPage,
    search: search || undefined,
  });

  const createSpecialty = useCreateSpecialty();
  const updateSpecialty = useUpdateSpecialty();
  const deleteSpecialty = useDeleteSpecialty();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SpecialtyFormData>({
    resolver: zodResolver(specialtySchema),
  });

  const specialties = data?.data ?? [];
  const total = data?.total ?? 0;

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (spec: Specialty) => {
    setEditing(spec);
    reset({ name: spec.name, description: spec.description || '' });
    setDialogOpen(true);
  };

  const onSubmit = (formData: SpecialtyFormData) => {
    if (editing) {
      updateSpecialty.mutate(
        { id: editing.id, input: formData },
        { onSuccess: () => { setDialogOpen(false); setEditing(null); } },
      );
    } else {
      createSpecialty.mutate(formData, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (deleting) {
      deleteSpecialty.mutate(deleting.id, {
        onSuccess: () => setDeleting(null),
      });
    }
  };

  if (isLoading) return <LoadingState message={t('loading')} />;
  if (error) return <ErrorState error={error as never} onRetry={refetch} />;

  return (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { total })}
        action={
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            {t('newSpecialty')}
          </Button>
        }
      />

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3, border: '1px solid #e5e7eb', borderRadius: '14px' }}>
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
                  <Search sx={{ color: '#9ca3af', fontSize: 20 }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Paper>

      {specialties.length === 0 ? (
        <EmptyState
          icon={<MedicalServices sx={{ fontSize: 48, color: '#d1d5db' }} />}
          title={t('notFound')}
          message={search ? t('tryOtherTerms') : t('createFirst')}
          action={!search ? { label: t('newSpecialty'), onClick: openCreate } : undefined}
        />
      ) : (
        <Paper sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{tc('name')}</TableCell>
                  <TableCell>{tc('description')}</TableCell>
                  <TableCell>{t('creationDate')}</TableCell>
                  <TableCell align="right">{tc('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {specialties.map((spec) => (
                  <TableRow key={spec.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            backgroundColor: '#f0fdfa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <MedicalServices sx={{ fontSize: 18, color: '#0d9488' }} />
                        </Box>
                        <Box>
                          <Box component="span" sx={{ fontWeight: 600, color: '#1f2937', fontSize: '0.875rem' }}>
                            {spec.name}
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box component="span" sx={{ color: '#6b7280', fontSize: '0.8125rem' }}>
                        {spec.description || '—'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box component="span" sx={{ color: '#6b7280', fontSize: '0.8125rem' }}>
                        {formatDate(spec.created_at)}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(spec)} sx={{ color: '#6b7280' }}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleting(spec)} sx={{ color: '#ef4444' }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {total > rowsPerPage && (
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25]}
              labelRowsPerPage={tc('rowsPerPage')}
            />
          )}
        </Paper>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '14px' } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editing ? t('editSpecialty') : t('newSpecialty')}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label={tc('name')}
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              sx={{ mb: 2.5 }}
            />
            <TextField
              fullWidth
              label={t('descriptionOptional')}
              {...register('description')}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setDialogOpen(false); setEditing(null); }} variant="outlined">
            {tc('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={createSpecialty.isPending || updateSpecialty.isPending}
          >
            {createSpecialty.isPending || updateSpecialty.isPending
              ? t('saving')
              : editing
              ? t('updating')
              : tc('create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleting} onClose={() => setDeleting(null)}>
        <DialogTitle sx={{ fontWeight: 600 }}>{t('deleteTitle')}</DialogTitle>
        <DialogContent>
            <DialogContentText>
              {(() => {
                const msg = t('confirmDeleteMessage', { name: deleting?.name ?? '' });
                const parts = msg.split(/(<strong>.*?<\/strong>)/g);
                return parts.map((part, i) => {
                  if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
                    return <strong key={i}>{part.replace(/<\/?strong>/g, '')}</strong>;
                  }
                  return <span key={i}>{part}</span>;
                });
              })()}
              <br />
              {tc('thisActionCannotBeUndone')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>{tc('cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleteSpecialty.isPending}
          >
            {deleteSpecialty.isPending ? t('deleting') : tc('delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </MotionDiv>
  );
}
