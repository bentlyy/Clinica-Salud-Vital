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
  TablePagination,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  MenuItem,
  Button,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Security from '@mui/icons-material/Security';
import Visibility from '@mui/icons-material/Visibility';
import Download from '@mui/icons-material/Download';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useAuditList } from '../hooks/useAudit';
import { AuditDetailDialog } from '../components/AuditDetailDialog';
import { MotionDiv } from '@/shared/utils/animations';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_OPTIONS,
  type AuditLog,
} from '../types/audit.types';

export default function AuditPage() {
  const [page, setPage] = useState(0);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useAuditList({
    page: page + 1,
    limit,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    entity_type: entityFilter !== 'all' ? entityFilter : undefined,
  });

  const logs = response?.data ?? [];
  const total = response?.total ?? 0;

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const handleExport = () => {
    const headers = ['Fecha', 'Usuario', 'Acción', 'Entidad', 'ID Entidad', 'IP'];
    const rows = logs.map((log) => [
      new Date(log.created_at).toLocaleString('es-CL'),
      log.user_name || `Usuario #${log.user_id}`,
      AUDIT_ACTION_LABELS[log.action] || log.action,
      AUDIT_ENTITY_LABELS[log.entity_type] || log.entity_type,
      log.entity_id?.toString() ?? '',
      log.ip_address ?? '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <LoadingState message="Cargando registros de auditoría..." />;
  if (error) return <ErrorState error={error as Error} onRetry={() => void refetch()} />;

  return (
    <Box>
      <PageHeader
        title="Auditoría"
        subtitle="Registro de actividades y acciones del sistema"
        action={
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={logs.length === 0}
          >
            Exportar CSV
          </Button>
        }
      />

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, border: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Buscar en auditoría..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: '#9ca3af' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 250 }}
          />
          <TextField
            select
            size="small"
            label="Acción"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 140 }}
          >
            {AUDIT_ACTION_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Entidad"
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 140 }}
          >
            {AUDIT_ENTITY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Paper>

      {/* Table */}
      {logs.length === 0 ? (
        <EmptyState
          icon={<Security sx={{ fontSize: 48, color: '#d1d5db' }} />}
          title="No hay registros de auditoría"
          message="No se encontraron registros con los filtros seleccionados."
        />
      ) : (
        <TableContainer component={Paper} sx={{ border: '1px solid #e5e7eb' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Entidad</TableCell>
                <TableCell>Detalles</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => {
                const actionLabel = AUDIT_ACTION_LABELS[log.action] || log.action;
                const entityLabel = AUDIT_ENTITY_LABELS[log.entity_type] || log.entity_type;
                return (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: '#f0fdfa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Security sx={{ fontSize: 16, color: '#0d9488' }} />
                        </Box>
                        <Box>
                          <Box component="span" sx={{ fontWeight: 500, color: '#1f2937', fontSize: '0.875rem' }}>
                            {log.user_name || `Usuario #${log.user_id}`}
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={actionLabel}
                        size="small"
                        sx={{
                          backgroundColor: '#f0fdfa',
                          color: '#0d9488',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entityLabel}
                        size="small"
                        sx={{
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box component="span" sx={{ color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontSize: '0.875rem' }}>
                        {log.entity_id ? `ID: ${log.entity_id}` : '—'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box component="span" sx={{ color: '#6b7280', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {log.ip_address || '—'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box component="span" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        {new Date(log.created_at).toLocaleString('es-CL')}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <MotionDiv whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetail(log)}
                          sx={{ color: '#0d9488' }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </MotionDiv>
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
            labelRowsPerPage="Filas:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} de ${count}`
            }
          />
        </TableContainer>
      )}

      {/* Detail Dialog */}
      <AuditDetailDialog
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedLog(null);
        }}
        log={selectedLog}
      />
    </Box>
  );
}
