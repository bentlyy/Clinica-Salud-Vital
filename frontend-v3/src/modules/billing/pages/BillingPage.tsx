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
import Add from '@mui/icons-material/Add';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Visibility from '@mui/icons-material/Visibility';
import Delete from '@mui/icons-material/Delete';
import { motion } from 'framer-motion';
import { MotionDiv } from '@/shared/utils/animations';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { BillingSummaryCards } from '../components/BillingSummaryCards';
import { InvoiceFormDialog } from '../components/InvoiceFormDialog';
import { useInvoiceList, useBillingStats, useCreateInvoice, usePayInvoice, useDeleteInvoice } from '../hooks/useBilling';
import type { InvoiceStatus, CreateInvoiceInput } from '../types/billing.types';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  pending: { label: 'Pendiente', color: 'warning' },
  paid: { label: 'Pagada', color: 'success' },
  overdue: { label: 'Vencida', color: 'error' },
  cancelled: { label: 'Cancelada', color: 'default' },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

export default function BillingPage() {
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
    if (window.confirm('¿Estás seguro de eliminar esta factura?')) {
      deleteInvoice.mutate(id);
    }
  };

  if (listError) {
    return <ErrorState error={listError as Error} onRetry={refetchList} />;
  }

  return (
    <Box>
      <PageHeader
        title="Facturación"
        subtitle="Gestiona facturas, pagos y resúmenes financieros"
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
          >
            Nueva Factura
          </Button>
        }
      />

      <BillingSummaryCards stats={stats} isLoading={statsLoading} />

      {/* Status Filter Chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Chip
          label="Todas"
          onClick={() => setStatusFilter('')}
          variant={statusFilter === '' ? 'filled' : 'outlined'}
          sx={{
            backgroundColor: statusFilter === '' ? '#0d9488' : 'transparent',
            color: statusFilter === '' ? '#fff' : '#6b7280',
            '&:hover': {
              backgroundColor: statusFilter === '' ? '#0f766e' : '#f3f4f6',
            },
          }}
        />
        {(Object.entries(STATUS_CONFIG) as [InvoiceStatus, typeof STATUS_CONFIG[InvoiceStatus]][]).map(([key, config]) => (
          <Chip
            key={key}
            label={config.label}
            onClick={() => setStatusFilter(key)}
            variant={statusFilter === key ? 'filled' : 'outlined'}
            color={config.color}
            sx={{
              '&.MuiChip-filled': {
                color: '#fff',
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
          sx={{ border: '1px solid #e5e7eb' }}
        >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nro. Factura</TableCell>
                <TableCell>Paciente</TableCell>
                <TableCell>Monto</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Fecha Vencimiento</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <LoadingState message="Cargando facturas..." />
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      title="No hay facturas"
                      message="Crea la primera factura para comenzar."
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
                    <TableCell>{invoice.patient_name || `Paciente #${invoice.patient_id}`}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{formatCurrency(invoice.total)}</TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_CONFIG[invoice.status]?.label || invoice.status}
                        color={STATUS_CONFIG[invoice.status]?.color || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" sx={{ color: '#6b7280' }}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {invoice.status === 'pending' && (
                        <Tooltip title="Marcar como pagada">
                          <IconButton
                            size="small"
                            sx={{ color: '#0d9488' }}
                            onClick={() => handlePayInvoice(invoice.id)}
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          sx={{ color: '#ef4444' }}
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
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
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
