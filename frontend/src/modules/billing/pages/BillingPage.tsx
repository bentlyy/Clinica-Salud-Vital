import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Chip,
  IconButton,
  Button,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Add from '@mui/icons-material/Add';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Visibility from '@mui/icons-material/Visibility';
import Delete from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/shared/components/ui/DataTable';
import { BillingSummaryCards } from '../components/BillingSummaryCards';
import { InvoiceFormDialog } from '../components/InvoiceFormDialog';
import { useInvoiceList, useBillingStats, useCreateInvoice, usePayInvoice, useDeleteInvoice } from '../hooks/useBilling';
import type { Invoice, InvoiceStatus, CreateInvoiceInput } from '../types/billing.types';
import { formatDate, formatCurrency } from '@/shared/utils/localeUtils';

const STATUS_CONFIG: Record<InvoiceStatus, { labelKey: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  pending: { labelKey: 'pending', color: 'warning' },
  paid: { labelKey: 'paid', color: 'success' },
  overdue: { labelKey: 'overdue', color: 'error' },
  cancelled: { labelKey: 'cancelled', color: 'default' },
};

export default function BillingPage() {
  const theme = useTheme();
  const { t } = useTranslation('billing');
  const { t: tc } = useTranslation('common');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const { data: listData, isLoading: listLoading, error: listError, refetch: refetchList } = useInvoiceList({
    page: page + 1,
    limit: rowsPerPage,
    status: statusFilter || undefined,
  });

  const { data: stats, isLoading: statsLoading } = useBillingStats();
  const createInvoice = useCreateInvoice();
  const payInvoice = usePayInvoice();
  const deleteInvoice = useDeleteInvoice();

  const invoices = listData?.data ?? [];
  const total = listData?.total ?? 0;

  const handleCreateInvoice = (input: CreateInvoiceInput) => {
    createInvoice.mutate(input, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  const handlePayInvoice = (id: number) => {
    payInvoice.mutate(id);
  };

  const handleDeleteInvoice = (id: number) => {
    setDeleteTarget(id);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget != null) {
      deleteInvoice.mutate(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const columns = useMemo<DataTableColumn<Invoice>[]>(
    () => [
      {
        key: 'invoice_number',
        header: t('invoiceNumber'),
        render: (invoice) => <Box component="span" sx={{ fontWeight: 600 }}>{invoice.invoice_number}</Box>,
      },
      {
        key: 'patient',
        header: t('patient'),
        render: (invoice) => invoice.patient_name || t('patient_id', { id: invoice.patient_id }),
      },
      {
        key: 'amount',
        header: t('amount'),
        render: (invoice) => <Box component="span" sx={{ fontWeight: 600 }}>{formatCurrency(invoice.total_amount)}</Box>,
      },
      {
        key: 'status',
        header: t('status'),
        render: (invoice) => (
          <Chip
            label={t(`statusLabels.${STATUS_CONFIG[invoice.status]?.labelKey || invoice.status}`)}
            color={STATUS_CONFIG[invoice.status]?.color || 'default'}
            size="small"
          />
        ),
      },
      {
        key: 'due_date',
        header: t('dueDate'),
        render: (invoice) => formatDate(invoice.due_date),
      },
      {
        key: 'actions',
        header: tc('actions'),
        align: 'right',
        render: (invoice) => (
          <>
            <Tooltip title={t('view_detail')}>
              <IconButton size="small" sx={{ color: theme.palette.text.secondary }}>
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
            {invoice.status === 'pending' && (
              <Tooltip title={t('markAsPaid')}>
                <IconButton
                  size="small"
                  sx={{ color: theme.palette.primary.main }}
                  onClick={() => handlePayInvoice(invoice.id)}
                >
                  <CheckCircle fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={tc('delete')}>
              <IconButton
                size="small"
                sx={{ color: theme.palette.error.main }}
                onClick={() => handleDeleteInvoice(invoice.id)}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ),
      },
    ],
    [t, tc, theme],
  );

  if (listError) {
    return <ErrorState error={listError as Error} onRetry={refetchList} />;
  }

  return (
    <Box>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
          >
            {t('newInvoice')}
          </Button>
        }
      />

      <BillingSummaryCards stats={stats} isLoading={statsLoading} />

      {/* Status Filter Chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Chip
          label={tc('all')}
          onClick={() => setStatusFilter('')}
          variant={statusFilter === '' ? 'filled' : 'outlined'}
          sx={{
            backgroundColor: statusFilter === '' ? theme.palette.primary.main : 'transparent',
            color: statusFilter === '' ? theme.palette.background.paper : theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: statusFilter === '' ? theme.palette.primary.dark : theme.palette.custom.surface.sunken,
            },
          }}
        />
        {(Object.entries(STATUS_CONFIG) as [InvoiceStatus, typeof STATUS_CONFIG[InvoiceStatus]][]).map(([key, config]) => (
          <Chip
            key={key}
            label={t(`statusLabels.${config.labelKey}`)}
            onClick={() => setStatusFilter(key)}
            variant={statusFilter === key ? 'filled' : 'outlined'}
            color={config.color}
            sx={{
              '&.MuiChip-filled': {
                color: theme.palette.background.paper,
              },
            }}
          />
        ))}
      </Box>

      {/* Table */}
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {listLoading ? (
          <Paper sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', overflow: 'hidden' }}>
            <LoadingState message={t('loading_invoices')} />
          </Paper>
        ) : invoices.length === 0 ? (
          <Paper sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', overflow: 'hidden' }}>
            <EmptyState title={t('noInvoices')} message={t('create_first_invoice')} />
          </Paper>
        ) : (
          <DataTable
            columns={columns}
            data={invoices}
            keyExtractor={(invoice) => invoice.id}
            serverSide
            total={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(newPage) => setPage(newPage)}
            onRowsPerPageChange={(newLimit) => {
              setRowsPerPage(newLimit);
              setPage(0);
            }}
          />
        )}
      </MotionDiv>

      {/* Create Invoice Dialog */}
      <InvoiceFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreateInvoice}
        isLoading={createInvoice.isPending}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t('confirm_delete')}
        message={t('confirm_delete_message', { defaultValue: '¿Deseas eliminar esta factura? Esta acción no se puede deshacer.' })}
        confirmLabel={tc('delete')}
        loading={deleteInvoice.isPending}
      />
    </Box>
  );
}
