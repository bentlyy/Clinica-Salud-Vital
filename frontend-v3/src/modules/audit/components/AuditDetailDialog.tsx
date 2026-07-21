import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  IconButton,
} from '@mui/material';
import Close from '@mui/icons-material/Close';
import type { AuditLog } from '../types/audit.types';
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from '../types/audit.types';

interface AuditDetailDialogProps {
  open: boolean;
  onClose: () => void;
  log: AuditLog | null;
}

export function AuditDetailDialog({ open, onClose, log }: AuditDetailDialogProps) {
  if (!log) return null;

  const actionLabel = AUDIT_ACTION_LABELS[log.action] || log.action;
  const entityLabel = AUDIT_ENTITY_LABELS[log.entity_type] || log.entity_type;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 600,
        }}
      >
        Detalle de Auditoría
        <IconButton onClick={onClose} size="small" sx={{ color: '#6b7280' }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* Header Info */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label={actionLabel}
              sx={{
                backgroundColor: '#f0fdfa',
                color: '#0d9488',
                fontWeight: 500,
              }}
            />
            <Chip
              label={entityLabel}
              sx={{
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontWeight: 500,
              }}
            />
            {log.entity_id && (
              <Chip
                label={`ID: ${log.entity_id}`}
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
            )}
          </Box>

          {/* Detail Table */}
          <TableContainer
            sx={{
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#6b7280', width: 140 }}>
                    Usuario
                  </TableCell>
                  <TableCell sx={{ color: '#1f2937' }}>
                    {log.user_name || `Usuario #${log.user_id}`}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#6b7280' }}>
                    Acción
                  </TableCell>
                  <TableCell sx={{ color: '#1f2937' }}>{actionLabel}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#6b7280' }}>
                    Entidad
                  </TableCell>
                  <TableCell sx={{ color: '#1f2937' }}>{entityLabel}</TableCell>
                </TableRow>
                {log.entity_id && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#6b7280' }}>
                      ID Entidad
                    </TableCell>
                    <TableCell sx={{ color: '#1f2937' }}>{log.entity_id}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#6b7280' }}>
                    Dirección IP
                  </TableCell>
                  <TableCell sx={{ color: '#1f2937', fontFamily: 'monospace' }}>
                    {log.ip_address || '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#6b7280' }}>
                    Fecha/Hora
                  </TableCell>
                  <TableCell sx={{ color: '#1f2937' }}>
                    {new Date(log.created_at).toLocaleString('es-CL')}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Details JSON */}
          {log.details && Object.keys(log.details).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                Detalles Adicionales
              </Typography>
              <Box
                sx={{
                  mt: 0.5,
                  p: 2,
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: '#374151',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {JSON.stringify(log.details, null, 2)}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
