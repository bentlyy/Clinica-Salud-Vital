import { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  TablePagination,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Add from '@mui/icons-material/Add';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Visibility from '@mui/icons-material/Visibility';
import Delete from '@mui/icons-material/Delete';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { BillingSummaryCards } from '../components/BillingSummaryCards';
import { InvoiceFormDialog } from '../components/InvoiceFormDialog';
import { useInvoiceList, useBillingStats, useCreateInvoice, usePayInvoice, useDeleteInvoice } from '../hooks/useBilling';
import type { InvoiceStatus, CreateInvoiceInput } from '../types/billing.types';

const STATUS_CONFIG: Record<InvoiceStatus, { labelKey: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  pending: { labelKey: 'pending', color: 'warning' },
  paid: { labelKey: 'paid', color: 'success' },
  overdue: { labelKey: 'overdue', color: 'error' },
  cancelled: { labelKey: 'cancelled', color: 'default' },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

export default function BillingPage() {
  const theme = useTheme();
  const { t } = useTranslation('billing');
  const { t: tc } = useTranslation('common');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);

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
    if (window.confirm(t('confirm_delete'))) {
      deleteInvoice.mutate(id);
    }
  };

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
        <Paper
          sx={{ border: `1px solid ${theme.palette.divider}` }}
        >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('invoiceNumber')}</TableCell>
                <TableCell>{t('patient')}</TableCell>
                <TableCell>{t('amount')}</TableCell>
                <TableCell>{t('status')}</TableCell>
                <TableCell>{t('dueDate')}</TableCell>
                <TableCell align="right">{tc('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <LoadingState message={t('loading_invoices')} />
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      title={t('noInvoices')}
                      message={t('create_first_invoice')}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice, index) => (
                  <TableRow
                    key={invoice.id}
                    component={motion.tr}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    hover
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.patient_name || t('patient_id', { id: invoice.patient_id })}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{formatCurrency(invoice.total)}</TableCell>
                    <TableCell>
                      <Chip
                        label={t(`statusLabels.${STATUS_CONFIG[invoice.status]?.labelKey || invoice.status}`)}
                        color={STATUS_CONFIG[invoice.status]?.color || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell align="right">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage={tc('rowsPerPage')}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} ${tc('of')} ${count !== -1 ? count : `${tc('moreThan')} ${to}`}`
          }
        />
      </Paper>
      </MotionDiv>

      {/* Create Invoice Dialog */}
      <InvoiceFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreateInvoice}
        isLoading={createInvoice.isPending}
      />
    </Box>
  );
}
