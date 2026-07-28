import { useTheme } from '@mui/material/styles';
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
import { formatDateTime } from '@/shared/utils/localeUtils';

interface AuditDetailDialogProps {
  open: boolean;
  onClose: () => void;
  log: AuditLog | null;
}

export function AuditDetailDialog({ open, onClose, log }: AuditDetailDialogProps) {
  const theme = useTheme();
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
        <IconButton onClick={onClose} size="small" sx={{ color: theme.palette.text.secondary }}>
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
                backgroundColor: theme.palette.custom.brand.lightest,
                color: theme.palette.primary.main,
                fontWeight: 500,
              }}
            />
            <Chip
              label={entityLabel}
              sx={{
                backgroundColor: theme.palette.custom.status.info.bg,
                color: theme.palette.info.dark,
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
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: theme.palette.text.secondary, width: 140 }}>
                    Usuario
                  </TableCell>
                  <TableCell sx={{ color: theme.palette.text.primary }}>
                    {log.user_name || `Usuario #${log.user_id}`}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>
                    Acción
                  </TableCell>
                  <TableCell sx={{ color: theme.palette.text.primary }}>{actionLabel}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>
                    Entidad
                  </TableCell>
                  <TableCell sx={{ color: theme.palette.text.primary }}>{entityLabel}</TableCell>
                </TableRow>
                {log.entity_id && (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>
                      ID Entidad
                    </TableCell>
                    <TableCell sx={{ color: theme.palette.text.primary }}>{log.entity_id}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>
                    Dirección IP
                  </TableCell>
                  <TableCell sx={{ color: theme.palette.text.primary, fontFamily: 'monospace' }}>
                    {log.ip_address || '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>
                    Fecha/Hora
                  </TableCell>
                  <TableCell sx={{ color: theme.palette.text.primary }}>
                    {formatDateTime(log.created_at)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Details JSON */}
          {log.details && Object.keys(log.details).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', fontWeight: 600 }}>
                Detalles Adicionales
              </Typography>
              <Box
                sx={{
                  mt: 0.5,
                  p: 2,
                  backgroundColor: theme.palette.custom.surface.muted,
                  borderRadius: '8px',
                  border: `1px solid ${theme.palette.divider}`,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: theme.palette.text.primary,
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
