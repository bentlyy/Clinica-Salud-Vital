import { memo, useMemo, useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Skeleton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { PriorityChip } from '../shared/PriorityChip';
import type { LabRequest, LabRequestStatus } from '../../types/lab.types';
import {
  LAB_STATUS_LABELS,
  LAB_STATUS_COLORS,
} from '../../types/lab.types';

interface KanbanBoardProps {
  requests?: LabRequest[];
  onSelectRequest: (id: number) => void;
  onStatusChange?: (requestId: number, newStatus: LabRequestStatus) => void;
  onCancelRequest?: (requestId: number) => void;
  isLoading?: boolean;
  statuses?: LabRequestStatus[];
}

const DEFAULT_STATUSES: LabRequestStatus[] = [
  'pending',
  'received',
  'processing',
  'result_entered',
  'validated_tech',
  'validated_doctor',
  'delivered',
];

function calcTimeElapsed(requestedAt: string): string {
  try {
    const now = new Date();
    const requested = new Date(requestedAt);
    const diffMs = now.getTime() - requested.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '<1m';
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ${diffMin % 60}m`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d ${diffH % 24}h`;
  } catch {
    return '—';
  }
}

function KanbanBoardBase({
  requests = [],
  onSelectRequest,
  onStatusChange,
  onCancelRequest,
  isLoading,
  statuses = DEFAULT_STATUSES,
}: KanbanBoardProps) {
  const theme = useTheme();

  // ── Context Menu ──────────────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<{
    anchorEl: HTMLElement | null;
    request: LabRequest | null;
  }>({ anchorEl: null, request: null });

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, request: LabRequest) => {
      e.preventDefault();
      e.stopPropagation();
      setCtxMenu({ anchorEl: e.currentTarget, request });
    },
    [],
  );

  const handleCloseCtx = useCallback(() => {
    setCtxMenu({ anchorEl: null, request: null });
  }, []);

  const handleCtxAction = useCallback(
    (action: () => void) => {
      action();
      handleCloseCtx();
    },
    [handleCloseCtx],
  );

  const nextStatuses = useMemo(() => {
    const flow: Partial<Record<LabRequestStatus, LabRequestStatus[]>> = {
      pending: ['received', 'cancelled'],
      received: ['processing', 'cancelled'],
      processing: ['result_entered', 'cancelled'],
      result_entered: ['validated_tech', 'cancelled'],
      validated_tech: ['validated_doctor', 'cancelled'],
      validated_doctor: ['delivered', 'cancelled'],
    };
    return flow;
  }, []);

  const grouped = useMemo(() => {
    return statuses.map((status) => ({
      status,
      label: LAB_STATUS_LABELS[status] ?? status,
      color: LAB_STATUS_COLORS[status] ?? '#6b7280',
      items: requests.filter((r) => r.status === status),
    }));
  }, [requests, statuses]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
        {statuses.map((status) => (
          <Box
            key={status}
            sx={{
              minWidth: 260,
              flex: '0 0 260px',
            }}
          >
            <Skeleton
              variant="rounded"
              height={48}
              sx={{ mb: 1, borderRadius: '12px' }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  height={100}
                  sx={{ borderRadius: '10px' }}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <>
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
      {grouped.map((column) => (
        <Box
          key={column.status}
          sx={{
            minWidth: 260,
            flex: '0 0 260px',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '14px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}
        >
          {/* Column header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.5,
              py: 1,
              backgroundColor: `${column.color}12`,
              borderBottom: `2px solid ${column.color}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: column.color,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: '#1f2937',
                  fontSize: '0.8125rem',
                }}
              >
                {column.label}
              </Typography>
            </Box>
            <Chip
              label={column.items.length}
              size="small"
              sx={{
                height: 20,
                minWidth: 24,
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: column.color,
                color: '#ffffff',
              }}
            />
          </Box>

          {/* Column body — scrollable card list */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 280px)',
              px: 1,
              py: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#d1d5db',
                borderRadius: 2,
              },
            }}
          >
            {column.items.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 4,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: '#9ca3af', fontStyle: 'italic' }}
                >
                  Sin elementos
                </Typography>
              </Box>
            ) : (
              column.items.map((request) => {
                const isUrgent =
                  request.priority === 'urgent' || request.priority === 'emergency';
                const elapsed = calcTimeElapsed(request.requested_at);

                return (
                  <Paper
                    key={request.id}
                    elevation={0}
                    onClick={() => onSelectRequest(request.id)}
                    onContextMenu={(e) => handleContextMenu(e, request)}
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      borderLeft: isUrgent
                        ? `3px solid ${
                            request.priority === 'emergency'
                              ? theme.palette.error.main
                              : theme.palette.warning.main
                          }`
                        : '3px solid transparent',
                      '&:hover': {
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        borderColor: alpha(column.color, 0.4),
                      },
                    }}
                  >
                    {/* Patient name */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: '#1f2937',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mb: 0.5,
                      }}
                    >
                      {request.patient_name ?? 'Sin nombre'}
                    </Typography>

                    {/* Request number + items count */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 0.75,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#0d9488', fontWeight: 500 }}>
                        {request.request_number || `#${request.id}`}
                      </Typography>
                      {request.items && request.items.length > 0 && (
                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                          {request.items.length} test{request.items.length !== 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Box>

                    {/* Priority + time */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                      }}
                    >
                      <PriorityChip priority={request.priority} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <AccessTimeIcon sx={{ fontSize: 12, color: '#9ca3af' }} />
                        <Typography
                          variant="caption"
                          sx={{ color: '#9ca3af', fontSize: '0.65rem' }}
                        >
                          {elapsed}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                );
              })
            )}
          </Box>
        </Box>
      ))}
    </Box>

    {/* Context Menu */}
    <Menu
      anchorEl={ctxMenu.anchorEl}
      open={Boolean(ctxMenu.anchorEl)}
      onClose={handleCloseCtx}
      slotProps={{
        paper: {
          sx: {
            mt: 1,
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
            minWidth: 200,
          },
        },
      }}
    >
      <MenuItem
        onClick={() =>
          handleCtxAction(() => ctxMenu.request && onSelectRequest(ctxMenu.request.id))
        }
      >
        <ListItemIcon>
          <VisibilityIcon fontSize="small" sx={{ color: '#0d9488' }} />
        </ListItemIcon>
        <ListItemText
          primary="Ver detalle"
          primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
        />
      </MenuItem>

      {ctxMenu.request &&
        onStatusChange &&
        nextStatuses[ctxMenu.request.status]?.map((targetStatus) => (
          <MenuItem
            key={targetStatus}
            onClick={() =>
              handleCtxAction(() =>
                onStatusChange(ctxMenu.request!.id, targetStatus),
              )
            }
          >
            <ListItemIcon>
              <ArrowForwardIcon
                fontSize="small"
                sx={{ color: LAB_STATUS_COLORS[targetStatus] }}
              />
            </ListItemIcon>
            <ListItemText
              primary={`Mover a ${LAB_STATUS_LABELS[targetStatus]}`}
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
            />
          </MenuItem>
        ))}

      {ctxMenu.request &&
        onCancelRequest &&
        !['delivered', 'cancelled'].includes(ctxMenu.request.status) && (
          <>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              onClick={() =>
                handleCtxAction(() =>
                  onCancelRequest(ctxMenu.request!.id),
                )
              }
              sx={{ color: '#ef4444' }}
            >
              <ListItemIcon>
                <CancelIcon fontSize="small" sx={{ color: '#ef4444' }} />
              </ListItemIcon>
              <ListItemText
                primary="Cancelar solicitud"
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </MenuItem>
          </>
        )}
    </Menu>
    </>
  );
}

export const KanbanBoard = memo(KanbanBoardBase);
