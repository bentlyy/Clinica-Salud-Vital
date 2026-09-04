import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  MenuItem,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Add from '@mui/icons-material/Add';
import Visibility from '@mui/icons-material/Visibility';
import Edit from '@mui/icons-material/Edit';
import Science from '@mui/icons-material/Science';
import { formatDate } from '@/shared/utils/localeUtils';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useAuth } from '@/shared/providers/AuthProvider';
import {
  useLabRequests,
  useCreateLabRequest,
} from '../hooks/useLab';
import {
  LAB_STATUS_CONFIG,
  LAB_STATUS_OPTIONS,
  LAB_PRIORITY_CONFIG,
  LAB_PRIORITY_OPTIONS,
  type LabRequestStatus,
  type LabPriority,
} from '../types/lab.types';

const createRequestSchema = z.object({
  patient_id: z.coerce.number().min(1, 'Paciente requerido'),
  priority: z.enum(['routine', 'urgent', 'emergency']).or(z.string().min(1)),
  notes: z.string().optional(),
  test_ids: z.array(z.coerce.number().min(1)).min(1, 'Selecciona al menos una prueba'),
});

type CreateRequestForm = z.infer<typeof createRequestSchema>;

function LabRequestsPageInner() {
  const { t } = useTranslation('lab_requests');
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LabRequestStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<LabPriority | 'all'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const canCreate = user && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'lab_technician' || user.role === 'doctor');

  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useLabRequests({
    page: page + 1,
    limit,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
  });

  const createMutation = useCreateLabRequest();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRequestForm>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      patient_id: 0,
      notes: '',
      priority: 'routine',
      test_ids: [],
    },
  });

  const requests = response?.data ?? [];
  const total = response?.total ?? 0;

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleCreate = (data: CreateRequestForm) => {
    createMutation.mutate(
      { ...data, priority: data.priority as LabPriority },
      {
        onSuccess: () => {
          setCreateDialogOpen(false);
          reset();
        },
      },
    );
  };

  if (isLoading) return <LoadingState message={t('loading')} />;
  if (error) return <ErrorState error={error as Error} onRetry={() => void refetch()} />;

  return (
    <Box>
      <PageHeader
        title={t('title')}
        subtitle={t('total_requests', { count: total })}
        action={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              {t('new_request')}
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: { xs: '1 1 100%', md: 1 }, minWidth: { xs: '100%', md: 250 } }}
          />
          <TextField
            select
            size="small"
            label={t('status_label')}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as LabRequestStatus | 'all');
              setPage(0);
            }}
            sx={{ minWidth: { xs: '100%', md: 140 } }}
          >
            {LAB_STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('priority_label')}
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as LabPriority | 'all');
              setPage(0);
            }}
            sx={{ minWidth: { xs: '100%', md: 140 } }}
          >
            {LAB_PRIORITY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Paper>

      {/* Table */}
      {requests.length === 0 ? (
        <EmptyState
          icon={<Science sx={{ fontSize: 48, color: theme.palette.divider }} />}
          title={t('no_requests_title')}
          message={t('no_requests_message')}
          action={
            canCreate
              ? {
                  label: t('create_request'),
                  onClick: () => setCreateDialogOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <TableContainer component={Paper} sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('col_request_number')}</TableCell>
                <TableCell>{t('col_patient')}</TableCell>
                <TableCell>{t('col_doctor')}</TableCell>
                <TableCell>{t('col_status')}</TableCell>
                <TableCell>{t('col_priority')}</TableCell>
                <TableCell>{t('col_date')}</TableCell>
                <TableCell align="right">{t('col_actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => {
                const statusCfg = LAB_STATUS_CONFIG[req.status];
                const priorityCfg = LAB_PRIORITY_CONFIG[req.priority] ?? { label: req.priority, color: '#6b7280', bgColor: '#f3f4f6' };
                return (
                  <TableRow
                    key={req.id}
                    hover
                    onClick={() => navigate(`/laboratory/requests/${req.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                        {req.request_number || `#${req.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {req.patient_name || t('patient_fallback', { id: req.patient_id })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {req.doctor_name || t('doctor_fallback', { id: req.doctor_id })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusCfg.label}
                        size="small"
                        sx={{
                          backgroundColor: statusCfg.bgColor,
                          color: statusCfg.color,
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={priorityCfg.label}
                        size="small"
                        sx={{
                          backgroundColor: priorityCfg.bgColor,
                          color: priorityCfg.color,
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {formatDate(req.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/laboratory/requests/${req.id}`);
                        }}
                        sx={{ color: theme.palette.text.secondary }}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'lab_technician') && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/laboratory/requests/${req.id}`);
                          }}
                          sx={{ color: theme.palette.primary.main }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={limit}
            labelRowsPerPage={t('rows_per_page')}
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} de ${count}`
            }
          />
        </TableContainer>
      )}

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t('dialog_title')}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="create-lab-request-form"
            onSubmit={(e) => {
              void handleSubmit(handleCreate)(e);
            }}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}
          >
            <Controller
              name="patient_id"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('patient_id_label')}
                  type="number"
                  fullWidth
                  error={!!errors.patient_id}
                  helperText={errors.patient_id?.message}
                />
              )}
            />
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label={t('priority_label')}
                  fullWidth
                >
                  {LAB_PRIORITY_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="test_ids"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('test_ids_label')}
                  placeholder={t('test_ids_placeholder')}
                  fullWidth
                  error={!!errors.test_ids}
                  helperText={errors.test_ids?.message || t('test_ids_helper')}
                  onChange={(e) => {
                    const ids = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
                    field.onChange(ids);
                  }}
                  value={Array.isArray(field.value) ? field.value.join(',') : ''}
                />
              )}
            />
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('notes_label')}
                  fullWidth
                  multiline
                  rows={3}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: theme.palette.text.secondary }}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            form="create-lab-request-form"
            variant="contained"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? t('creating') : t('create_button')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const LabRequestsPage = memo(LabRequestsPageInner);
export default LabRequestsPage;
